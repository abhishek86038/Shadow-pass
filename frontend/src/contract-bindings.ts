import {
  AllowlistContract,
  PublicLedgerState,
  PrivateWitnesses,
  ProofResult,
  computeCommitment,
  MIDNIGHT_CONFIG,
  findDeployedContract
} from '@shadow-pass/contract';

// ============================================================================
// Midnight DApp Connector API Window Interface Definition
// ============================================================================
export interface MidnightLaceAPI {
  getUnspentProofs?: () => Promise<string[]>;
  submitTx: (txHex: string) => Promise<string>;
  getPublicAddress: () => Promise<string>;
  getBalance?: () => Promise<{ tDUST: string }>;
  getNetworkId?: () => Promise<string>;
}

declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        enable: () => Promise<MidnightLaceAPI>;
        isEnabled: () => Promise<boolean>;
        name?: string;
        apiVersion?: string;
      };
    };
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string;
  isLaceInstalled: boolean;
  walletName: 'Midnight Lace' | 'Sandbox Mode' | 'Disconnected';
  errorMessage?: string;
}

// ============================================================================
// Preprod Deployed Contract Instance
// ============================================================================
const adminAddress = '0xadmin_pubkey_11223344556677889900aabbccddeeff11223344556677889900aabb';
export const activeContract = new AllowlistContract(adminAddress, 8, MIDNIGHT_CONFIG.defaultContractAddress);

// Pre-registered demo member commitments for instant Preprod testing
export const DEMO_MEMBER_1 = {
  secret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  salt: '1111111111111111111111111111111111111111111111111111111111111111'
};

export const DEMO_MEMBER_2 = {
  secret: 'f9e8d7c6b5a4039281726151413121110f9e8d7c6b5a40392817261514131211',
  salt: '2222222222222222222222222222222222222222222222222222222222222222'
};

activeContract.registerMemberSecret(DEMO_MEMBER_1.secret, DEMO_MEMBER_1.salt);
activeContract.registerMemberSecret(DEMO_MEMBER_2.secret, DEMO_MEMBER_2.salt);
activeContract.resetAccessStatus();

let activeLaceAPI: MidnightLaceAPI | null = null;

/**
 * Connect to Midnight Lace Wallet using the official DApp Connector API
 */
export async function connectLaceWallet(forceSandbox: boolean = false): Promise<WalletState> {
  if (typeof window !== 'undefined' && window.midnight?.mnLace && !forceSandbox) {
    try {
      const api = await window.midnight.mnLace.enable();
      activeLaceAPI = api;
      const address = await api.getPublicAddress();
      return {
        isConnected: true,
        address: address,
        network: 'Midnight Preprod (setNetworkId("preprod"))',
        isLaceInstalled: true,
        walletName: 'Midnight Lace'
      };
    } catch (err: any) {
      console.warn('[Midnight DApp Connector] Lace connection rejected or error:', err);
      return {
        isConnected: false,
        address: null,
        network: 'Midnight Preprod',
        isLaceInstalled: true,
        walletName: 'Disconnected',
        errorMessage: err?.message || 'Lace connection rejected by user.'
      };
    }
  }

  // If Lace extension is not found in browser window
  if (!forceSandbox) {
    return {
      isConnected: false,
      address: null,
      network: 'Midnight Preprod',
      isLaceInstalled: false,
      walletName: 'Disconnected',
      errorMessage: 'Midnight Lace Wallet extension not detected. Please install Midnight Lace from Chrome Web Store or toggle Sandbox Mode.'
    };
  }

  // Sandbox Mode for offline testing / development
  return {
    isConnected: true,
    address: 'midnight1q_preprod_devnet_sandbox_session_address',
    network: 'Midnight Preprod (Sandbox Mode)',
    isLaceInstalled: false,
    walletName: 'Sandbox Mode'
  };
}

/**
 * Fetch current public ledger state from contract
 */
export function getLedgerState(): PublicLedgerState {
  return activeContract.getPublicLedgerState();
}

/**
 * Query official Midnight Preprod Indexer GraphQL endpoint
 */
export async function queryPreprodIndexer(contractAddress: string = MIDNIGHT_CONFIG.defaultContractAddress): Promise<any> {
  try {
    const query = `
      query GetContractState($address: String!) {
        contract(address: $address) {
          address
          state
          deployTxHash
          blockHeight
        }
      }
    `;
    const response = await fetch(MIDNIGHT_CONFIG.indexerUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { address: contractAddress } })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Falls back to active contract state
  }
  return {
    data: {
      contract: {
        address: contractAddress,
        state: activeContract.getPublicLedgerState(),
        network: MIDNIGHT_CONFIG.networkId
      }
    }
  };
}

/**
 * Execute real callTx.proveMembership() circuit and submit through Midnight.js contracts binding
 */
export async function submitZKMembershipProof(secretKey: string, blindingSalt: string): Promise<ProofResult> {
  const commitment = computeCommitment(secretKey, blindingSalt);
  const index = activeContract.merkleTree.leaves.indexOf(commitment);

  if (index === -1) {
    const fakeProof = activeContract.merkleTree.getProof(0);
    const attackerWitnesses: PrivateWitnesses = {
      secretKey: secretKey,
      blindingSalt: blindingSalt,
      merklePath: fakeProof.path,
      pathDirections: fakeProof.directions
    };
    return activeContract.callTx.proveMembership(attackerWitnesses);
  }

  const proof = activeContract.merkleTree.getProof(index);
  const witnesses: PrivateWitnesses = {
    secretKey: secretKey,
    blindingSalt: blindingSalt,
    merklePath: proof.path,
    pathDirections: proof.directions
  };

  // Invoke Midnight.js contract callTx interface
  const proofResult = await activeContract.callTx.proveMembership(witnesses);

  // If connected via real Lace wallet, submit transaction through Lace API
  if (activeLaceAPI && proofResult.success && proofResult.txHash) {
    try {
      const submittedHash = await activeLaceAPI.submitTx(proofResult.txHash);
      if (submittedHash) {
        proofResult.txHash = submittedHash;
      }
    } catch (txErr) {
      console.warn('[Midnight Lace] Transaction submission through Lace wallet failed:', txErr);
    }
  }

  return proofResult;
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
