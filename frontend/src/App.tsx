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
  Users, 
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserPlus,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  connectLaceWallet, 
  getLedgerState, 
  submitZKMembershipProof, 
  adminAddMemberCommitment, 
  resetContractAccess,
  DEMO_MEMBER_1,
  WalletState 
} from './contract-bindings';
import { PublicLedgerState, ProofResult } from '@shadow-pass/contract';

export default function GhostVault() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    network: 'Midnight Testnet',
    isLaceInstalled: false,
    walletName: 'Lace'
  });

  const [ledger, setLedger] = useState<PublicLedgerState>(getLedgerState());
  const [activeTab, setActiveTab] = useState<'prove' | 'admin' | 'privacy'>('prove');
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  // Form State
  const [secretKey, setSecretKey] = useState<string>('');
  const [blindingSalt, setBlindingSalt] = useState<string>('');
  const [isProving, setIsProving] = useState<boolean>(false);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);

  // Admin State
  const [newSecret, setNewSecret] = useState<string>('');
  const [newSalt, setNewSalt] = useState<string>('');
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const refreshLedger = () => {
    setLedger(getLedgerState());
  };

  useEffect(() => {
    refreshLedger();
  }, []);

  const handleWalletToggle = () => {
    if (wallet.isConnected) {
      setWallet({
        isConnected: false,
        address: null,
        network: 'Midnight Testnet',
        isLaceInstalled: false,
        walletName: 'Lace'
      });
    } else {
      setShowWalletModal(true);
    }
  };

  const handleConnectLace = async () => {
    setShowWalletModal(false);
    const state = await connectLaceWallet();
    setWallet(state);
  };

  const handleDemoMode = () => {
    setShowWalletModal(false);
    setWallet({
      isConnected: true,
      address: 'midnight1demo9q7z9w8x7y6v5u4t3s2r1q0p9o8n7m',
      network: 'Demo Mode (Simulator)',
      isLaceInstalled: false,
      walletName: 'Simulated'
    });
    setSecretKey(DEMO_MEMBER_1.secret);
    setBlindingSalt(DEMO_MEMBER_1.salt);
  };

  const handleProve = async (e: FormEvent) => {
    e.preventDefault();
    if (!secretKey || !blindingSalt) return;

    setIsProving(true);
    setProofResult(null);

    try {
      const result = await submitZKMembershipProof(secretKey, blindingSalt);
      setProofResult(result);
      refreshLedger();
    } catch (err: any) {
      setProofResult({
        success: false,
        accessGranted: false,
        proofVerified: false,
        error: err.message || 'Proof submission failed'
      });
    } finally {
      setIsProving(false);
    }
  };

  const handleAdminRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!newSecret || !newSalt) return;

    try {
      const { commitment, index, newRoot } = adminAddMemberCommitment(newSecret, newSalt);
      setAdminMsg(`Member registered! Leaf #${index} commitment: ${commitment.slice(0, 10)}... Root: ${newRoot.slice(0, 10)}...`);
      setNewSecret('');
      setNewSalt('');
      refreshLedger();
    } catch (err: any) {
      setAdminMsg(`Error adding member: ${err.message}`);
    }
  };

  const handleReset = () => {
    resetContractAccess();
    setProofResult(null);
    refreshLedger();
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white relative font-[Inter] selection:bg-cyan-500 selection:text-black">

      {/* Wallet Selection Modal — root level so it renders above everything */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowWalletModal(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
          <div
            className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-[#0d0d0d] border border-white/10 p-6 shadow-2xl shadow-cyan-500/20"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1 text-white">Connect Wallet</h3>
            <p className="text-xs text-slate-400 mb-5">Choose how you want to connect to ShadowPass</p>

            {/* Lace Wallet Option */}
            <button
              onClick={handleConnectLace}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all mb-3 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shrink-0">
                <KeyRound size={18} className="text-black" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Midnight Lace Wallet</p>
                <p className="text-xs text-slate-400">Connect via Lace browser extension</p>
              </div>
            </button>

            {/* Demo Mode Option */}
            <button
              onClick={handleDemoMode}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-black" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Demo Mode</p>
                <p className="text-xs text-slate-400">Try with pre-loaded simulator credentials</p>
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

      {/* Cyber Grid + Neon Glow Background */}
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
              <p className="font-bold text-lg tracking-tight">GhostVault</p>
              <p className="text-[10px] text-cyan-400 tracking-[2px]">PHASE 1 ACCESS</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-400 font-mono">Privacy Mode: ON</span>
            </div>
            <button
              onClick={handleWalletToggle}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2 text-sm"
            >
              <KeyRound size={16} />
              {wallet.isConnected
                ? `${wallet.walletName}: ${wallet.address?.slice(0, 8)}...${wallet.address?.slice(-4)}`
                : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5 border border-white/[0.08]"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          <p className="text-xs uppercase tracking-[3px] text-cyan-400 mb-3 flex items-center gap-2 font-mono">
            <EyeOff size={14} /> Anonymous Verification Protocol
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Access Gated Content <br /> Without Exposing Identity
          </h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed text-sm md:text-base">
            Zero-knowledge gateway powered by on-chain proofs on the Midnight blockchain. Admins manage private Merkle registries.
            Users verify eligibility locally via Compact ZK circuits. Nothing hits the public chain except the verification proof.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {['No Wallet Exposure', 'ZK-SNARK Based', 'On-chain Verifiable', 'Midnight Compact'].map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-cyan-300">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="flex flex-wrap gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] max-w-xl">
          <button
            onClick={() => setActiveTab('prove')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'prove'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Fingerprint size={14} />
            <span>Prove Access</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <UserPlus size={14} />
            <span>Registry Core</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <EyeOff size={14} />
            <span>Privacy Audit</span>
          </button>
        </div>
      </div>

      {/* 3-COLUMN MAIN GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-20 grid lg:grid-cols-3 gap-6">

        {/* COLUMN 1: ON-CHAIN PUBLIC LEDGER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass rounded-3xl p-6 md:p-7 h-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Database size={16} />
                  <span>On-Chain Public State</span>
                </div>
                <button
                  onClick={refreshLedger}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
                  title="Refresh state"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">accessGranted</span>
                {ledger.accessGranted ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 size={14} /> UNLOCKED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/[0.05] text-slate-400 border border-white/[0.08] flex items-center gap-1.5">
                    <Lock size={14} /> LOCKED
                  </span>
                )}
              </div>

              {/* Merkle Root */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">allowlistRoot</span>
                  <span className="text-cyan-400 font-mono text-[10px]">Depth 8</span>
                </div>
                <p className="font-mono text-xs text-slate-300 break-all bg-black/60 p-2.5 rounded-xl border border-white/[0.05]">
                  {ledger.allowlistRoot}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08]">
                  <span className="text-[11px] text-slate-400 block mb-1">Members</span>
                  <span className="text-lg font-bold text-white">{ledger.registeredCount} / 256</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08]">
                  <span className="text-[11px] text-slate-400 block mb-1">Nonce</span>
                  <span className="text-lg font-bold text-white font-mono">#{ledger.lastEventNonce}</span>
                </div>
              </div>
            </div>

            {ledger.accessGranted && (
              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Reset Access State</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* COLUMN 2 & 3 CONTAINER / DYNAMIC TABS */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB: PROVE ACCESS */}
          {activeTab === 'prove' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="glass rounded-3xl p-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Generate Zero-Knowledge Proof</h2>
                    <p className="text-xs text-slate-400">Prove inclusion in the Merkle tree via local Compact ZK circuit execution.</p>
                  </div>
                </div>

                {/* Preset Credentials for Demo */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Demo Quick Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSecretKey(DEMO_MEMBER_1.secret);
                        setBlindingSalt(DEMO_MEMBER_1.salt);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
                    >
                      Member 1 (Allowed Secret)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSecretKey('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
                        setBlindingSalt('9999999999999999999999999999999999999999999999999999999999999999');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                    >
                      Attacker (Non-Member Secret)
                    </button>
                  </div>
                </div>

                <form onSubmit={handleProve} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Private Secret Key (Hex 32-bytes)</label>
                    <input
                      type="text"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="e.g. a1b2c3d4..."
                      className="w-full bg-black/60 border border-white/[0.08] focus:border-cyan-500 rounded-xl px-4 py-3 text-xs font-mono outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Blinding Salt (Hex 32-bytes)</label>
                    <input
                      type="text"
                      value={blindingSalt}
                      onChange={(e) => setBlindingSalt(e.target.value)}
                      placeholder="e.g. 11111111..."
                      className="w-full bg-black/60 border border-white/[0.08] focus:border-cyan-500 rounded-xl px-4 py-3 text-xs font-mono outline-none transition-colors"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProving}
                    className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isProving
                        ? 'bg-cyan-500/20 text-cyan-300 cursor-wait'
                        : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:shadow-lg hover:shadow-cyan-500/30'
                    }`}
                  >
                    {isProving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Compiling Compact ZK Proof...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Generate & Submit ZK Proof</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Proof Execution Output */}
                {proofResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border ${
                      proofResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {proofResult.success ? (
                        <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={22} className="text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm">
                            {proofResult.success ? 'ZK Proof Verified On-Chain!' : 'Verification Failed'}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 border border-white/[0.08]">
                            {proofResult.success ? 'ACCESS GRANTED' : 'REJECTED'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {proofResult.success
                            ? 'The Compact circuit verified your inclusion path against allowlistRoot. Ledger accessGranted updated with zero identity leakage.'
                            : proofResult.error}
                        </p>
                        {proofResult.txHash && (
                          <p className="text-[11px] font-mono text-cyan-400 pt-1 break-all">
                            Midnight Tx: {proofResult.txHash.slice(0, 32)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: REGISTRY CORE (ADMIN) */}
          {activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="glass rounded-3xl p-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Registry Core (Admin Management)</h2>
                    <p className="text-xs text-slate-400">Append blinded identity commitments to the private Merkle tree.</p>
                  </div>
                </div>

                <form onSubmit={handleAdminRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Member Secret Key</label>
                    <input
                      type="text"
                      value={newSecret}
                      onChange={(e) => setNewSecret(e.target.value)}
                      placeholder="Enter hex 32-byte secret"
                      className="w-full bg-black/60 border border-white/[0.08] focus:border-emerald-500 rounded-xl px-4 py-3 text-xs font-mono outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Blinding Salt</label>
                    <input
                      type="text"
                      value={newSalt}
                      onChange={(e) => setNewSalt(e.target.value)}
                      placeholder="Enter hex 32-byte salt"
                      className="w-full bg-black/60 border border-white/[0.08] focus:border-emerald-500 rounded-xl px-4 py-3 text-xs font-mono outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                  >
                    Register Member Commitment
                  </button>
                </form>

                {adminMsg && (
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs font-mono text-cyan-400 break-all">
                    {adminMsg}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: PRIVACY AUDIT */}
          {activeTab === 'privacy' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="glass rounded-3xl p-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <EyeOff size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Midnight Privacy Model Audit</h2>
                    <p className="text-xs text-slate-400">Cryptographic privacy boundary specification enforced on-chain.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Observer CAN See (Public):
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li>• Merkle root hash (<code className="text-cyan-400 font-mono">allowlistRoot</code>)</li>
                      <li>• Verification flag (<code className="text-cyan-400 font-mono">accessGranted</code>)</li>
                      <li>• Registered count (<code className="text-cyan-400 font-mono">registeredCount</code>)</li>
                      <li>• Contract nonces & timestamps</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                    <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                      <EyeOff size={14} /> Observer CANNOT See (Private):
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li>• User secret key or blinding salt</li>
                      <li>• Wallet address or identity string</li>
                      <li>• Leaf position in Merkle tree</li>
                      <li>• Proof linkability across runs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] bg-[#030303] py-6 text-center text-xs text-slate-500">
        <p>ShadowPass Protocol — Midnight Hackathon First Quarter Level 3 Submission</p>
      </footer>
    </div>
  );
}
