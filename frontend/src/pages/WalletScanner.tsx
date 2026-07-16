import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/navigation/navbar';
import Footer from '@/components/navigation/footer';
import MaxWidthWrapper from '@/components/helpers/max-width-wrapper';
import AnimationContainer from '@/components/helpers/animation-container';
import { apiFetch } from '@/utils/api';
import { validateWalletAddress, getNetworkName } from '@/utils/walletValidation';
import { Shield, AlertTriangle, ChevronDown, ExternalLink, Copy, Check, RotateCcw } from 'lucide-react';
import RecoveryLeadModal from '@/components/RecoveryLeadModal';
import PhoneInput from '@/components/PhoneInput';
import { useClarityTracking } from '@/hooks/useClarityTracking';
import { ScannerInputCard } from '@/components/ScannerInputCard';
import { LiveScanningTicker } from '@/components/LiveScanningTicker';
import { Lock, EyeOff, Star } from 'lucide-react';
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
  { key: 'btc', label: 'Bitcoin', short: 'BTC', placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', color: '#f7931a', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg' },
  { key: 'eth', label: 'Ethereum', short: 'ETH', placeholder: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', color: '#627eea', icon: '/assets/crypto-logos/ethereum-eth-logo.svg' },
  { key: 'tron', label: 'Tron', short: 'TRX', placeholder: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH', color: '#eb0029', icon: '/assets/crypto-logos/tron-trx-logo.svg' },
  { key: 'usdtErc20', label: 'USDT (ERC-20)', short: 'USDT', placeholder: '0xdAC17F958D2ee523a2206206994597C13D831ec7', color: '#26a17b', icon: '/assets/crypto-logos/tether-usdt-logo.svg' },
  { key: 'sol', label: 'Solana', short: 'SOL', placeholder: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', color: '#9945ff', icon: '/assets/crypto-logos/solana-sol-logo.svg' },
  { key: 'bnb', label: 'BNB (BSC)', short: 'BNB', placeholder: '0x8894E0a0c962CB723c1ef41B18296659F45a328', color: '#f0b90b', icon: '/assets/crypto-logos/bnb-bnb-logo.svg' },
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

// ─── Phone Validation ───────────────────────────────────────────

const validatePhone = (raw: string): { valid: boolean; error: string | null } => {
  const digits = raw.replace(/\D/g, '');
  if (!raw.trim()) return { valid: false, error: 'Phone number is required' };
  if (digits.length < 7) return { valid: false, error: 'Too short — enter a full phone number' };
  if (digits.length > 15) return { valid: false, error: 'Too long — max 15 digits (E.164)' };
  // Reject obviously fake numbers (all same digit)
  if (/^(\d)\1+$/.test(digits)) return { valid: false, error: 'Enter a real phone number' };
  return { valid: true, error: null };
};

// ─── Popup Lead Form (embedded inside bottom sheet) ──────────────────────────

interface PopupLeadFormProps {
  walletAddress: string;
  network: string;
  threatIndex: number;
  severity: string;
  balance: number;
  currency: string;
  color: string;
  isRisky: boolean;
  countdown: { hours: number; minutes: number; seconds: number };
  isOpen: boolean;
  onSuccess: () => void;
  onRegister: () => void;
}

const PopupLeadForm: React.FC<PopupLeadFormProps> = ({
  walletAddress, network, threatIndex, severity, balance, currency,
  color, isRisky, countdown, isOpen, onSuccess, onRegister
}) => {
  const [searchParams] = useSearchParams();
  const subid = searchParams.get('subid');
  const [phone, setPhone] = useState('');
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp'>('telegram');
  const [contactHandle, setContactHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  const phoneValidation = validatePhone(phone);
  const showPhoneError = phoneBlurred && !phoneValidation.valid && phone.length > 0;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => phoneRef.current?.focus(), 400); // Wait for slide up animation
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneBlurred(true);
    const pv = validatePhone(phone);
    if (!pv.valid) { setError(pv.error); return; }
    setIsSubmitting(true);
    try {
      const body: Record<string, any> = { walletAddress, network, phone: phone.trim(), threatIndex, severity, balance, currency, subid };
      if (contactHandle.trim()) body[contactMethod] = contactHandle.trim();
      const res = await apiFetch('/scanner-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) setSubmitted(true);
      else setError(json.message || 'Something went wrong. Try again.');
    } catch {
      setError('Connection error. Check your internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Threat ring geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = threatIndex / 100;
  const dashOffset = circumference * (1 - fillRatio);

  if (submitted) {
    return (
      <div style={{ animation: 'popupFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div className="flex flex-col sm:flex-row items-start gap-8">
          {/* Success mark */}
          <div className="flex-shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="34" stroke={color} strokeWidth="1.5" opacity="0.15" />
              <circle cx="36" cy="36" r="34" stroke={color} strokeWidth="1.5"
                strokeDasharray={`${2 * Math.PI * 34}`}
                style={{ animation: 'ringFill 0.6s cubic-bezier(0.16,1,0.3,1) forwards', strokeDashoffset: `${2 * Math.PI * 34}` }}
                strokeLinecap="round"
              />
              <path d="M23 36.5L31.5 45L49 27" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'checkDraw 0.4s 0.3s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-2" style={{ color }}>Case created</p>
            <h3 className="text-[22px] font-semibold text-white tracking-tight leading-snug mb-2">We'll be in touch within 2 hours</h3>
            <p className="text-[14px] text-gray-500 leading-relaxed max-w-sm">
              Your case is with our forensic team. Expect a call or message from a specialist shortly.
            </p>

            <div className="mt-6 pt-5 border-t border-white/[0.05]">
              <p className="text-[12px] text-gray-500 mb-4">
                <span style={{ color }} className="font-medium">Registered users get priority</span> — personal dashboard, 2h response vs 48h standard.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-black transition-all duration-200"
                  style={{ background: color }}
                >
                  Create Free Account
                </Link>
                <button onClick={onSuccess} className="text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h2 className="text-[26px] sm:text-[30px] font-bold text-white tracking-[-0.03em] leading-[1.1] mb-2">
          {isRisky
            ? <>Your wallet has exposure.<br /><span style={{ color }}>Let's trace and recover it.</span></>
            : <>Leave your details<br /><span style={{ color }}>we'll reach out for free.</span></>}
        </h2>
        <p className="text-[14px] text-gray-500 max-w-lg leading-relaxed">
          {isRisky
            ? 'Our forensic team will contact you with a full breakdown of flagged activity and available recovery paths.'
            : 'Get instant alerts the moment this wallet interacts with a mixer, scam cluster, or flagged address.'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

        {/* Left briefing panel */}
        <div className="flex-shrink-0 lg:w-[220px] w-full">
          {/* Threat ring */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative flex-shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88" fill="none" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r={radius} stroke="rgba(255,255,255,0.04)" strokeWidth="6" fill="none" />
                <circle
                  cx="44" cy="44" r={radius}
                  stroke={color}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    filter: `drop-shadow(0 0 8px ${color}60)`,
                    transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color }}>{threatIndex}</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">/ 100</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Threat Score</p>
              <p className="text-[16px] font-semibold text-white capitalize">{severity}</p>
              <p className="text-[11px] font-mono text-gray-600 mt-1">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </p>
            </div>
          </div>

          {/* What you get */}
          <div className="space-y-3">
            {[
              isRisky
                ? { label: 'Transaction trace', sub: 'We map every flagged hop' }
                : { label: '24/7 monitoring', sub: 'Real-time threat alerts' },
              { label: 'Free assessment', sub: 'No payment, ever' },
              { label: '2h response', sub: 'Avg. specialist contact time' },
            ].map(({ label, sub }, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-[3px] w-3.5 h-3.5 flex-shrink-0" style={{ color }}>
                  <svg viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-[13px] font-medium text-gray-200">{label}</p>
                  <p className="text-[11px] text-gray-600">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown for risky */}
          {isRisky && (
            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Window closes</p>
              <p className="text-[20px] font-mono font-bold tabular-nums" style={{ color }}>
                {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </p>
            </div>
          )}

          {/* Social proof */}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: color }} />
            <span>12 people requested analysis this hour</span>
          </div>
        </div>

        {/* Vertical divider — desktop only */}
        <div className="hidden lg:block w-px self-stretch" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Right: form */}
        <div className="flex-1 w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div>
              <label htmlFor="popup-phone" className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] font-medium text-gray-300">Phone number</span>
                <span className="text-[11px] text-gray-600">required</span>
              </label>
              <PhoneInput
                id="popup-phone"
                inputRef={phoneRef}
                onFullNumberChange={(full) => { setPhone(full); setError(null); }}
                onFocus={() => { }}
                onBlur={() => setPhoneBlurred(true)}
                isValid={phoneValidation.valid}
                showError={showPhoneError}
                color={color}
                defaultCountry="GB"
              />
              {showPhoneError && (
                <p className="text-[12px] text-red-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  {phoneValidation.error}
                </p>
              )}
            </div>

            {/* Messenger */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] font-medium text-gray-300">Messenger handle</span>
                <span className="text-[11px] text-gray-600">optional</span>
              </div>
              {/* Toggle */}
              <div
                className="flex rounded-lg p-0.5 mb-3 w-fit"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {(['telegram', 'whatsapp'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setContactMethod(m)}
                    className="px-4 py-1.5 text-[12px] font-medium capitalize rounded-md transition-all duration-200"
                    style={{
                      background: contactMethod === m ? color : 'transparent',
                      color: contactMethod === m ? '#000' : '#6b7280',
                      fontWeight: contactMethod === m ? 600 : 400,
                    }}
                  >
                    {m === 'telegram' ? 'Telegram' : 'WhatsApp'}
                  </button>
                ))}
              </div>
              <input
                id="popup-handle"
                type="text"
                value={contactHandle}
                onChange={(e) => setContactHandle(e.target.value)}
                onFocus={() => setHandleFocused(true)}
                onBlur={() => setHandleFocused(false)}
                placeholder={contactMethod === 'telegram' ? '@username' : '+1 555 000 0000'}
                className="w-full bg-white/[0.03] border rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-gray-700 focus:outline-none transition-all duration-200"
                style={{
                  borderColor: handleFocused ? `${color}60` : 'rgba(255,255,255,0.08)',
                  boxShadow: handleFocused ? `0 0 0 4px ${color}12, inset 0 0 0 1px ${color}30` : 'none',
                }}
                autoComplete="off"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-[15px] font-bold tracking-wide text-black transition-all duration-200 disabled:opacity-50"
              style={{
                background: color,
                boxShadow: isSubmitting ? 'none' : `0 8px 32px ${color}35, 0 2px 8px ${color}20`,
              }}
              onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                isRisky ? 'Request Free Recovery Analysis' : 'Activate Free Monitoring'
              )}
            </button>

            <p className="text-center text-[11px] text-gray-700">Encrypted · Free forever · No commitment</p>
          </form>
        </div>
      </div>
    </>
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

  // ── Recovery CTA / Lead Modal state ──
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 43, seconds: 12 });

  // Countdown timer (cosmetic urgency — resets each visit)
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-trigger popup 4s after results appear (only once per scan)
  useEffect(() => {
    if (!resultsVisible || popupDismissed) return;
    const t = setTimeout(() => setShowPopup(true), 4000);
    return () => clearTimeout(t);
  }, [resultsVisible]);

  // Reset popup state on new scan
  useEffect(() => {
    if (scanState === 'input') {
      setShowPopup(false);
      setPopupDismissed(false);
    }
  }, [scanState]);

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

  // Focus input on mount (disabled for mobile compatibility)
  // Auto-focus without user gesture prevents keyboard from opening on iOS and causes confusion
  // useEffect(() => {
  //   setTimeout(() => inputRef.current?.focus(), 300);
  // }, []);

  const { event: clarityEvent, tag: clarityTag } = useClarityTracking();

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

    // Track: scan initiated
    clarityEvent('wallet_scan_started');
    clarityTag('scan_network', selectedNetwork.key);

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

        // Track: scan succeeded — tag with highest severity found
        const findings: Array<{ severity: string }> = json.data?.findings ?? [];
        const severities = findings.map((f) => f.severity);
        const highestSeverity = severities.includes('CRIT') ? 'CRIT'
          : severities.includes('HIGH') ? 'HIGH'
            : severities.includes('LOW') ? 'LOW'
              : severities.includes('INFO') ? 'INFO'
                : 'NONE';
        clarityEvent('wallet_scan_success');
        clarityTag('scan_highest_severity', highestSeverity);
        clarityTag('scan_findings_count', String(findings.length));

        // Final beat before revealing results
        await new Promise(resolve => setTimeout(resolve, 600));
        setScanState('results');
        // Stagger the results appearance
        setTimeout(() => {
          setResultsVisible(true);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }, 50);
      } else {
        clarityEvent('wallet_scan_failed');
        setScanError(json.message || 'Scan failed. Please check the address and try again.');
        setScanState('input');
      }
    } catch {
      clarityEvent('wallet_scan_network_error');
      setScanError('Network error — could not reach the scanner. Please check your connection and try again.');
      setScanState('input');
    }
  }, [address, selectedNetwork, clarityEvent, clarityTag]);

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
      <div className="pointer-events-none absolute -z-10 inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.085)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-100 h-full" />
      {/* Scanner sweep effect — position driven by JS for sync */}
      <div className="scanner-sweep-container">
        <div ref={sweepLineRef} className="scanner-sweep-line" />
      </div>
      <LiveScanningTicker />
      <Navbar />
      <main className="overflow-x-hidden scrollbar-hide size-full mt-4 sm:mt-10 min-h-[120vh]">
        <MaxWidthWrapper>

          {/* ── Hero / Input Section ─────────────────────────────────── */}
          <AnimationContainer className="flex flex-col items-center justify-center w-full text-center pt-4 sm:pt-10 pb-4">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black mb-5 sm:mb-6">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] sm:text-xs font-medium text-emerald-400/90 tracking-wide">100% Free & Secure Scanner</span>
            </div>
            <h1 className="text-foreground text-center text-3xl min-[360px]:text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight sm:tracking-normal text-balance !leading-[1.2] sm:!leading-[1.15] font-heading">
              Uncover the truth behind<br className="sm:hidden" />{' '}
              <span className="text-emerald-500/90">any crypto wallet.</span>
            </h1>
            <p className="mt-3 sm:mt-4 mb-6 text-sm md:text-base lg:text-lg tracking-tight text-gray-400 max-w-lg text-balance px-2 sm:px-0">
              Did you send crypto to a fraudulent platform or scammer?
              <br className="hidden sm:block"/> Track exactly where your funds went and find out if they are recoverable.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mb-8 sm:mb-10 text-[11px] sm:text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                256-bit Encrypted
              </div>
              <div className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                100% Confidential
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                4.8/5 Avg Rating
              </div>
            </div>
          </AnimationContainer>

          {/* ── Input Card ─────────────────────────────────────────── */}
          <AnimationContainer delay={0.15} className="w-full max-w-2xl mx-auto mb-10">
            <ScannerInputCard
              address={address}
              setAddress={setAddress}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
              scanState={scanState}
              handleScan={handleScan}
              handleReset={handleReset}
              validationError={validationError}
              setValidationError={setValidationError}
              scanError={scanError}
              setScanError={setScanError}
              networks={NETWORKS}
              sweepGlow={sweepGlow}
              clarityEvent={clarityEvent}
              inputCardRef={inputCardRef}
              inputRef={inputRef}
            />
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
                          className={`flex items-center gap-3 py-1.5 px-3 rounded-lg transition-all duration-300 ${!isVisible ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
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
                          <span className={`text-sm transition-colors duration-300 ${isCompleted ? 'text-gray-400' : isCurrent ? 'text-white' : 'text-gray-600'
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
              className={`w-full max-w-3xl mx-auto pb-20 space-y-4 transition-all duration-500 ease-out ${resultsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
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
                    <p className={`text-base font-semibold ${(stat as any).accent ? 'text-red-400' : 'text-white'
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
                          className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/[0.02] transition-colors ${tx.status === 'FLAGGED' ? 'bg-red-500/[0.03]' : ''
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
                            <span className={`text-[10px] font-semibold ${tx.type === 'in' ? 'text-emerald-400' : tx.type === 'out' ? 'text-red-400' : 'text-gray-600'
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

          {/* ── Minimal fallback bar (only after popup dismissed) ─── */}
          {scanState === 'results' && scanResult && popupDismissed && (() => {
            const ctaColor = { clear: '#22c55e', low: '#eab308', moderate: '#f97316', critical: '#ef4444' }[scanResult.severity] || '#22c55e';
            return (
              <div className={`w-full max-w-3xl mx-auto mt-4 mb-10 transition-all duration-500 ${resultsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center justify-between py-4 border-t border-white/[0.05]">
                  <p className="text-[13px] text-gray-500">
                    Want a Free Recovery Consultation for this wallet?
                  </p>
                  <button
                    onClick={() => { clarityEvent('recovery_cta_clicked'); setPopupDismissed(false); setShowPopup(true); }}
                    className="text-[13px] font-medium transition-colors flex-shrink-0 ml-4"
                    style={{ color: ctaColor }}
                  >
                    Request analysis →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Recovery Lead Modal (for register flow from popup) */}
          {scanResult && (
            <RecoveryLeadModal
              isOpen={showLeadModal}
              onClose={() => setShowLeadModal(false)}
              walletAddress={scanResult.address}
              network={selectedNetwork.key}
              networkName={scanResult.networkName}
              threatIndex={scanResult.threatIndex}
              severity={scanResult.severity}
              balance={scanResult.balance}
              currency={scanResult.currency}
            />
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

      {/* ── Auto-triggered bottom sheet popup ──────────────────────── */}
      {scanResult && (() => {
        const sheetColor: Record<string, string> = {
          clear: '#22c55e', low: '#eab308', moderate: '#f97316', critical: '#ef4444'
        };
        const color = sheetColor[scanResult.severity] || '#22c55e';
        const isRisky = scanResult.threatIndex > 25;

        return (
          <>
            <style>{`
              @keyframes popupFadeUp {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes ringFill {
                to { stroke-dashoffset: 0; }
              }
              @keyframes ringFill {
                to { stroke-dashoffset: 0; }
              }
              @keyframes checkDraw {
                to { opacity: 1; }
              }
            `}</style>

            {/* Overlay */}
            <div
              className="fixed inset-0 z-[80]"
              style={{
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(3px)',
                opacity: showPopup ? 1 : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: showPopup ? 'auto' : 'none',
              }}
              onClick={() => { setShowPopup(false); setPopupDismissed(true); }}
            />

            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[90]"
              style={{
                transform: showPopup ? 'translateY(0)' : 'translateY(110%)',
                transition: showPopup
                  ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'transform 0.35s cubic-bezier(0.7, 0, 0.84, 0)',
                pointerEvents: showPopup ? 'auto' : 'none',
              }}
            >
              {/* Color bar — full width, solid not gradient */}
              <div className="h-[3px]" style={{ background: color }} />

              <div
                className="border-t border-white/[0.05] px-5 sm:px-8 lg:px-10 pt-6 pb-8 sm:pb-10 overflow-y-auto"
                style={{ background: '#0e0e0e', maxHeight: '85vh' }}
              >
                {/* Top bar: dismiss */}
                <div className="flex items-center justify-between mb-7 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-2 py-1 rounded"
                      style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}
                    >
                      {isRisky ? '◈ Recovery' : '◎ Monitoring'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: color }} />
                      12 people requested this hour
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowPopup(false); setPopupDismissed(true); }}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-200 transition-all duration-150 rounded-lg hover:bg-white/[0.05] flex-shrink-0"
                    aria-label="Close"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Main content */}
                <div className="max-w-4xl mx-auto">
                  <PopupLeadForm
                    walletAddress={scanResult.address}
                    network={selectedNetwork.key}
                    threatIndex={scanResult.threatIndex}
                    severity={scanResult.severity}
                    balance={scanResult.balance}
                    currency={scanResult.currency}
                    color={color}
                    isRisky={isRisky}
                    countdown={countdown}
                    isOpen={showPopup}
                    onSuccess={() => { setShowPopup(false); setPopupDismissed(true); }}
                    onRegister={() => { clarityEvent('recovery_modal_opened'); setShowPopup(false); setShowLeadModal(true); }}
                  />
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
};

export default WalletScanner;
