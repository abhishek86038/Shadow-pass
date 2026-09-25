import { describe, it, expect } from 'vitest';
import {
  detectMidnightWallets,
  connectDAppWallet,
  SecureMemoryPrivateStateProvider,
  queryPreprodIndexer,
  createShadowPassPrivateState,
  bytesToHex,
  hexToBytes,
  MIDNIGHT_CONFIG,
} from '../frontend/src/contract-bindings.js';

describe('Frontend DApp Connector & Secure Storage Test Suite (Root Workspace)', () => {
  const dummySecretHex = '1122334455667788990011223344556677889900112233445566778899001122';

  it('Test 5: DApp Connector handles headless environment cleanly without throwing unhandled exceptions', async () => {
    const detection = await detectMidnightWallets();
    expect(detection).toBeDefined();
    expect(Array.isArray(detection.wallets)).toBe(true);

    await expect(connectDAppWallet('1AM')).rejects.toThrow();
  });

  it('Test 6: SecureMemoryPrivateStateProvider correctly persists and restores private state in memory', async () => {
    const provider = new SecureMemoryPrivateStateProvider(MIDNIGHT_CONFIG.defaultContractAddress);
    const privateState = createShadowPassPrivateState(hexToBytes(dummySecretHex));

    await provider.setPrivateState(privateState);

    const loaded = await provider.getPrivateState();
    expect(loaded).not.toBeNull();
    expect(bytesToHex(loaded!.secretKey)).toEqual(dummySecretHex);
    expect(loaded!.pathDirections.length).toBe(5);

    await provider.clear();
    expect(await provider.getPrivateState()).toBeNull();
  });

  it('Test 7: Preprod Indexer GraphQL client handles real endpoint queries and errors properly without fake fallbacks', async () => {
    const res = await queryPreprodIndexer(MIDNIGHT_CONFIG.defaultContractAddress);
    expect(res).toBeDefined();
    expect(res.contractAddress).toBe(MIDNIGHT_CONFIG.defaultContractAddress);
    if (!res.success) {
      expect(res.error).toBeDefined();
      expect(res.ledgerState).toBeUndefined();
    } else {
      expect(res.ledgerState).toBeDefined();
    }
  });
});
