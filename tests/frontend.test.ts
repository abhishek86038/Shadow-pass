import { describe, it, expect } from 'vitest';
import { 
  getLedgerState, 
  submitZKMembershipProof, 
  DEMO_MEMBER_1,
  connectLaceWallet 
} from '../frontend/src/contract-bindings.js';

describe('Frontend dApp Integration & Wallet Binding Test Suite', () => {
  it('Test 5: Frontend wallet connection returns valid address structure', async () => {
    const wallet = await connectLaceWallet();
    expect(wallet.isConnected).toBe(true);
    expect(wallet.address).toBeDefined();
    expect(typeof wallet.address).toBe('string');
  });

  it('Test 6: Frontend ZK membership proof submission succeeds and updates state', async () => {
    const initialState = getLedgerState();
    expect(initialState.accessGranted).toBe(false);

    const result = await submitZKMembershipProof(DEMO_MEMBER_1.secret, DEMO_MEMBER_1.salt);
    
    expect(result.success).toBe(true);
    expect(result.accessGranted).toBe(true);
    expect(result.proofVerified).toBe(true);
    expect(result.txHash).toBeDefined();

    const updatedState = getLedgerState();
    expect(updatedState.accessGranted).toBe(true);
  });
});
