import { describe, it, expect, beforeEach } from 'vitest';
import {
  AllowlistContract,
  computeCommitment,
  PrivateWitnesses
} from './index.js';

describe('Midnight Allowlist Compact Contract & ZK Circuit Test Suite', () => {
  let contract: AllowlistContract;
  let adminPubKey: string;

  // Member 1 credentials
  const member1Secret = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const member1Salt = '1111111111111111111111111111111111111111111111111111111111111111';

  // Member 2 credentials
  const member2Secret = 'f9e8d7c6b5a4039281726151413121110f9e8d7c6b5a40392817261514131211';
  const member2Salt = '2222222222222222222222222222222222222222222222222222222222222222';

  // Non-member credentials
  const attackerSecret = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const attackerSalt = '9999999999999999999999999999999999999999999999999999999999999999';

  beforeEach(() => {
    adminPubKey = 'admin_pubkey_11223344556677889900aabbccddeeff11223344556677889900aabb';
    contract = new AllowlistContract(adminPubKey, 8);
  });

  it('Test 1: Valid member proof generation and contract execution succeeds', () => {
    // Admin registers Member 1 commitment
    const { index: idx1 } = contract.registerMemberSecret(member1Secret, member1Salt);
    // Admin registers Member 2 commitment
    contract.registerMemberSecret(member2Secret, member2Salt);

    // Member 1 constructs ZK private witnesses
    const proof1 = contract.merkleTree.getProof(idx1);
    const witnesses: PrivateWitnesses = {
      secretKey: member1Secret,
      blindingSalt: member1Salt,
      merklePath: proof1.path,
      pathDirections: proof1.directions
    };

    // Execute ZK circuit membership proof
    const result = contract.proveMembership(witnesses);

    expect(result.success).toBe(true);
    expect(result.accessGranted).toBe(true);
    expect(result.proofVerified).toBe(true);
    expect(contract.getPublicLedgerState().accessGranted).toBe(true);
  });

  it('Test 2: Non-member proof generation/verification fails clean without access granted', () => {
    // Register Member 1 only
    contract.registerMemberSecret(member1Secret, member1Salt);

    // Attacker tries to generate proof using their non-member secret
    const fakeProof = contract.merkleTree.getProof(0); // Uses sibling path of index 0

    const attackerWitnesses: PrivateWitnesses = {
      secretKey: attackerSecret,
      blindingSalt: attackerSalt,
      merklePath: fakeProof.path,
      pathDirections: fakeProof.directions
    };

    const result = contract.proveMembership(attackerWitnesses);

    expect(result.success).toBe(false);
    expect(result.accessGranted).toBe(false);
    expect(result.proofVerified).toBe(false);
    expect(result.error).toContain('ZK Proof Verification Failed');
    expect(contract.getPublicLedgerState().accessGranted).toBe(false);
  });

  it('Test 3: Zero identity leakage assertion (Privacy Model Verification)', () => {
    // Register Member 1 and Member 2
    contract.registerMemberSecret(member1Secret, member1Salt);
    const { index: idx2 } = contract.registerMemberSecret(member2Secret, member2Salt);

    // Member 2 proves access
    const proof2 = contract.merkleTree.getProof(idx2);
    const witnesses: PrivateWitnesses = {
      secretKey: member2Secret,
      blindingSalt: member2Salt,
      merklePath: proof2.path,
      pathDirections: proof2.directions
    };

    contract.proveMembership(witnesses);

    const publicState = contract.getPublicLedgerState();
    const publicStateJSON = JSON.stringify(publicState);

    // Verify raw secrets, salts, and identity string DO NOT exist anywhere in public state
    expect(publicStateJSON).not.toContain(member2Secret);
    expect(publicStateJSON).not.toContain(member2Salt);
    expect(publicStateJSON).not.toContain('secretKey');
    expect(publicStateJSON).not.toContain('blindingSalt');
    expect(publicStateJSON).not.toContain('memberAddress');

    // Public ledger state contains ONLY root, flag, counts, and admin
    expect(publicState).toHaveProperty('allowlistRoot');
    expect(publicState).toHaveProperty('accessGranted', true);
    expect(publicState).toHaveProperty('registeredCount', 2);
    expect(publicState).toHaveProperty('adminIdentity', adminPubKey);
  });

  it('Test 4: Admin commitment registration updates allowlist Merkle root correctly', () => {
    const initialRoot = contract.getPublicLedgerState().allowlistRoot;
    
    // Register commitment
    const comm = computeCommitment(member1Secret, member1Salt);
    const { newRoot } = contract.addCommitment(comm);

    expect(newRoot).not.toBe(initialRoot);
    expect(contract.getPublicLedgerState().allowlistRoot).toBe(newRoot);
    expect(contract.getPublicLedgerState().registeredCount).toBe(1);
  });
});
