import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  EyeOff, 
  Fingerprint, 
  Network, 
  KeyRound, 
  Lock, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { 
  connectDAppWallet, 
  queryPreprodIndexer, 
  executeAccessGateCheck,
  SecureStoragePrivateStateProvider,
  MIDNIGHT_CONFIG,
  ConnectedWalletSession,
  PublicLedgerState,
  hexToBytes,
} from './contract-bindings';

export default function GhostVault() {
  const [walletSession, setWalletSession] = useState<ConnectedWalletSession | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  // On-chain Indexer Ledger State
  const [indexerState, setIndexerState] = useState<PublicLedgerState | null>(null);
  const [isRefreshingIndexer, setIsRefreshingIndexer] = useState<boolean>(false);
  const [indexerError, setIndexerError] = useState<string | null>(null);

  // ZK Access Form State
  const [secretKey, setSecretKey] = useState<string>('');
  const [isProving, setIsProving] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    txHash?: string;
    nullifierHex?: string;
    error?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'prove' | 'ledger' | 'privacy'>('prove');

  const fetchOnChainState = async () => {
    setIsRefreshingIndexer(true);
    setIndexerError(null);
    try {
      const res = await queryPreprodIndexer(MIDNIGHT_CONFIG.defaultContractAddress);
      if (res.success && res.ledgerState) {
        setIndexerState(res.ledgerState);
      } else {
        setIndexerError(res.error || 'Failed to query indexer');
      }
    } catch (err: any) {
      setIndexerError(err.message || 'Indexer connection error');
    } finally {
      setIsRefreshingIndexer(false);
    }
  };

  useEffect(() => {
    fetchOnChainState();
    // Load persisted private state if available
    const storage = new SecureStoragePrivateStateProvider();
    const saved = storage.getPrivateState();
    if (saved) {
      const hex = Array.from(saved.secretKey).map((b) => b.toString(16).padStart(2, '0')).join('');
      setSecretKey(hex);
    }
  }, []);

  const handleConnectWallet = async (preferred: '1AM' | 'Lace' | 'any') => {
    setShowWalletModal(false);
    setIsConnecting(true);
    setWalletError(null);
    try {
      const session = await connectDAppWallet(preferred);
      setWalletSession(session);
    } catch (err: any) {
      setWalletError(err.message || 'Failed to connect Midnight wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWalletSession(null);
    setWalletError(null);
  };

  const handleExecuteProof = async (e: FormEvent) => {
    e.preventDefault();
    if (!secretKey) return;
    if (!walletSession) {
      setWalletError('Please connect your Midnight wallet first.');
      return;
    }

    setIsProving(true);
    setExecutionResult(null);

    try {
      const secretBytes = hexToBytes(secretKey);
      if (secretBytes.length !== 32) {
        throw new Error('Secret key must be exactly 32 bytes (64 hex characters)');
      }

      const res = await executeAccessGateCheck(walletSession, secretBytes);
      setExecutionResult(res);
      if (res.success) {
        await fetchOnChainState();
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        error: err.message || 'ZK proof generation failed',
      });
    } finally {
      setIsProving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white relative font-[Inter] selection:bg-cyan-500 selection:text-black">
      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setShowWalletModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div
            className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-[#0d0d0d] border border-white/10 p-6 shadow-2xl shadow-cyan-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1 text-white">Connect Midnight Wallet</h3>
            <p className="text-xs text-slate-400 mb-5">
              Select your installed Midnight DApp Connector extension
            </p>

            {/* 1AM Wallet Option */}
            <button
              onClick={() => handleConnectWallet('1AM')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all mb-3 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shrink-0">
                <KeyRound size={18} className="text-black" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white flex items-center gap-1.5">
                  1AM Wallet{' '}
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                    Official
                  </span>
                </p>
                <p className="text-xs text-slate-400">Connect via 1AM Midnight extension</p>
              </div>
            </button>

            {/* Midnight Lace Option */}
            <button
              onClick={() => handleConnectWallet('Lace')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all mb-3 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Midnight Lace Wallet</p>
                <p className="text-xs text-slate-400">Connect via Lace browser extension</p>
              </div>
            </button>

            {/* Auto Detect Option */}
            <button
              onClick={() => handleConnectWallet('any')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-black" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Auto-Detect Injected Wallet</p>
                <p className="text-xs text-slate-400">Automatically discover active extension</p>
              </div>
            </button>

            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cyber Grid + Neon Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,200,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,200,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-0 left-1/2 w-[1000px] h-[1000px] bg-cyan-500/10 blur-[300px] rounded-full -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-emerald-500/10 blur-[250px] rounded-full"></div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-[#030303]/70 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center text-black font-bold shadow-lg shadow-cyan-500/20">
              <Shield size={20} />
            </div>
            <div>
              <p className="font-bold text-lg tracking-tight">ShadowPass</p>
              <p className="text-[10px] text-cyan-400 tracking-[2px]">ZERO-KNOWLEDGE GATECHECK</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-400 font-mono">Network: Midnight Preprod</span>
            </div>

            {walletSession ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-cyan-300">
                  {walletSession.walletName}: {walletSession.coinPublicKey.slice(0, 8)}...{walletSession.coinPublicKey.slice(-6)}
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                disabled={isConnecting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold text-xs tracking-wider uppercase hover:opacity-90 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} /> Connect Wallet
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ERROR ALERT */}
      {walletError && (
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span>⚠️ {walletError}</span>
            <button
              onClick={() => setWalletError(null)}
              className="text-amber-400 hover:text-amber-200 ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-2">
            <Fingerprint size={14} />
            <span>Authoritative Compact Circuit on Midnight Blockchain</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Prove Identity Privately.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Reveal Nothing.
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Zero-Knowledge Merkle membership proofs with one-way cryptographic nullifiers. Proves inclusion without disclosing secret keys, Merkle paths, or wallet identity.
          </p>

          {/* VERIFIED CONTRACT BADGE */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://preprod.midnight.network/contract/${MIDNIGHT_CONFIG.defaultContractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-white/[0.08] transition-colors"
            >
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>Contract: {MIDNIGHT_CONFIG.defaultContractAddress.slice(0, 10)}...{MIDNIGHT_CONFIG.defaultContractAddress.slice(-8)}</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={fetchOnChainState}
              disabled={isRefreshingIndexer}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw size={12} className={isRefreshingIndexer ? 'animate-spin' : ''} />
              <span>Sync Indexer</span>
            </button>
          </div>
        </section>

        {/* NAVIGATION TABS */}
        <div className="flex justify-center border-b border-white/10 pb-4">
          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => setActiveTab('prove')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'prove'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound size={14} /> Submit ZK Access Proof
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'ledger'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network size={14} /> Public Ledger State
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <EyeOff size={14} /> Privacy Model
            </button>
          </div>
        </div>

        {/* TAB 1: SUBMIT ZK PROOF */}
        {activeTab === 'prove' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="p-8 rounded-3xl bg-[#080808]/90 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Lock size={18} className="text-cyan-400" /> Private Gate-Check Proof
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Circuit: <code className="text-cyan-300 font-mono">gatecheck.compact → checkAccess()</code>
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <form onSubmit={handleExecuteProof} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Private Member Secret Key (32-byte Hex)
                  </label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter your 64-character private secret key..."
                    required
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    🛡️ This secret is never broadcast on-chain. It is used locally to compute the witness and one-way nullifier.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProving || !secretKey || !walletSession}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  {isProving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Generating ZK Proof & Broadcasting...
                    </>
                  ) : !walletSession ? (
                    'Connect Wallet to Submit'
                  ) : (
                    <>
                      Execute checkAccess() Transaction <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* RESULT DISPLAY */}
              {executionResult && (
                <div
                  className={`p-5 rounded-2xl border ${
                    executionResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  } space-y-2`}
                >
                  <div className="flex items-center gap-2">
                    {executionResult.success ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <XCircle size={18} className="text-red-400" />
                    )}
                    <span className="font-bold text-sm">
                      {executionResult.success ? 'Access Granted & Proof Finalized!' : 'Verification Failed'}
                    </span>
                  </div>

                  {executionResult.txHash && (
                    <div className="text-xs font-mono text-slate-300 break-all">
                      <span className="text-slate-500">Tx Hash:</span>{' '}
                      <span className="text-cyan-300">{executionResult.txHash}</span>
                    </div>
                  )}

                  {executionResult.nullifierHex && (
                    <div className="text-xs font-mono text-slate-300 break-all">
                      <span className="text-slate-500">Nullifier:</span>{' '}
                      <span className="text-emerald-300">{executionResult.nullifierHex}</span>
                    </div>
                  )}

                  {executionResult.error && (
                    <p className="text-xs text-red-300 font-mono">{executionResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: PUBLIC LEDGER STATE */}
        {activeTab === 'ledger' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <div className="p-8 rounded-3xl bg-[#080808]/90 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Network size={18} className="text-cyan-400" /> Preprod Public Ledger
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live state queried from Midnight Preprod GraphQL Indexer
                  </p>
                </div>
                <button
                  onClick={fetchOnChainState}
                  disabled={isRefreshingIndexer}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw size={14} className={isRefreshingIndexer ? 'animate-spin' : ''} />
                </button>
              </div>

              {indexerError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-mono">
                  ⚠️ {indexerError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Access Granted Counter</p>
                  <p className="text-2xl font-extrabold text-cyan-400 font-mono">
                    {indexerState?.accessGranted ?? '0'}
                  </p>
                  <p className="text-[10px] text-slate-500">Verified unique checkAccess check-ins</p>
                </div>

                <div className="p-5 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Network Status</p>
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono">Preprod Active</p>
                  <p className="text-[10px] text-slate-500">Contract ID verified on testnet</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Allowlist Merkle Root</label>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 break-all mt-1">
                    {indexerState?.allowlistRoot || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium">Issuer / Admin Public Key</label>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-slate-300 break-all mt-1">
                    {indexerState?.issuer || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: PRIVACY MODEL */}
        {activeTab === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="p-8 rounded-3xl bg-[#080808]/90 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <EyeOff size={18} className="text-cyan-400" /> Cryptographic Privacy Guarantees
              </h2>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <p className="font-bold text-white text-sm">1. Zero Secret Disclosure</p>
                  <p className="text-slate-400">
                    The member's secret key and authentication path are provided off-chain as private witnesses and are never recorded on the Midnight ledger.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <p className="font-bold text-white text-sm">2. One-Way Nullifiers & Replay Prevention</p>
                  <p className="text-slate-400">
                    Each secret deterministically derives a unique nullifier <code className="text-cyan-300">nullifierOf(secret)</code>. The contract asserts <code className="text-cyan-300">!nullifiers.member(nullifier)</code> and inserts it into the public set, ensuring double-claiming is strictly impossible.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <p className="font-bold text-white text-sm">3. Issuer Access Control</p>
                  <p className="text-slate-400">
                    Only the authorized issuer wallet (<code className="text-cyan-300">assert(ownPublicKey() == issuer)</code>) is permitted to rotate the Merkle root via <code className="text-cyan-300">publishAllowlist()</code>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
