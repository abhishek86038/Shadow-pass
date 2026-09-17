import { describe, it, expect } from 'vitest';
import { recordIndexedEvent, getIndexedEvents } from '../indexer/src/index.js';
import { PublicLedgerState, MIDNIGHT_CONFIG } from '../contract/src/index.js';

describe('ShadowPass Backend Indexer Service Test Suite (Root Tests)', () => {
  it('Test 8: Indexer records on-chain contract events and serves GraphQL query wrapper', async () => {
    const mockState: PublicLedgerState = {
      allowlistRoot: '0x1122334455667788990011223344556677889900112233445566778899001122',
      accessGranted: 1,
      issuer: '0xadmin_issuer_pk',
    };

    const recorded = recordIndexedEvent(mockState);
    expect(recorded).toBeDefined();
    expect(recorded.accessGranted).toBe(1);
    expect(recorded.networkId).toBe(MIDNIGHT_CONFIG.networkId);
    expect(recorded.privacyGuarantee).toContain('Zero identity');

    const events = getIndexedEvents();
    expect(events.length).toBeGreaterThan(0);
  });
});
