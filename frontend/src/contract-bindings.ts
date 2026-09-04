import {
  AllowlistContract,
  PublicLedgerState,
  PrivateWitnesses,
  ProofResult,
  computeCommitment,
  MIDNIGHT_CONFIG,
  findDeployedContract,
  deployContract as sdkDeployContract
} from '@shadow-pass/contract';

// ============================================================================
// Midnight DApp Connector API Window Interface Definition (1AM & Lace)
// ============================================================================
export interface MidnightWalletAPI {
  getUnspentProofs?: () => Promise<string[]>;
  submitTx: (txHex: string) => Promise<string>;
  getPublicAddress: () => Promise<string>;
  getBalance?: () => Promise<{ tDUST: string; NIGHT?: string }>;
  getNetworkId?: () => Promise<string>;
}

declare global {
  interface Window {
    midnight?: Record<string, {
      enable: () => Promise<MidnightWalletAPI>;
      isEnabled?: () => Promise<boolean>;
      name?: string;
      apiVersion?: string;
    }>;
    oneAm?: {
      enable: () => Promise<MidnightWalletAPI>;
    };
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string;
  isLaceInstalled: boolean;
  walletName: '1AM Wallet' | 'Midnight Lace' | 'Sandbox Mode' | 'Disconnected';
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

let activeWalletAPI: MidnightWalletAPI | null = null;

async function detectMidnightProvider(): Promise<{ provider: any; name: '1AM Wallet' | 'Midnight Lace' } | null> {
  if (typeof window === 'undefined') return null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const anyWin = window as any;
    const midnight = anyWin.midnight;

    if (midnight) {
      if (midnight.oneAm && typeof midnight.oneAm.enable === 'function') {
        return { provider: midnight.oneAm, name: '1AM Wallet' };
      }
      if (midnight.mnLace && typeof midnight.mnLace.enable === 'function') {
        return { provider: midnight.mnLace, name: 'Midnight Lace' };
      }
      if (midnight['1am'] && typeof midnight['1am'].enable === 'function') {
        return { provider: midnight['1am'], name: '1AM Wallet' };
      }
      for (const key of Object.keys(midnight)) {
        if (midnight[key] && typeof midnight[key].enable === 'function') {
          return { provider: midnight[key], name: key.toLowerCase().includes('lace') ? 'Midnight Lace' : '1AM Wallet' };
        }
      }
    }

    if (anyWin.oneAm && typeof anyWin.oneAm.enable === 'function') {
      return { provider: anyWin.oneAm, name: '1AM Wallet' };
    }
    if (anyWin.oneam && typeof anyWin.oneam.enable === 'function') {
      return { provider: anyWin.oneam, name: '1AM Wallet' };
    }
    if (anyWin.cardano?.midnight && typeof anyWin.cardano.midnight.enable === 'function') {
      return { provider: anyWin.cardano.midnight, name: '1AM Wallet' };
    }

    // Wait 100ms before checking again (for extension injection)
    await new Promise(res => setTimeout(res, 100));
  }

  return null;
}

/**
 * Connect to 1AM Wallet or Midnight Lace using official DApp Connector API
 */
export async function connectLaceWallet(forceSandbox: boolean = false): Promise<WalletState> {
  if (typeof window !== 'undefined' && !forceSandbox) {
    const detected = await detectMidnightProvider();

    if (detected && detected.provider) {
      try {
        const api = await detected.provider.enable();
        activeWalletAPI = api;
        const address = await api.getPublicAddress();
        return {
          isConnected: true,
          address: address,
          network: 'Midnight Preprod (setNetworkId("preprod"))',
          isLaceInstalled: true,
          walletName: detected.name
        };
      } catch (err: any) {
        console.warn('[Midnight DApp Connector] Wallet connection rejected or error:', err);
        return {
          isConnected: false,
          address: null,
          network: 'Midnight Preprod',
          isLaceInstalled: true,
          walletName: 'Disconnected',
          errorMessage: err?.message || 'Wallet connection rejected by user.'
        };
      }
    }
  }

  // If Wallet extension is not found in browser window
  if (!forceSandbox) {
    return {
      isConnected: false,
      address: null,
      network: 'Midnight Preprod',
      isLaceInstalled: false,
      walletName: 'Disconnected',
      errorMessage: '1AM Wallet extension not detected yet. Make sure 1AM extension is pinned in your browser, or click "Demo Mode (Sandbox)" to test immediately.'
    };
  }

  // Sandbox Mode for offline testing / development
  return {
    isConnected: true,
    address: 'midnight1q_preprod_1am_sandbox_session_address',
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
 * Deploy contract on Preprod with connected wallet
 */
export async function deployContractOnPreprod(adminPubKey?: string): Promise<{ contractAddress: string; txHash: string }> {
  const admin = adminPubKey || (await activeWalletAPI?.getPublicAddress()) || adminAddress;
  const deployment = await sdkDeployContract(admin, 8);
  
  let txHash = deployment.txHash;
  if (activeWalletAPI) {
    try {
      const submitted = await activeWalletAPI.submitTx(deployment.txHash);
      if (submitted) txHash = submitted;
    } catch (e) {
      console.warn('[Midnight Deployment] submitTx warning:', e);
    }
  }

  activeContract.contractAddress = deployment.deployedAddress;
  return {
    contractAddress: deployment.deployedAddress,
    txHash
  };
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

  // If connected via real 1AM / Lace wallet, submit transaction through Wallet API
  if (activeWalletAPI && proofResult.success && proofResult.txHash) {
    try {
      const submittedHash = await activeWalletAPI.submitTx(proofResult.txHash);
      if (submittedHash) {
        proofResult.txHash = submittedHash;
      }
    } catch (txErr) {
      console.warn('[Midnight Wallet] Transaction submission failed:', txErr);
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
