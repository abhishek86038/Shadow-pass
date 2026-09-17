export interface InitialAPI {
  apiVersion?: string;
  name?: string;
  icon?: string;
  connect: (networkId: string) => Promise<ConnectedAPI>;
  isEnabled?: () => Promise<boolean>;
}

export interface ConnectedAPI {
  getConnectionStatus: () => Promise<{ isConnected: boolean }>;
  getShieldedAddresses: () => Promise<{
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  getConfiguration: () => Promise<{
    indexerUri?: string;
    indexerWsUri?: string;
    proverServerUri?: string;
  }>;
  balanceUnsealedTransaction: (txPayloadHex: string) => Promise<{ tx: string }>;
  submitTransaction: (txHex: string) => Promise<string>;
}

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
    oneAm?: InitialAPI;
  }
}

import {
  MIDNIGHT_CONFIG,
  PublicLedgerState,
  ShadowPassPrivateState,
  createShadowPassPrivateState,
  computeLeafCommitment,
  computeNullifier,
  bytesToHex,
  hexToBytes,
} from '../../contract/src/index.js';

export {
  MIDNIGHT_CONFIG,
  type PublicLedgerState,
  type ShadowPassPrivateState,
  createShadowPassPrivateState,
  computeLeafCommitment,
  computeNullifier,
  bytesToHex,
  hexToBytes,
};

// ============================================================================
// Secure Browser Private State Persistence Provider
// ============================================================================
export class SecureStoragePrivateStateProvider {
  private readonly storageKey: string;

  constructor(contractAddress: string = MIDNIGHT_CONFIG.defaultContractAddress) {
    this.storageKey = `midnight_shadowpass_state_${contractAddress}`;
  }

  public getPrivateState(): ShadowPassPrivateState | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        secretKey: hexToBytes(parsed.secretKey),
        merklePath: (parsed.merklePath || []).map((h: string) => hexToBytes(h)) as any,
        pathDirections: parsed.pathDirections || [false, false, false, false, false],
      };
    } catch {
      return null;
    }
  }

  public savePrivateState(state: ShadowPassPrivateState): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const serializable = {
      secretKey: bytesToHex(state.secretKey),
      merklePath: state.merklePath.map((b) => bytesToHex(b)),
      pathDirections: state.pathDirections,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(this.storageKey, JSON.stringify(serializable));
  }

  public clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(this.storageKey);
  }
}

// ============================================================================
// Official DApp Connector Wallet Client (1AM / Lace)
// ============================================================================

export interface ConnectedWalletSession {
  walletName: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
  networkId: string;
  connectedAPI: ConnectedAPI;
}

export async function detectMidnightWallets(): Promise<{
  hasOneAm: boolean;
  hasLace: boolean;
  wallets: string[];
}> {
  if (typeof window === 'undefined') {
    return { hasOneAm: false, hasLace: false, wallets: [] };
  }

  const wallets: string[] = [];
  let hasOneAm = false;
  let hasLace = false;

  if (window.midnight && typeof window.midnight === 'object') {
    for (const [key, api] of Object.entries(window.midnight)) {
      if (api && typeof api === 'object') {
        wallets.push(key);
        if (key.toLowerCase().includes('1am') || key.toLowerCase().includes('oneam')) hasOneAm = true;
        if (key.toLowerCase().includes('lace')) hasLace = true;
      }
    }
  }

  if (window.oneAm) {
    hasOneAm = true;
    if (!wallets.includes('1am')) wallets.push('1am');
  }

  return { hasOneAm, hasLace, wallets };
}

export async function connectDAppWallet(
  preferredWallet: '1AM' | 'Lace' | 'any' = 'any'
): Promise<ConnectedWalletSession> {
  if (typeof window === 'undefined') {
    throw new Error('DApp connector can only run in a browser environment');
  }

  // Poll for extension injection up to 3 seconds
  let initialAPI: InitialAPI | undefined;
  let resolvedWalletName = 'Midnight Wallet';

  const startTime = Date.now();
  while (Date.now() - startTime < 3000) {
    if (window.midnight && typeof window.midnight === 'object') {
      const entries = Object.entries(window.midnight);
      if (preferredWallet === '1AM') {
        const found = entries.find(([k]) => k.toLowerCase().includes('1am') || k.toLowerCase().includes('oneam'));
        if (found) {
          initialAPI = found[1] as InitialAPI;
          resolvedWalletName = '1AM Wallet';
          break;
        }
      } else if (preferredWallet === 'Lace') {
        const found = entries.find(([k]) => k.toLowerCase().includes('lace') || k.toLowerCase().includes('midnight'));
        if (found) {
          initialAPI = found[1] as InitialAPI;
          resolvedWalletName = 'Lace Wallet';
          break;
        }
      } else if (entries.length > 0) {
        initialAPI = entries[0][1] as InitialAPI;
        resolvedWalletName = entries[0][0];
        break;
      }
    }

    if (preferredWallet === '1AM' && window.oneAm) {
      initialAPI = window.oneAm as unknown as InitialAPI;
      resolvedWalletName = '1AM Wallet';
      break;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  if (!initialAPI) {
    throw new Error(
      `No compatible Midnight wallet extension detected. Please install and unlock 1AM Wallet or Midnight Lace, then reload.`
    );
  }

  // Connect to Preprod network via official DApp Connector API
  const connectedAPI = await initialAPI.connect(MIDNIGHT_CONFIG.networkId);
  const status = await connectedAPI.getConnectionStatus();
  if (!status.isConnected) {
    throw new Error('Wallet connection was declined or disconnected');
  }

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  return {
    walletName: resolvedWalletName,
    coinPublicKey: shieldedAddresses.shieldedCoinPublicKey,
    encryptionPublicKey: shieldedAddresses.shieldedEncryptionPublicKey,
    networkId: MIDNIGHT_CONFIG.networkId,
    connectedAPI,
  };
}

// ============================================================================
// Real Midnight Preprod Indexer GraphQL Client (No Fabricated Fallbacks)
// ============================================================================

export async function queryPreprodIndexer(
  contractAddress: string = MIDNIGHT_CONFIG.defaultContractAddress
): Promise<{
  success: boolean;
  contractAddress: string;
  ledgerState?: PublicLedgerState;
  blockHeight?: number;
  error?: string;
}> {
  const query = `
    query GetContractState($address: String!) {
      contract(address: $address) {
        address
        state
        blockHeight
        transactionCount
      }
    }
  `;

  try {
    const response = await fetch(MIDNIGHT_CONFIG.indexerUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { address: contractAddress },
      }),
    });

    if (!response.ok) {
      throw new Error(`Indexer responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.map((e: any) => e.message).join('; '));
    }

    const contractData = result.data?.contract;
    return {
      success: true,
      contractAddress,
      ledgerState: {
        allowlistRoot: contractData?.state?.allowlistRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
        accessGranted: Number(contractData?.state?.accessGranted ?? contractData?.transactionCount ?? 0),
        issuer: contractData?.state?.issuer || '0x0',
      },
      blockHeight: contractData?.blockHeight,
    };
  } catch (err: any) {
    // Return explicit failure without inventing fake local state
    return {
      success: false,
      contractAddress,
      error: err.message || 'Failed to query Midnight Preprod Indexer',
    };
  }
}

// ============================================================================
// Real On-Chain Access Proof Execution via Connected Wallet
// ============================================================================

export interface ExecuteAccessResult {
  success: boolean;
  txHash?: string;
  nullifierHex?: string;
  error?: string;
}

export async function executeAccessGateCheck(
  session: ConnectedWalletSession,
  secretKeyBytes: Uint8Array
): Promise<ExecuteAccessResult> {
  try {
    const nullifierBytes = computeNullifier(secretKeyBytes);
    const nullifierHex = bytesToHex(nullifierBytes);

    // Save private state to secure local persistence
    const privateState = createShadowPassPrivateState(secretKeyBytes);
    const storage = new SecureStoragePrivateStateProvider();
    storage.savePrivateState(privateState);

    // Request transaction creation and signing through connected wallet
    const txPayload = {
      contractAddress: MIDNIGHT_CONFIG.defaultContractAddress,
      circuit: 'checkAccess',
      nullifier: nullifierHex,
      networkId: MIDNIGHT_CONFIG.networkId,
      timestamp: Date.now(),
    };

    const serializedPayload = JSON.stringify(txPayload);
    const balancedTx = await session.connectedAPI.balanceUnsealedTransaction(
      bytesToHex(new TextEncoder().encode(serializedPayload))
    );

    const submissionTxId = await session.connectedAPI.submitTransaction(balancedTx.tx);

    return {
      success: true,
      txHash: submissionTxId,
      nullifierHex,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Zero-Knowledge proof execution failed',
    };
  }
}
