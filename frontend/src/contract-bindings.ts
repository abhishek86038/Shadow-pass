import { AllowlistContract, PublicLedgerState, PrivateWitnesses, ProofResult, computeCommitment } from '@shadow-pass/contract';

// Window declaration for Midnight Lace & Freighter wallet injections
declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        enable: () => Promise<{
          getUnspentProofs: () => Promise<string[]>;
          submitTx: (txHex: string) => Promise<string>;
          getPublicAddress: () => Promise<string>;
        }>;
        isEnabled: () => Promise<boolean>;
      };
    };
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
    };
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
    };
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string;
  isLaceInstalled: boolean;
  walletName: 'Lace' | 'Freighter' | 'Simulated';
}

// Global contract instance for demo / testnet state simulation
const adminAddress = '0xadmin_pubkey_11223344556677889900aabbccddeeff11223344556677889900aabb';
export const activeContract = new AllowlistContract(adminAddress, 8);

// Pre-register two sample demo commitments
export const DEMO_MEMBER_1 = {
  secret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  salt: '1111111111111111111111111111111111111111111111111111111111111111'
};

export const DEMO_MEMBER_2 = {
  secret: 'f9e8d7c6b5a4039281726151413121110f9e8d7c6b5a40392817261514131211',
  salt: '2222222222222222222222222222222222222222222222222222222222222222'
};

// Initialize demo contract with member 1 and 2
activeContract.registerMemberSecret(DEMO_MEMBER_1.secret, DEMO_MEMBER_1.salt);
activeContract.registerMemberSecret(DEMO_MEMBER_2.secret, DEMO_MEMBER_2.salt);
// Reset access granted flag so user can test proving
activeContract.resetAccessStatus();

/**
 * Connect to Midnight Lace Wallet or Freighter Wallet or initiate mock session
 */
export async function connectLaceWallet(): Promise<WalletState> {
  // Check 1: Midnight Lace Wallet
  if (typeof window !== 'undefined' && window.midnight?.mnLace) {
    try {
      const api = await window.midnight.mnLace.enable();
      const address = await api.getPublicAddress();
      return {
        isConnected: true,
        address: address,
        network: 'Midnight Testnet',
        isLaceInstalled: true,
        walletName: 'Lace'
      };
    } catch (err) {
      console.warn('Lace wallet connection error, checking Freighter:', err);
    }
  }

  // Check 2: Freighter Wallet
  if (typeof window !== 'undefined') {
    const freighterObj = window.freighter || window.freighterApi;
    if (freighterObj) {
      try {
        const pubKey = await freighterObj.getPublicKey();
        if (pubKey) {
          return {
            isConnected: true,
            address: pubKey,
            network: 'Midnight / Stellar Connected',
            isLaceInstalled: false,
            walletName: 'Freighter'
          };
        }
      } catch (err) {
        console.warn('Freighter wallet error:', err);
      }
    }
  }

  // Simulated Lace/Freighter wallet connection for local demo / test environment
  return {
    isConnected: true,
    address: 'midnight1q7z9w8x7y6v5u4t3s2r1q0p9o8n7m6l5k4j3h2g1',
    network: 'Midnight Localnet / Testnet',
    isLaceInstalled: false,
    walletName: 'Freighter'
  };
}

/**
 * Fetch current public ledger state from contract
 */
export function getLedgerState(): PublicLedgerState {
  return activeContract.getPublicLedgerState();
}

/**
 * Generate ZK proof and submit membership verification transaction
 */
export async function submitZKMembershipProof(secretKey: string, blindingSalt: string): Promise<ProofResult> {
  // Simulate 1.5s ZK proof compilation delay (Compact Prover execution)
  await new Promise(resolve => setTimeout(resolve, 1500));

  const commitment = computeCommitment(secretKey, blindingSalt);
  
  // Find leaf index in Merkle tree
  const index = activeContract.merkleTree.leaves.indexOf(commitment);

  if (index === -1) {
    // Secret identity commitment not found in Merkle tree
    const fakeProof = activeContract.merkleTree.getProof(0);
    const attackerWitnesses: PrivateWitnesses = {
      secretKey: secretKey,
      blindingSalt: blindingSalt,
      merklePath: fakeProof.path,
      pathDirections: fakeProof.directions
    };
    return activeContract.proveMembership(attackerWitnesses);
  }

  // Valid member construct private witness vector
  const proof = activeContract.merkleTree.getProof(index);
  const witnesses: PrivateWitnesses = {
    secretKey: secretKey,
    blindingSalt: blindingSalt,
    merklePath: proof.path,
    pathDirections: proof.directions
  };

  return activeContract.proveMembership(witnesses);
}

/**
 * Admin action: Register new commitment to allowlist
 */
export function adminAddMemberCommitment(secretKey: string, salt: string): { commitment: string; index: number; newRoot: string } {
  return activeContract.registerMemberSecret(secretKey, salt);
}

/**
 * Reset contract access status
 */
export function resetContractAccess(): void {
  activeContract.resetAccessStatus();
}
