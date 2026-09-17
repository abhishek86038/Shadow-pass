import { describe, it, expect } from 'vitest';
import {
  detectMidnightWallets,
  connectDAppWallet,
  SecureStoragePrivateStateProvider,
  queryPreprodIndexer,
  createShadowPassPrivateState,
  bytesToHex,
  hexToBytes,
  MIDNIGHT_CONFIG,
} from './contract-bindings.js';

describe('Frontend DApp Connector & Secure Storage Test Suite (Frontend Workspace)', () => {
  const dummySecretHex = '1122334455667788990011223344556677889900112233445566778899001122';

  it('Test 5: DApp Connector handles headless environment cleanly without throwing unhandled exceptions', async () => {
    const detection = await detectMidnightWallets();
    expect(detection).toBeDefined();
    expect(Array.isArray(detection.wallets)).toBe(true);

    await expect(connectDAppWallet('1AM')).rejects.toThrow();
  });

  it('Test 6: SecureStoragePrivateStateProvider correctly persists and restores private state', () => {
    const mockStorage: Record<string, string> = {};
    const globalAny = globalThis as any;
    globalAny.window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
      },
    };

    const provider = new SecureStoragePrivateStateProvider(MIDNIGHT_CONFIG.defaultContractAddress);
    const privateState = createShadowPassPrivateState(hexToBytes(dummySecretHex));

    provider.savePrivateState(privateState);

    const loaded = provider.getPrivateState();
    expect(loaded).not.toBeNull();
    expect(bytesToHex(loaded!.secretKey)).toEqual(dummySecretHex);
    expect(loaded!.pathDirections.length).toBe(5);

    provider.clear();
    expect(provider.getPrivateState()).toBeNull();
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
