import { describe, it, expect } from 'vitest';
import { indexedContract, syncIndexerEvents } from '../indexer/src/index.js';
import { computeCommitment, PrivateWitnesses } from '../contract/src/index.js';

describe('ShadowPass Backend Indexer Service Test Suite', () => {
  it('Test 7: Indexer syncs contract events and updates event log', () => {
    const memberSecret = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const memberSalt = '1111111111111111111111111111111111111111111111111111111111111111';

    // Register member commitment
    const { index } = indexedContract.registerMemberSecret(memberSecret, memberSalt);
    
    // Sync indexer
    const eventsAfterRegister = syncIndexerEvents();
    expect(eventsAfterRegister.length).toBeGreaterThan(0);
    expect(eventsAfterRegister[0].allowlistRoot).toBe(indexedContract.getPublicLedgerState().allowlistRoot);

    // Prove membership
    const proof = indexedContract.merkleTree.getProof(index);
    const witnesses: PrivateWitnesses = {
      secretKey: memberSecret,
      blindingSalt: memberSalt,
      merklePath: proof.path,
      pathDirections: proof.directions
    };

    indexedContract.proveMembership(witnesses);

    // Sync indexer again
    const eventsAfterProof = syncIndexerEvents();
    expect(eventsAfterProof.length).toBe(2);
    expect(eventsAfterProof[1].accessGranted).toBe(true);
    expect(eventsAfterProof[1].privacyGuarantee).toContain('Zero identity');
  });
});
