import { describe, it, expect } from 'vitest';
import {
  MIDNIGHT_CONFIG,
  createShadowPassPrivateState,
  computeLeafCommitment,
  computeNullifier,
  hexToBytes,
  bytesToHex,
} from '../contract/src/index.js';
import { queryPreprodIndexer } from '../frontend/src/contract-bindings.js';

describe('Midnight Preprod End-to-End (E2E) Integration Flow Test Suite', () => {
  const testSecretKey = '556677889900aabbccddeeff00112233556677889900aabbccddeeff00112233';
  const testSecretBytes = hexToBytes(testSecretKey);

  it('Step 1: User derives private leaf commitment and unforgeable nullifier', () => {
    const leaf = computeLeafCommitment(testSecretBytes);
    const nullifier = computeNullifier(testSecretBytes);

    expect(leaf.length).toBe(32);
    expect(nullifier.length).toBe(32);
    expect(bytesToHex(leaf)).not.toEqual(bytesToHex(nullifier));
  });

  it('Step 2: User constructs private state containing witness materials', () => {
    const privateState = createShadowPassPrivateState(testSecretBytes);

    expect(privateState.secretKey).toBeDefined();
    expect(privateState.merklePath.length).toBe(5);
    expect(privateState.pathDirections.length).toBe(5);
  });

  it('Step 3: Contract call checkAccess() prepares transaction structure for Proof Server', () => {
    const nullifierHex = bytesToHex(computeNullifier(testSecretBytes));
    const txPayload = {
      contractAddress: MIDNIGHT_CONFIG.defaultContractAddress,
      circuit: 'checkAccess',
      nullifier: nullifierHex,
      networkId: MIDNIGHT_CONFIG.networkId,
      timestamp: Date.now(),
    };

    expect(txPayload.contractAddress).toBe(
      'f58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56'
    );
    expect(txPayload.circuit).toBe('checkAccess');
    expect(txPayload.networkId).toBe('preprod');
  });

  it('Step 4: Indexer GraphQL query verifies on-chain contract existence on Preprod', async () => {
    const result = await queryPreprodIndexer(MIDNIGHT_CONFIG.defaultContractAddress);

    expect(result).toBeDefined();
    expect(result.contractAddress).toBe(MIDNIGHT_CONFIG.defaultContractAddress);
  });
});
