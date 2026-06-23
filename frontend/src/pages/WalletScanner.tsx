import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/navigation/navbar';
import Footer from '@/components/navigation/footer';
import MaxWidthWrapper from '@/components/helpers/max-width-wrapper';
import AnimationContainer from '@/components/helpers/animation-container';
import { apiFetch } from '@/utils/api';
import { validateWalletAddress, getNetworkName } from '@/utils/walletValidation';
import { Shield, AlertTriangle, ChevronDown, ExternalLink, Copy, Check, RotateCcw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScanTransaction {
  hash: string;
  date: string;
  amount: number;
  type: 'in' | 'out' | 'unknown';
  explorerUrl: string;
  status: 'ok' | 'FLAGGED';
  reason: string | null;
}

interface ScanFinding {
  severity: 'INFO' | 'LOW' | 'HIGH' | 'CRIT';
  title: string;
  description: string;
}

interface ScanResult {
  address: string;
  network: string;
  networkName: string;
  currency: string;
  scanTimestamp: string;
  balance: number;
  transactionCount: number;
  lastActive: string | null;
  threatIndex: number;
  severity: string;
  severityLabel: string;
  dustCount: number;
  flaggedCount: number;
  transactions: ScanTransaction[];
  findings: ScanFinding[];
  error: string | null;
}

type ScanState = 'input' | 'scanning' | 'results';

// ─── Network config ──────────────────────────────────────────────────────────

const NETWORKS = [
  { key: 'btc', label: 'Bitcoin', short: 'BTC', placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', color: '#f7931a' },
  { key: 'eth', label: 'Ethereum', short: 'ETH', placeholder: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', color: '#627eea' },
  { key: 'tron', label: 'Tron', short: 'TRX', placeholder: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH', color: '#eb0029' },
  { key: 'usdtErc20', label: 'USDT (ERC-20)', short: 'USDT', placeholder: '0xdAC17F958D2ee523a2206206994597C13D831ec7', color: '#26a17b' },
  { key: 'sol', label: 'Solana', short: 'SOL', placeholder: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', color: '#9945ff' },
  { key: 'bnb', label: 'BNB (BSC)', short: 'BNB', placeholder: '0x8894E0a0c962CB723c1ef41B18296659F45a328', color: '#f0b90b' },
];

// ─── Scan steps ──────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  { text: 'Resolving address & network records', icon: '◎' },
  { text: 'Pulling balance & transaction ledger', icon: '⬡' },
  { text: 'Tracing token transfer graph', icon: '◇' },
  { text: 'Cross-referencing watchlists', icon: '⊘' },
  { text: 'Matching known mixers & exploit clusters', icon: '⬢' },
  { text: 'Detecting dust & address poisoning', icon: '◈' },
  { text: 'Computing threat index', icon: '△' },
];

// ─── Helper components ───────────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    INFO: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    LOW: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    CRIT: 'text-red-400 bg-red-500/10 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border rounded ${colors[severity] || colors.INFO}`}>
      {severity}
    </span>
  );
};

const ThreatBar: React.FC<{ value: number; severity: string; animate?: boolean }> = ({ value, severity, animate = true }) => {
  const colorMap: Record<string, string> = {
    clear: '#22c55e',
    low: '#eab308',
    moderate: '#f97316',
    critical: '#ef4444',
  };
  const color = colorMap[severity] || '#22c55e';
  const segments = 40;
  const filled = Math.round((value / 100) * segments);

  return (
    <div className="flex gap-[2px] mt-3" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 flex-1 rounded-sm"
          style={{
            backgroundColor: i < filled ? color : 'rgba(255,255,255,0.04)',
            boxShadow: i < filled ? `0 0 8px ${color}30` : 'none',
            opacity: animate ? undefined : 1,
            transition: animate ? `background-color 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out` : 'none',
            transitionDelay: animate ? `${i * 25}ms` : '0ms',
          }}
        />
      ))}
    </div>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="text-gray-500 hover:text-white transition-colors flex-shrink-0 p-1 -m-1 rounded"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const WalletScanner: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>('input');
  const [address, setAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [scanProgress, setScanProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resultsVisible, setResultsVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const sweepLineRef = useRef<HTMLDivElement>(null);
  const [sweepGlow, setSweepGlow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNetworkDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Elapsed timer during scanning
  useEffect(() => {
    if (scanState === 'scanning') {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedMs(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [scanState]);

  // Sweep — single JS loop drives both the line position and the card glow
  useEffect(() => {
    const DURATION = 8000;
    let rafId: number;
    let start: number | null = null;

    const tick = (now: number) => {
      if (!start) start = now;
      const progress = ((now - start) % DURATION) / DURATION; // 0..1

      // Move the sweep line
      const sweep = sweepLineRef.current;
      const container = sweep?.parentElement;
      if (sweep && container) {
        const containerH = container.offsetHeight;
        const lineH = 120;
        const y = -lineH + progress * (containerH + lineH);
        sweep.style.transform = `translateY(${y}px)`;

        // Check overlap with input card
        const card = inputCardRef.current;
        if (card) {
          const containerRect = container.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const sweepTopAbs = containerRect.top + y;
          const sweepBottomAbs = sweepTopAbs + lineH;
          const isOverlapping = sweepBottomAbs > cardRect.top && sweepTopAbs < cardRect.bottom;
          setSweepGlow(isOverlapping);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Auto-detect network from address format
  useEffect(() => {
    if (!address.trim()) return;
    const a = address.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(a)) {
      if (!['eth', 'usdtErc20', 'bnb'].includes(selectedNetwork.key)) {
        setSelectedNetwork(NETWORKS.find(n => n.key === 'eth')!);
      }
    } else if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a) || /^bc1[a-z0-9]{39,87}$/.test(a)) {
      setSelectedNetwork(NETWORKS.find(n => n.key === 'btc')!);
    } else if (/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(a)) {
      setSelectedNetwork(NETWORKS.find(n => n.key === 'tron')!);
    }
  }, [address]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleScan = useCallback(async () => {
    if (!address.trim()) {
      setValidationError('Please enter a wallet address');
      return;
    }

    const validation = validateWalletAddress(address.trim(), selectedNetwork.key);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid address');
      return;
    }

    setValidationError(null);
    setScanError(null);
    setScanState('scanning');
    setCompletedSteps([]);
    setCurrentStep(0);
    setScanProgress(0);
    setResultsVisible(false);

    // Start API call immediately
    const apiPromise = apiFetch(`/crypt/scan/${selectedNetwork.key}/${address.trim()}`).then(r => r.json());

    // Animate steps with smoother progress
    const stepDuration = 500;
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setCurrentStep(i);

      // Smooth progress fill within each step
      const baseProgress = (i / SCAN_STEPS.length) * 100;
      const stepProgress = ((i + 1) / SCAN_STEPS.length) * 100;
      const progressStart = baseProgress;

      // Fill progress smoothly over step duration
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          const next = prev + (stepProgress - progressStart) / 10;
          return Math.min(next, stepProgress);
        });
      }, stepDuration / 10);

      await new Promise(resolve => setTimeout(resolve, stepDuration));
      clearInterval(progressInterval);
      setScanProgress(stepProgress);
      setCompletedSteps(prev => [...prev, i]);
    }

    // Wait for API result
    try {
      const json = await apiPromise;
      if (json.success) {
        setScanResult(json.data);
        setScanProgress(100);
        // Final beat before revealing results
        await new Promise(resolve => setTimeout(resolve, 600));
        setScanState('results');
        // Stagger the results appearance
        setTimeout(() => {
          setResultsVisible(true);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }, 50);
      } else {
        setScanError(json.message || 'Scan failed. Please check the address and try again.');
        setScanState('input');
      }
    } catch {
      setScanError('Network error — could not reach the scanner. Please check your connection and try again.');
      setScanState('input');
    }
  }, [address, selectedNetwork]);

  const handleReset = () => {
    setScanState('input');
    setScanResult(null);
    setScanError(null);
    setCompletedSteps([]);
    setCurrentStep(-1);
    setScanProgress(0);
    setResultsVisible(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatBalance = (balance: number, currency: string) => {
    if (balance === 0) return `0 ${currency}`;
    if (balance < 0.000001) return `< 0.000001 ${currency}`;
    if (balance < 1) return `${balance.toFixed(6)} ${currency}`;
    if (balance < 1000) return `${balance.toFixed(4)} ${currency}`;
    return `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 10)}…${hash.substring(hash.length - 6)}`;
  };

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${s}.${tenths}s`;
  };

  const threatColorMap: Record<string, string> = {
    clear: '#22c55e',
    low: '#eab308',
    moderate: '#f97316',
    critical: '#ef4444',
  };

  const threatDirective: Record<string, string> = {
    clear: 'CLEAR',
    low: 'MONITOR',
    moderate: 'CAUTION',
    critical: 'DO NOT TRANSACT',
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-25 h-full" />
      {/* Scanner sweep effect — position driven by JS for sync */}
      <div className="scanner-sweep-container">
        <div ref={sweepLineRef} className="scanner-sweep-line" />
      </div>
      <Navbar />
      <main className="overflow-x-hidden scrollbar-hide size-full mt-20 min-h-screen">
        <MaxWidthWrapper>

          {/* ── Hero / Input Section ─────────────────────────────────── */}
          <AnimationContainer className="flex flex-col items-center justify-center w-full text-center pt-8 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-6">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-gray-400 tracking-wide">Wallet Forensics Scanner</span>
            </div>
            <h1 className="text-foreground text-center text-4xl sm:text-5xl md:text-6xl font-medium tracking-normal text-balance !leading-[1.15] font-heading">
              Scan any wallet.{' '}
              <span className="text-gray-500">Get the truth.</span>
            </h1>
            <p className="mt-4 mb-10 text-base md:text-lg tracking-tight text-muted-foreground max-w-lg text-balance">
              Real-time forensic analysis across {NETWORKS.length} blockchain networks.
              Balance, transactions, threat assessment — in seconds.
            </p>
          </AnimationContainer>

          {/* ── Input Card ─────────────────────────────────────────── */}
          <AnimationContainer delay={0.15} className="w-full max-w-2xl mx-auto mb-10">
            <div
              ref={inputCardRef}
              className={`rounded-2xl border bg-[#0a0a0a] p-5 sm:p-6 transition-all duration-500 ease-out ${
                sweepGlow
                  ? 'border-emerald-500/25 shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]'
                  : 'border-white/[0.08] shadow-none'
              }`}
            >

              {/* Network pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {NETWORKS.map(net => {
                  const isActive = selectedNetwork.key === net.key;
                  return (
                    <button
                      key={net.key}
                      onClick={() => {
                        setSelectedNetwork(net);
                        setValidationError(null);
                      }}
                      disabled={scanState === 'scanning'}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 disabled:opacity-40
                        ${isActive
                          ? 'text-white'
                          : 'bg-transparent border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                      style={isActive ? {
                        backgroundColor: `${net.color}15`,
                        borderColor: `${net.color}40`,
                        color: net.color,
                      } : undefined}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isActive ? net.color : 'currentColor', opacity: isActive ? 1 : 0.4 }}
                        />
                        {net.short}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Address input row */}
              <div className="flex gap-2.5">
                <div className="flex-1 relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={address}
                    onChange={e => {
                      setAddress(e.target.value);
                      setValidationError(null);
                      setScanError(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && scanState !== 'scanning' && handleScan()}
                    placeholder={`Paste ${selectedNetwork.label} address…`}
                    disabled={scanState === 'scanning'}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 disabled:opacity-40"
                  />
                  {address.trim() && scanState === 'input' && (
                    <button
                      onClick={() => { setAddress(''); setValidationError(null); setScanError(null); inputRef.current?.focus(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5"
                      aria-label="Clear address"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  )}
                </div>

                {/* Scan / Reset button */}
                <button
                  onClick={scanState === 'scanning' ? undefined : (scanState === 'results' ? handleReset : handleScan)}
                  disabled={scanState === 'scanning'}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 flex-shrink-0
                    ${scanState === 'results'
                      ? 'bg-white/[0.06] border border-white/10 text-gray-300 hover:bg-white/[0.1] hover:text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.97] shadow-lg shadow-emerald-600/20'
                    }`}
                >
                  {scanState === 'scanning' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Scanning
                    </>
                  ) : scanState === 'results' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      New Scan
                    </>
                  ) : (
                    'Scan Address'
                  )}
                </button>
              </div>

              {/* Validation / API error */}
              {(validationError || scanError) && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/10">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400">{validationError || scanError}</p>
                    {scanError && (
                      <button
                        onClick={handleScan}
                        className="text-xs text-red-400/70 hover:text-red-300 underline mt-1 transition-colors"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </AnimationContainer>

          {/* ── Scanning Animation ─────────────────────────────────── */}
          {scanState === 'scanning' && (
            <div className="w-full max-w-2xl mx-auto mb-12 scanner-fade-in">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">

                {/* Progress bar */}
                <div className="h-1 bg-white/[0.03]">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="p-5 sm:p-6">
                  {/* Status header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                          <circle
                            cx="16" cy="16" r="14" fill="none" stroke="#22c55e" strokeWidth="2"
                            strokeDasharray={`${scanProgress * 0.88} 88`}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                          />
                        </svg>
                        <span className="absolute text-[8px] font-mono font-bold text-emerald-400">
                          {Math.round(scanProgress)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Scanning wallet</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {truncateHash(address)} · {selectedNetwork.short}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-gray-500 tabular-nums">
                      {formatElapsed(elapsedMs)}
                    </span>
                  </div>

                  {/* Scan steps */}
                  <div className="space-y-1">
                    {SCAN_STEPS.map((step, i) => {
                      const isCompleted = completedSteps.includes(i);
                      const isCurrent = currentStep === i && !isCompleted;
                      const isVisible = i <= currentStep;

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 py-1.5 px-3 rounded-lg transition-all duration-300 ${
                            !isVisible ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                          } ${isCompleted ? '' : isCurrent ? 'bg-white/[0.02]' : ''}`}
                          style={{
                            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                          }}
                        >
                          {/* Status icon */}
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {isCompleted ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                <Check className="w-3 h-3 text-emerald-400" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-5 h-5 flex items-center justify-center">
                                <div className="w-4 h-4 border-[1.5px] border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                              </div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                            )}
                          </div>

                          {/* Step text */}
                          <span className={`text-sm transition-colors duration-300 ${
                            isCompleted ? 'text-gray-400' : isCurrent ? 'text-white' : 'text-gray-600'
                          }`}>
                            {step.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Results Dashboard ──────────────────────────────────── */}
          {scanState === 'results' && scanResult && (
            <div
              ref={resultRef}
              className={`w-full max-w-3xl mx-auto pb-20 space-y-4 transition-all duration-500 ease-out ${
                resultsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {/* Subject Header */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNetwork.color }} />
                    <span className="text-xs text-gray-500 font-medium">
                      {scanResult.networkName} · Mainnet
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-600 font-mono">
                    {new Date(scanResult.scanTimestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-sm sm:text-base font-mono font-semibold text-white break-all leading-snug">{scanResult.address}</code>
                  <CopyButton text={scanResult.address} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: `${threatColorMap[scanResult.severity]}cc` }}>
                  {scanResult.threatIndex <= 25
                    ? 'No high-risk associations detected. Normal activity profile with no links to known threats.'
                    : scanResult.threatIndex <= 50
                    ? 'Minor risk indicators detected. Some activity patterns warrant monitoring.'
                    : scanResult.threatIndex <= 75
                    ? 'Moderate risk detected. Suspicious activity patterns observed. Exercise caution.'
                    : 'Critical risk. Heavily exposed to high-risk activity. Do not send funds to this address.'}
                </p>
              </div>

              {/* Threat Index */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-5 sm:p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Threat Index</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: threatColorMap[scanResult.severity] }}>
                        {scanResult.threatIndex}
                      </span>
                      <span className="text-lg text-gray-600 font-medium">/100</span>
                    </div>
                  </div>
                  <div className="text-right mb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        color: threatColorMap[scanResult.severity],
                        borderColor: `${threatColorMap[scanResult.severity]}25`,
                        backgroundColor: `${threatColorMap[scanResult.severity]}08`,
                      }}
                    >
                      {threatDirective[scanResult.severity]}
                    </span>
                  </div>
                </div>
                <ThreatBar value={scanResult.threatIndex} severity={scanResult.severity} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Balance', value: formatBalance(scanResult.balance, scanResult.currency) },
                  { label: 'Transactions', value: scanResult.transactionCount.toLocaleString() },
                  { label: 'Flagged', value: String(scanResult.flaggedCount), accent: scanResult.flaggedCount > 0 },
                  {
                    label: 'Last Active',
                    value: scanResult.lastActive ? new Date(scanResult.lastActive).toLocaleDateString() : 'N/A',
                  },
                  { label: 'Dust / Spam', value: String(scanResult.dustCount) },
                  { label: 'Network', value: `${scanResult.currency} · ${scanResult.networkName}` },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-[11px] text-gray-500 font-medium mb-1">{stat.label}</p>
                    <p className={`text-base font-semibold ${
                      (stat as any).accent ? 'text-red-400' : 'text-white'
                    }`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Forensic Findings */}
              {scanResult.findings.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-3 px-1">Forensic Findings</p>
                  <div className="space-y-2">
                    {scanResult.findings.map((finding, i) => {
                      const accentColors: Record<string, string> = {
                        INFO: '#3b82f6',
                        LOW: '#eab308',
                        HIGH: '#f97316',
                        CRIT: '#ef4444',
                      };
                      const accent = accentColors[finding.severity] || '#3b82f6';
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                          style={{ borderLeftWidth: '3px', borderLeftColor: `${accent}40` }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <SeverityBadge severity={finding.severity} />
                            <span className="text-sm font-semibold text-white">{finding.title}</span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed pl-0.5">{finding.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transaction History */}
              {scanResult.transactions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-3 px-1">
                    Transaction History · {scanResult.transactions.length} recent
                  </p>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
                      <span className="col-span-4 text-[10px] text-gray-500 font-medium uppercase tracking-wider">Hash</span>
                      <span className="col-span-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider">Date</span>
                      <span className="col-span-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider text-right">Amount</span>
                      <span className="col-span-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider text-center">Flow</span>
                      <span className="col-span-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider text-right">Status</span>
                      <span className="col-span-1" />
                    </div>
                    {/* Table rows */}
                    <div className="divide-y divide-white/[0.03] max-h-80 overflow-y-auto">
                      {scanResult.transactions.map((tx, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/[0.02] transition-colors ${
                            tx.status === 'FLAGGED' ? 'bg-red-500/[0.03]' : ''
                          }`}
                        >
                          <div className="col-span-4 font-mono text-xs text-gray-300 truncate">
                            {truncateHash(tx.hash)}
                          </div>
                          <div className="col-span-2 text-[11px] text-gray-500">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : '—'}
                          </div>
                          <div className="col-span-2 font-mono text-xs text-right text-gray-300">
                            {tx.amount !== 0 ? Math.abs(tx.amount).toFixed(6) : '—'}
                          </div>
                          <div className="col-span-1 text-center">
                            <span className={`text-[10px] font-semibold ${
                              tx.type === 'in' ? 'text-emerald-400' : tx.type === 'out' ? 'text-red-400' : 'text-gray-600'
                            }`}>
                              {tx.type === 'in' ? 'IN' : tx.type === 'out' ? 'OUT' : '—'}
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            {tx.status === 'FLAGGED' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                Flagged
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-500/60">Clear</span>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {tx.explorerUrl && (
                              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-300 transition-colors p-1 -m-1 rounded">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </MaxWidthWrapper>

        {/* Footer disclaimer */}
        <div className="text-center py-8 border-t border-white/[0.04]">
          <p className="text-[11px] text-gray-600">
            CryptoFinders · Public-source intelligence · Not financial advice
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default WalletScanner;
