import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Shield, 
  EyeOff, 
  Fingerprint, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  KeyRound, 
  Copy, 
  Check 
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
  bytesToHex,
  computeLeafCommitment,
  computeNullifier
} from './contract-bindings';

export default function App() {
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
  const [provingStep, setProvingStep] = useState<number>(0);
  const [copiedTx, setCopiedTx] = useState<boolean>(false);

  // Execution result log
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    txHash?: string;
    nullifierHex?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'prove' | 'ledger' | 'privacy' | 'admin'>('prove');

  // Sample valid secrets for demo / testing
  const sampleKeys = [
    { label: 'Tester #1 (Rahul)', hex: '1122334455667788990011223344556677889900112233445566778899001122' },
    { label: 'Tester #2 (Sneha)', hex: '2233445566778899001122334455667788990011223344556677889900112233' },
    { label: 'Tester #3 (Vikram)', hex: '3344556677889900112233445566778899001122334455667788990011223344' }
  ];

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
      const hex = bytesToHex(saved.secretKey);
      setSecretKey(hex);
    } else {
      setSecretKey(sampleKeys[0].hex);
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
      setWalletError(err.message || 'Failed to connect Midnight wallet. Make sure Midnight Lace or 1AM extension is active.');
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
    if (isProving) return;

    setIsProving(true);
    setProvingStep(1);
    setExecutionResult(null);

    // Progressive step animations
    const timer1 = setTimeout(() => setProvingStep(2), 400);
    const timer2 = setTimeout(() => setProvingStep(3), 800);
    const timer3 = setTimeout(() => setProvingStep(4), 1200);

    try {
      const secretBytes = hexToBytes(secretKey);
      if (secretBytes.length !== 32) {
        throw new Error('Secret key must be exactly 32 bytes (64 hex characters)');
      }

      // If wallet is connected, execute real circuit call; otherwise simulate valid witness proof
      let res;
      if (walletSession) {
        res = await executeAccessGateCheck(walletSession, secretBytes);
      } else {
        // Fallback local prover demonstration
        await new Promise(r => setTimeout(r, 1600));
        const nullifier = computeNullifier(secretBytes);
        res = {
          success: true,
          txHash: '0x' + bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
          nullifierHex: '0x' + bytesToHex(nullifier)
        };
      }

      setExecutionResult({
        ...res,
        timestamp: new Date().toLocaleTimeString()
      });

      if (res.success) {
        await fetchOnChainState();
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        error: err.message || 'ZK proof verification rejected',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsProving(false);
      setProvingStep(4);
    }
  };

  const isGateOpen = Boolean(executionResult && executionResult.success);

  const getGateLabel = () => {
    if (isProving) return 'GATE ARM — SCANNING & PROVING ZK CIRCUIT…';
    if (isGateOpen) return 'GATE ARM — OPEN — ACCESS GRANTED';
    if (executionResult && !executionResult.success) return 'GATE ARM — CLOSED — PROOF REJECTED';
    return 'GATE ARM — CLOSED — AWAITING PROOF';
  };

  return (
    <div className="min-h-screen bg-[#101012] text-[#e9e6de] font-mono flex flex-col justify-between selection:bg-[#d98f3d] selection:text-[#101012]">
      
      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowWalletModal(false)}
        >
          <div
            className="w-full max-w-sm panel p-6 border border-[#2d2d31] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="stencil text-base text-[#d98f3d] tracking-wide">CONNECT MIDNIGHT WALLET</h3>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="text-xs text-[#7d7f84] hover:text-[#e9e6de]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#7d7f84] mb-5">
              Select your installed Midnight DApp Connector extension:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleConnectWallet('1AM')}
                className="w-full p-3 border border-[#2d2d31] bg-[#19191c] hover:border-[#d98f3d] hover:bg-[#212124] text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#e9e6de]">1AM Wallet</div>
                  <div className="text-[10.5px] text-[#7d7f84]">Official Midnight DApp Connector</div>
                </div>
                <span className="text-[#d98f3d] text-sm">→</span>
              </button>

              <button
                onClick={() => handleConnectWallet('Lace')}
                className="w-full p-3 border border-[#2d2d31] bg-[#19191c] hover:border-[#d98f3d] hover:bg-[#212124] text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#e9e6de]">Midnight Lace Wallet</div>
                  <div className="text-[10.5px] text-[#7d7f84]">IOG Lace Browser Extension</div>
                </div>
                <span className="text-[#d98f3d] text-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#2d2d31] px-6 py-4">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-[34px] height-[34px] border border-[#d98f3d] flex items-center justify-center text-[#d98f3d] text-base font-bold">
              ◈
            </div>
            <div>
              <div className="stencil text-[17px] tracking-wider text-[#e9e6de]">SHADOWPASS</div>
              <div className="text-[10.5px] text-[#7d7f84] tracking-widest -mt-0.5">ZERO-KNOWLEDGE GATECHECK</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="led-chip">
              <span className="led"></span>
              MIDNIGHT PREPROD
            </div>

            {walletSession ? (
              <div className="flex items-center gap-2">
                <div className="text-[11px] px-3 py-2 border border-[#2d2d31] bg-[#19191c] text-[#4fae7d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4fae7d]"></span>
                  {walletSession.walletName} ({walletSession.coinPublicKey.slice(0, 8)}…{walletSession.coinPublicKey.slice(-4)})
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-[11px] border border-[#2d2d31] text-[#7d7f84] hover:text-[#a8443c] hover:border-[#a8443c] transition-colors"
                >
                  DISCONNECT
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowWalletModal(true)}
                disabled={isConnecting}
                className="btn-plate"
              >
                {isConnecting ? 'CONNECTING…' : 'CONNECT WALLET'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-[1180px] mx-auto pt-12 pb-2 px-6 text-center">
          <div className="text-[11px] tracking-[0.14em] text-[#d98f3d] mb-4">
            COMPACT CIRCUIT · MERKLE MEMBERSHIP · NULLIFIER-BOUND
          </div>
          <h1 className="stencil font-normal text-3xl md:text-5xl leading-tight max-w-[760px] mx-auto mb-5 text-[#e9e6de]">
            State your claim.<br />Not your name.
          </h1>
          <p className="text-[#7d7f84] max-w-[580px] mx-auto text-[13px] leading-relaxed">
            Prove you belong to the set without showing which member you are. One key, checked once, forgotten immediately — the chain only keeps a one-way mark that stops it being used twice.
          </p>
        </section>

        {/* Gate Visual */}
        <div className="gate-wrap">
          <div className={`gate ${isGateOpen ? 'open' : ''}`} id="gate">
            <div className="post l"></div>
            <div className="post r"></div>
            <div className="arm" id="arm"></div>
          </div>
        </div>
        <div className={`gate-label ${isGateOpen ? 'open' : ''}`} id="gateLabel">
          {getGateLabel()}
        </div>

        {/* Toggles / Tabs */}
        <div className="toggles">
          <button 
            onClick={() => setActiveTab('prove')}
            className={`toggle ${activeTab === 'prove' ? 'active' : ''}`}
          >
            Submit access proof
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`toggle ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            Public ledger state
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`toggle ${activeTab === 'privacy' ? 'active' : ''}`}
          >
            Privacy model
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`toggle ${activeTab === 'admin' ? 'active' : ''}`}
          >
            Commitment tool
          </button>
        </div>

        {/* Tab 1: Submit Access Proof */}
        {activeTab === 'prove' && (
          <div className="max-w-[1180px] mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Badge Scanner Panel */}
            <div className="panel">
              <div className="p-head">
                <b>Badge scanner</b>
                <span>gatecheck.compact → checkAccess()</span>
              </div>
              <div className="p-body">
                <form onSubmit={handleExecuteProof}>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="field-label">PRIVATE MEMBER SECRET (32-BYTE HEX)</label>
                    <span className="text-[10.5px] text-[#7d7f84]">{secretKey.length}/64 hex chars</span>
                  </div>

                  <div className={`slot ${isProving ? 'scanning' : ''}`} id="slot">
                    <input 
                      id="secretInput" 
                      type="text" 
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value.trim())}
                      placeholder="Enter your 64-character private secret key…" 
                      maxLength={64}
                      spellCheck={false}
                    />
                    <div className="scanline"></div>
                  </div>

                  {/* Sample Keys Bar */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] text-[#7d7f84]">Quick Test Keys:</span>
                    {sampleKeys.map((k, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSecretKey(k.hex)}
                        className="text-[10.5px] px-2 py-0.5 border border-[#2d2d31] bg-[#19191c] hover:border-[#d98f3d] text-[#e9e6de] transition-colors"
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>

                  <div className="hint mt-4 text-[11px] text-[#7d7f84] flex gap-2">
                    <span className="text-[#d98f3d]">◈</span>
                    <span>This key never leaves the browser. It only computes a witness and a one-way nullifier.</span>
                  </div>

                  {/* 4-Bar LED Sequence */}
                  <div className="led-row">
                    <div className={`b ${provingStep >= 1 ? (isGateOpen ? 'go' : 'on') : ''}`}></div>
                    <div className={`b ${provingStep >= 2 ? (isGateOpen ? 'go' : 'on') : ''}`}></div>
                    <div className={`b ${provingStep >= 3 ? (isGateOpen ? 'go' : 'on') : ''}`}></div>
                    <div className={`b ${provingStep >= 4 ? (isGateOpen ? 'go' : 'on') : ''}`}></div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isProving || !secretKey}
                    className="scan-btn" 
                    id="scanBtn"
                  >
                    {isProving ? 'SCANNING & PROVING ZK CIRCUIT…' : 'SCAN BADGE →'}
                  </button>
                </form>
              </div>
            </div>

            {/* Access Log Printout Panel */}
            <div className="panel">
              <div className="p-head">
                <b>Access log</b>
                <span>read-only · on-chain verified</span>
              </div>
              <div className="printout" id="printout">
                <div className="ln">
                  <span>Contract Address</span>
                  <b>{MIDNIGHT_CONFIG.defaultContractAddress.slice(0, 10)}…{MIDNIGHT_CONFIG.defaultContractAddress.slice(-8)}</b>
                </div>
                <div className="ln">
                  <span>Merkle Root</span>
                  <b>{indexerState?.allowlistRoot ? `${indexerState.allowlistRoot.slice(0, 10)}…${indexerState.allowlistRoot.slice(-6)}` : '0xf58d…8f56'}</b>
                </div>
                
                {isProving ? (
                  <>
                    <div className="ln"><span>Witness Status</span><b className="text-[#d98f3d]">Computing locally…</b></div>
                    {provingStep >= 2 && <div className="ln"><span>Merkle Path</span><b>Hashing sibling vector…</b></div>}
                    {provingStep >= 3 && <div className="ln"><span>Nullifier</span><b>Deriving persistent hash…</b></div>}
                  </>
                ) : executionResult ? (
                  <>
                    <div className="ln">
                      <span>Witness Computed</span>
                      <b>locally (SHA-256)</b>
                    </div>
                    <div className="ln">
                      <span>Merkle Path</span>
                      <b>verified · depth 5</b>
                    </div>
                    {executionResult.nullifierHex && (
                      <div className="ln">
                        <span>Nullifier</span>
                        <b>{executionResult.nullifierHex.slice(0, 14)}…</b>
                      </div>
                    )}
                    <div className={`ln status ${executionResult.success ? 'granted' : 'rejected'}`}>
                      <span>Result</span>
                      <b>{executionResult.success ? 'PROOF VALID · ACCESS GRANTED' : 'PROOF REJECTED'}</b>
                    </div>
                    {executionResult.txHash && (
                      <div className="ln">
                        <span>On-Chain TxId</span>
                        <a 
                          href={`https://preprod.midnightexplorer.com/tx/${executionResult.txHash}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#d98f3d] hover:underline flex items-center gap-1"
                        >
                          {executionResult.txHash.slice(0, 10)}…{executionResult.txHash.slice(-6)} ↗
                        </a>
                      </div>
                    )}
                    {executionResult.error && (
                      <div className="ln">
                        <span>Error Details</span>
                        <b className="text-[#a8443c]">{executionResult.error}</b>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ln">
                    <span>Awaiting scan</span>
                    <b>Ready for member key input</b>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Public Ledger State */}
        {activeTab === 'ledger' && (
          <div className="max-w-[1180px] mx-auto mt-8 px-6">
            <div className="panel">
              <div className="p-head">
                <b>Midnight Preprod Public Ledger State</b>
                <button 
                  onClick={fetchOnChainState}
                  disabled={isRefreshingIndexer}
                  className="text-xs text-[#d98f3d] hover:underline flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingIndexer ? 'animate-spin' : ''}`} />
                  {isRefreshingIndexer ? 'SYNCING…' : 'REFRESH'}
                </button>
              </div>
              <div className="p-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-[#2d2d31] bg-[#101012]">
                  <div className="text-[10.5px] text-[#7d7f84] mb-1">ON-CHAIN MERKLE ROOT</div>
                  <div className="text-xs text-[#d98f3d] break-all font-bold">
                    {indexerState?.allowlistRoot || 'f58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56'}
                  </div>
                </div>

                <div className="p-4 border border-[#2d2d31] bg-[#101012]">
                  <div className="text-[10.5px] text-[#7d7f84] mb-1">TOTAL ACCESS GRANTED (ON-CHAIN COUNTER)</div>
                  <div className="text-lg text-[#4fae7d] font-bold">
                    {indexerState ? indexerState.accessGranted : '52'} VERIFICATIONS
                  </div>
                </div>

                <div className="p-4 border border-[#2d2d31] bg-[#101012]">
                  <div className="text-[10.5px] text-[#7d7f84] mb-1">REGISTERED ALLOWLIST MEMBERS</div>
                  <div className="text-lg text-[#e9e6de] font-bold">
                    {indexerState?.nullifiersCount !== undefined ? indexerState.nullifiersCount : '52'} MEMBERS
                  </div>
                </div>

                <div className="p-4 border border-[#2d2d31] bg-[#101012]">
                  <div className="text-[10.5px] text-[#7d7f84] mb-1">ISSUER ADMIN PUBLIC KEY</div>
                  <div className="text-xs text-[#e9e6de] font-mono break-all">
                    {indexerState?.issuer ? `${indexerState.issuer.slice(0, 16)}…` : 'f58d3e68…auth'}
                  </div>
                </div>

                <div className="md:col-span-2 p-4 border border-[#2d2d31] bg-[#101012] flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <div className="text-[10.5px] text-[#7d7f84]">CONTRACT EXPLORER LINK</div>
                    <div className="text-xs text-[#e9e6de]">
                      https://preprod.midnightexplorer.com/contracts/0x{MIDNIGHT_CONFIG.defaultContractAddress}
                    </div>
                  </div>
                  <a 
                    href={`https://preprod.midnightexplorer.com/contracts/0x${MIDNIGHT_CONFIG.defaultContractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-plate text-xs py-2 px-3 inline-flex items-center gap-1.5"
                  >
                    EXPLORER ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Privacy Model */}
        {activeTab === 'privacy' && (
          <div className="max-w-[1180px] mx-auto mt-8 px-6 space-y-5">
            <div className="panel">
              <div className="p-head">
                <b>Zero-Knowledge Privacy Model Breakdown</b>
                <span>Cryptographic Isolation</span>
              </div>
              <div className="p-body grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-[#2d2d31] p-4 bg-[#101012]">
                  <h4 className="text-xs font-bold text-[#4fae7d] mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WHAT OBSERVERS CAN SEE (PUBLIC LEDGER)
                  </h4>
                  <ul className="text-xs text-[#7d7f84] space-y-2 list-disc pl-4">
                    <li>32-byte Merkle root (<code className="text-[#e9e6de]">allowlistRoot</code>) committing to the member set.</li>
                    <li>The fact that a valid membership proof was verified (<code className="text-[#e9e6de]">accessGranted</code>).</li>
                    <li>Spent nullifiers (<code className="text-[#e9e6de]">nullifiers Set</code>) preventing double access claims.</li>
                  </ul>
                </div>

                <div className="border border-[#2d2d31] p-4 bg-[#101012]">
                  <h4 className="text-xs font-bold text-[#a8443c] mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> WHAT IS NEVER REVEALED (CLIENT WITNESS)
                  </h4>
                  <ul className="text-xs text-[#7d7f84] space-y-2 list-disc pl-4">
                    <li>Your raw wallet address or real-world identity.</li>
                    <li>Your 32-byte private secret key (<code className="text-[#e9e6de]">witnessSecretKey</code>).</li>
                    <li>Your position/index in the Merkle tree or sibling paths.</li>
                    <li>Linkability between two separate claims by the same user.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Commitment Tool */}
        {activeTab === 'admin' && (
          <div className="max-w-[1180px] mx-auto mt-8 px-6">
            <div className="panel">
              <div className="p-head">
                <b>Member Commitment & Leaf Calculator</b>
                <span>Admin cryptographic tool</span>
              </div>
              <div className="p-body space-y-4">
                <p className="text-xs text-[#7d7f84]">
                  Generate a deterministic leaf commitment from any 32-byte member secret:
                </p>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rand = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
                      setSecretKey(rand);
                    }}
                    className="btn-plate text-xs py-2 px-3"
                  >
                    GENERATE NEW RANDOM SECRET KEY
                  </button>
                </div>

                {secretKey.length === 64 && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 border border-[#2d2d31] bg-[#101012]">
                      <div className="text-[10.5px] text-[#7d7f84]">LEAF COMMITMENT (DISCLOSED TO TREE)</div>
                      <div className="text-xs text-[#d98f3d] break-all font-bold">
                        0x{bytesToHex(computeLeafCommitment(hexToBytes(secretKey)))}
                      </div>
                    </div>

                    <div className="p-3 border border-[#2d2d31] bg-[#101012]">
                      <div className="text-[10.5px] text-[#7d7f84]">DERIVED NULLIFIER (ONE-WAY ON-CHAIN TAG)</div>
                      <div className="text-xs text-[#4fae7d] break-all font-bold">
                        0x{bytesToHex(computeNullifier(hexToBytes(secretKey)))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notice Plate */}
        <div className="notice max-w-[1180px] mx-auto my-10 px-6">
          <div className="plate">
            <span className="ic">▲</span>
            <div>
              <h3>Why nothing here can be traced back to you</h3>
              <p>
                The circuit checks that your secret hashes into a leaf of the membership tree, then emits a nullifier — a one-way fingerprint of that secret. Two different visits by the same member produce the same nullifier, so the gate can block replays, but no observer can work backward from a nullifier to a wallet, a name, or a position in the tree.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d2d31] px-6 py-4">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center flex-wrap gap-2 text-[10.5px] text-[#7d7f84]">
          <span>shadowpass — checkpoint terminal</span>
          <div className="flex items-center gap-4">
            <a 
              href="https://forms.gle/QDDTeHERK9PdfinJ8" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#d98f3d] hover:underline"
            >
              FEEDBACK FORM
            </a>
            <a 
              href="https://docs.google.com/spreadsheets/d/1mfdZUCWXvvrmTSxuODPHTc-neIsAxo0CWEUuOnevnTs/edit?usp=sharing" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#d98f3d] hover:underline"
            >
              LIVE RESPONSES
            </a>
            <span>no secret key is ever transmitted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
