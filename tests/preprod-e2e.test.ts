import { describe, it, expect } from 'vitest';
import {
  MIDNIGHT_CONFIG,
  createShadowPassPrivateState,
  computeLeafCommitment,
  computeNullifier,
  computeMerkleRootFrom,
  hexToBytes,
  bytesToHex,
  AllowlistContract,
  AllowlistMerkleTree,
  findDeployedContract,
  deployContract,
  SecureMemoryPrivateStateProvider,
} from '../contract/src/index.js';
import { queryPreprodIndexer } from '../frontend/src/contract-bindings.js';

describe('Midnight Preprod End-to-End (E2E) Integration & Circuit Verification Test Suite', () => {
  const memberSecretKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const memberSecretBytes = hexToBytes(memberSecretKey);

  // Build real 5-depth Merkle tree with AllowlistMerkleTree
  const memberIndex = 0;
  const tree = new AllowlistMerkleTree([memberSecretBytes]);
  const expectedRootHex = tree.getRootHex();
  const witness = tree.getWitness(memberIndex);
  const merklePath = witness.merklePath;
  const pathDirections = witness.pathDirections;

  let deployedInstance: any;

  it('Step 1: Deploy / Locate Authoritative Contract on Midnight Preprod using AllowlistMerkleTree root', async () => {
    deployedInstance = await deployContract(null, {
      initialRoot: expectedRootHex,
      issuerPublicKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
    });

    expect(deployedInstance).toBeDefined();
    expect(deployedInstance.contractAddress).toBeDefined();
    const state = await deployedInstance.queryState();
    expect(state.allowlistRoot.toLowerCase()).toContain(expectedRootHex.toLowerCase().replace('0x', ''));
  });

  it('Step 2: Construct Valid Merkle Witness in Private State Provider', async () => {
    const privateState = createShadowPassPrivateState(memberSecretBytes, merklePath, pathDirections);
    const provider = new SecureMemoryPrivateStateProvider(deployedInstance.contractAddress);
    await provider.setPrivateState(privateState);

    const loaded = await provider.getPrivateState();
    expect(loaded).not.toBeNull();
    expect(bytesToHex(loaded!.secretKey)).toEqual(memberSecretKey);
    expect(loaded!.merklePath.length).toBe(5);
  });

  it('Step 3: Generate ZK Proof & Submit checkAccess() Transaction Confirmation', async () => {
    const privateState = createShadowPassPrivateState(memberSecretBytes, merklePath, pathDirections);
    const result = await deployedInstance.callTx.checkAccess(privateState);

    expect(result.txId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.nullifierHex).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.accessGranted).toBeGreaterThan(0);

    const state = await deployedInstance.queryState();
    expect(state.accessGranted).toBeGreaterThan(0);
    expect(state.nullifiers.has(`0x${bytesToHex(computeNullifier(memberSecretBytes))}`)).toBe(true);
  });

  it('Step 4: Verify Anti-Replay Protection Rejects Second Use of Same Secret', async () => {
    const privateState = createShadowPassPrivateState(memberSecretBytes, merklePath, pathDirections);

    await expect(deployedInstance.callTx.checkAccess(privateState)).rejects.toThrow(
      'this membership has already been used'
    );
  });

  it('Step 5: Verify Invalid Merkle Path / Non-Member Secret is Rejected by ZK Circuit', async () => {
    const nonMemberSecret = hexToBytes('9999999999999999999999999999999999999999999999999999999999999999');
    const invalidPrivateState = createShadowPassPrivateState(nonMemberSecret, merklePath, pathDirections);

    await expect(deployedInstance.callTx.checkAccess(invalidPrivateState)).rejects.toThrow(
      'not a member of the current allowlist'
    );
  });

  it('Step 6: Live Preprod Indexer GraphQL Endpoint Validation', async () => {
    const indexerResult = await queryPreprodIndexer(MIDNIGHT_CONFIG.defaultContractAddress);

    expect(indexerResult).toBeDefined();
    expect(indexerResult.contractAddress).toBe(MIDNIGHT_CONFIG.defaultContractAddress);
  });
});
