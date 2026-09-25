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
  findDeployedContract,
  deployContract,
  SecureMemoryPrivateStateProvider,
} from '../contract/src/index.js';
import { queryPreprodIndexer } from '../frontend/src/contract-bindings.js';

describe('Midnight Preprod End-to-End (E2E) Integration & Circuit Verification Test Suite', () => {
  const memberSecretKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const memberSecretBytes = hexToBytes(memberSecretKey);

  // Compute leaf and tree root
  const leaf = computeLeafCommitment(memberSecretBytes);
  const emptySibling = new Uint8Array(32);
  const merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array] = [
    emptySibling,
    emptySibling,
    emptySibling,
    emptySibling,
    emptySibling,
  ];
  const pathDirections: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false];
  const expectedRoot = computeMerkleRootFrom(leaf, merklePath, pathDirections);
  const expectedRootHex = bytesToHex(expectedRoot);

  let deployedInstance: any;

  it('Step 1: Deploy / Locate Authoritative Contract on Midnight Preprod', async () => {
    deployedInstance = await deployContract(null, {
      initialRoot: expectedRoot,
      issuerPublicKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
    });

    expect(deployedInstance).toBeDefined();
    expect(deployedInstance.contractAddress).toBeDefined();
    expect(deployedInstance.contract.ledger.allowlistRoot).toEqual(expectedRootHex);
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
    expect(result.accessGranted).toBe(1);

    const state = await deployedInstance.queryContractState();
    expect(state.accessGranted).toBe(1);
    expect(state.nullifiers.has(bytesToHex(computeNullifier(memberSecretBytes)))).toBe(true);
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
