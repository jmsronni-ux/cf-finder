import React, { useState } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Hash,
  Plus,
  Trash2,
  Layers,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  GitBranch,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Gauge,
  Sliders,
} from 'lucide-react';

// ─── Config Maps ────────────────────────────────────────────────────────────

const currencyConfig: Record<string, { icon: string; color: string; bg: string }> = {
  BTC: { icon: '₿', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  ETH: { icon: 'Ξ', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/25' },
  SOL: { icon: '◎', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25' },
  USDT: { icon: '₮', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/25' },
  BNB: { icon: '◆', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
  TRX: { icon: '⟐', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/25' },
};

const statusOptions = [
  { value: 'Success', dot: 'bg-emerald-400', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  { value: 'Pending', dot: 'bg-yellow-400', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25' },
  { value: 'Fail', dot: 'bg-red-400', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  { value: 'Cold Wallet', dot: 'bg-blue-400', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  { value: 'Reported', dot: 'bg-orange-400', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25' },
];

const cryptoTypeOptions = [
  { code: 'BTC', label: 'Bitcoin', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg', activeBg: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  { code: 'ETH', label: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg', activeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { code: 'SOL', label: 'Solana', logo: '/assets/crypto-logos/solana-sol-logo.svg', activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
  { code: 'USDT', label: 'Tether', logo: '/assets/crypto-logos/tether-usdt-logo.svg', activeBg: 'bg-green-500/20 border-green-500/40 text-green-400' },
  { code: 'BNB', label: 'BNB', logo: '/assets/crypto-logos/bnb-bnb-logo.svg', activeBg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
  { code: 'TRX', label: 'TRX', logo: '/assets/crypto-logos/tron-trx-logo.svg', activeBg: 'bg-red-500/20 border-red-500/40 text-red-400' },
];

// ─── Shared Style Constants ─────────────────────────────────────────────────

const LABEL = 'block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider';
const INPUT = 'w-full bg-white/5 text-white pl-8 pr-2 py-1.5 rounded-lg border border-white/10 text-xs font-mono hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all focus:scale-[1.01] origin-left';
const INPUT_DISABLED = 'w-full bg-white/5 text-white pl-8 pr-2 py-1.5 rounded-lg border border-white/10 text-xs font-mono transition-all opacity-50 cursor-not-allowed';
const ICON_WRAP = 'absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500';
const PARAM_INPUT = 'w-full bg-white/5 text-white px-2 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono hover:border-white/20 focus:border-purple-500/50 focus:outline-none transition-all focus:scale-[1.01] origin-left';

// ─── Panel Animation ────────────────────────────────────────────────────────

const panelAnimation = `
  @keyframes dataVisualSlideIn {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .dv-slide-in {
    animation: dataVisualSlideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes dvFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dv-fade-in {
    animation: dvFadeIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: 0.06s;
    opacity: 0;
  }
`;

// ─── Reusable Sub-Components ────────────────────────────────────────────────

const FormField: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ label, icon, children, className = '' }) => (
  <div className={className}>
    <label className={LABEL}>{label}</label>
    <div className="relative">
      <div className={ICON_WRAP}>{icon}</div>
      {children}
    </div>
  </div>
);

/** Collapsible section with header — persists collapse state in sessionStorage */
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, badge, children }) => {
  const storageKey = `dv_section_${title.replace(/\s+/g, '_').toLowerCase()}`;
  const [open, setOpen] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) return stored === '1';
    } catch { /* ignore */ }
    return defaultOpen;
  });

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      try { sessionStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{title}</span>
          {badge && (
            <span className="text-[9px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">{badge}</span>
          )}
        </div>
        <ChevronRight
          size={11}
          className={`text-gray-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <div
        className="transition-all duration-200 ease-out overflow-hidden"
        style={{
          maxHeight: open ? '600px' : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-3 pb-2.5 pt-1 space-y-2">{children}</div>
      </div>
    </div>
  );
};

/** Colored action button */
const ActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  colorClass: string;
}> = ({ onClick, icon, label, colorClass }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-center gap-1.5 ${colorClass} px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97] active:translate-y-[1px]`}
  >
    {icon}
    {label}
  </button>
);

/** D-pad for picking edge handle direction */
const DPad: React.FC<{
  current: string;
  onChange: (v: string) => void;
  accentColor: string;
}> = ({ current, onChange, accentColor }) => {
  const btn = (dir: string, icon: React.ReactNode) => (
    <button
      onClick={() => onChange(dir)}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${current === dir
          ? `${accentColor} shadow-lg scale-110`
          : 'bg-white/5 border border-white/10 text-gray-600 hover:bg-white/10 hover:text-gray-400'
        }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-0.5">
      {btn('top', <ArrowUp size={10} />)}
      <div className="flex items-center gap-0.5">
        {btn('left', <ArrowLeft size={10} />)}
        <div className="w-6 h-6 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-center">
          <span className="text-[7px] text-gray-500 font-mono uppercase">{current.slice(0, 1)}</span>
        </div>
        {btn('right', <ArrowRight size={10} />)}
      </div>
      {btn('bottom', <ArrowDown size={10} />)}
    </div>
  );
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface DataVisualProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
  onClose: () => void;
  onAddChildNode?: (parentNodeId: string) => void;
  onAddGroupNode?: (parentNodeId: string) => void;
  onAddCryptoChildNode?: (parentNodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  canDelete?: boolean;
  isAdmin?: boolean;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const DataVisual: React.FC<DataVisualProps> = ({
  selectedNode,
  onUpdateNodeData,
  onClose,
  onAddChildNode,
  onAddGroupNode,
  onAddCryptoChildNode,
  onDeleteNode,
  canDelete = false,
  isAdmin = false,
}) => {
  if (!selectedNode) return null;

  const isFingerprintNode = selectedNode.type === 'fingerprintNode';
  const isGroupNode = selectedNode.type === 'fingerprintGroupNode';
  const isCryptoNode = selectedNode.type === 'cryptoNode';
  const isAnyNodeType = isFingerprintNode || isCryptoNode || isGroupNode;
  const tx = selectedNode.data.transaction;
  const currentCurrency = tx?.currency || 'BTC';
  const currentStatus = tx?.status || 'Success';
  const currInfo = currencyConfig[currentCurrency] || currencyConfig.BTC;
  const statusInfo = statusOptions.find(s => s.value === currentStatus) || statusOptions[0];
  const nodeLabel = isCryptoNode
    ? (cryptoTypeOptions.find(c => c.label === selectedNode.data.label)?.code || 'Crypto')
    : isFingerprintNode ? 'Fingerprint' : isGroupNode ? 'Group' : 'Node';

  const update = (data: any) => onUpdateNodeData(selectedNode.id, data);
  const updateTx = (fields: any) => update({ transaction: { ...tx, ...fields } });

  // Edge handles
  const targetPos = selectedNode.data.handles?.target?.position || 'left';
  const sourcePos = selectedNode.data.handles?.source?.position || 'right';
  const setHandlePos = (type: 'target' | 'source', value: string) => {
    const h = selectedNode.data.handles || { target: { position: 'left' }, source: { position: 'right' } };
    update({ handles: { ...h, [type]: { ...h[type], position: value } } });
  };

  // Success rate parsing — stored as "98%" string, we need the number
  const rawRate = selectedNode.data.successRate || '';
  const rateNum = parseInt(rawRate) || 0;
  const rateColor = rateNum >= 80 ? 'text-emerald-400' : rateNum >= 50 ? 'text-yellow-400' : 'text-red-400';
  const rateBg = rateNum >= 80 ? 'bg-emerald-400' : rateNum >= 50 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-[20rem] dv-slide-in">
      <style>{panelAnimation}</style>
      <div className="relative bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">


        {/* ── Compact Header ── */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${isCryptoNode ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
                : isGroupNode ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  : 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
              }`}>
              {nodeLabel[0]}
            </div>
            <div className="min-w-0">
              <h2 className="text-[11px] font-bold text-white leading-tight truncate">{selectedNode.data.label}</h2>
              <p className="text-[9px] text-gray-600 font-mono">{nodeLabel} · L{selectedNode.data.level || 1}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-gray-500 hover:text-white transition-all flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-hidden px-3.5 pb-3 space-y-2.5 dv-fade-in"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
        >

          {/* ══════════ Crypto Node — Network Selector ══════════ */}
          {isAdmin && isCryptoNode && (() => {
            const currentOpt = cryptoTypeOptions.find(c => c.label === selectedNode.data.label) || cryptoTypeOptions[0];
            return (
              <div>
                <label className={LABEL}>Network</label>
                <div className="grid grid-cols-3 gap-1">
                  {cryptoTypeOptions.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => update({ label: opt.label, logo: opt.logo })}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[10px] font-semibold transition-all ${opt.code === currentOpt.code
                          ? `${opt.activeBg} scale-[1.02]`
                          : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/8 hover:border-white/20'
                        }`}
                    >
                      <img src={opt.logo} alt={opt.code} className="w-3 h-3 object-contain" />
                      {opt.code}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ══════════ Node Properties Section ══════════ */}
          {isAdmin && isAnyNodeType && (
            <Section title="Properties" icon={<Sliders size={10} className="text-gray-500" />} defaultOpen={true}>
              {/* Level (all node types) */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-gray-500 w-14 flex-shrink-0">Level</label>
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4, 5].map((lv) => (
                    <button
                      key={lv}
                      onClick={() => update({ level: lv })}
                      className={`flex-1 h-6 rounded-md text-[10px] font-bold transition-all ${(selectedNode.data.level || 1) === lv
                          ? 'bg-purple-500/25 border border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border border-white/10 text-gray-600 hover:bg-white/10 hover:text-gray-400'
                        }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending (fingerprint only) */}
              {isFingerprintNode && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500 w-14 flex-shrink-0">Pending</label>
                  <div className="relative flex-1">
                    <div className={ICON_WRAP}><Clock size={10} /></div>
                    <input
                      type="number" min={0}
                      value={selectedNode.data.pending || 0}
                      onChange={(e) => update({ pending: parseInt(e.target.value) || 0 })}
                      className={INPUT}
                    />
                  </div>
                </div>
              )}

              {/* Success Rate slider (fingerprint only) */}
              {isFingerprintNode && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Gauge size={10} className="text-gray-500" />
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Success Rate</label>
                    </div>
                    <span className={`text-xs font-bold font-mono ${rateColor}`}>{rateNum}%</span>
                  </div>
                  <div className="relative h-6 flex items-center">
                    {/* Track background */}
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/5 border border-white/10" />
                    {/* Filled track */}
                    <div
                      className={`absolute left-0 h-1.5 rounded-full ${rateBg}/30`}
                      style={{ width: `${rateNum}%` }}
                    />
                    {/* Native range input — styled with accent color */}
                    <input
                      type="range" min={0} max={100} step={1}
                      value={rateNum}
                      onChange={(e) => update({ successRate: `${e.target.value}%` })}
                      className="absolute inset-x-0 w-full h-1.5 appearance-none bg-transparent cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125
                        [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-500 [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-track]:bg-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Success Rate — read-only computed from children (group only) */}
              {isGroupNode && (() => {
                const groupRate = selectedNode.data.successRate;
                if (!groupRate) return null;
                const groupRateNum = parseInt(groupRate) || 0;
                const groupRateColor = groupRateNum >= 80 ? 'text-emerald-400' : groupRateNum >= 50 ? 'text-yellow-400' : 'text-red-400';
                const groupRateBg = groupRateNum >= 80 ? 'bg-emerald-400' : groupRateNum >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Gauge size={10} className="text-gray-500" />
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider">Success Rate</label>
                        <span className="text-[8px] text-gray-600 font-mono">(avg)</span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${groupRateColor}`}>{groupRateNum}%</span>
                    </div>
                    <div className="relative h-3 flex items-center">
                      {/* Track background */}
                      <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/5 border border-white/10" />
                      {/* Filled track */}
                      <div
                        className={`absolute left-0 h-1.5 rounded-full ${groupRateBg}/30 transition-all duration-500`}
                        style={{ width: `${groupRateNum}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </Section>
          )}

          {/* ══════════ Transaction Section ══════════ */}
          {tx && (
            <Section title="Transaction" icon={<DollarSign size={10} className="text-gray-500" />} defaultOpen={true}>
              {/* Amount + Currency — compact row */}
              <div className="grid grid-cols-5 gap-1.5">
                <FormField label="Amount" icon={<DollarSign size={10} />} className="col-span-3">
                  <input
                    type="number" step="0.00000001"
                    value={tx.amount || 0}
                    onChange={isAdmin ? (e) => updateTx({ amount: parseFloat(e.target.value) || 0 }) : undefined}
                    disabled={!isAdmin}
                    className={isAdmin ? INPUT : INPUT_DISABLED}
                  />
                </FormField>
                <div className="col-span-2">
                  <label className={LABEL}>Currency</label>
                  <div className="relative">
                    <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold ${currInfo.color}`}>
                      {currInfo.icon}
                    </div>
                    <select
                      value={currentCurrency}
                      onChange={isAdmin ? (e) => updateTx({ currency: e.target.value }) : undefined}
                      disabled={!isAdmin}
                      className={`w-full ${currInfo.bg} text-white pl-7 pr-1 py-1.5 rounded-lg border text-[11px] font-semibold appearance-none transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 focus:outline-none'}`}
                    >
                      {Object.keys(currencyConfig).map((c) => (
                        <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date + Hash — compact row */}
              <div className="grid grid-cols-2 gap-1.5">
                <FormField label="Date" icon={<Calendar size={10} />}>
                  <input
                    type="date"
                    value={tx.date || ''}
                    onChange={isAdmin ? (e) => updateTx({ date: e.target.value }) : undefined}
                    disabled={!isAdmin}
                    className={isAdmin ? INPUT : INPUT_DISABLED}
                  />
                </FormField>
                <FormField label="Tx Hash" icon={<Hash size={10} />}>
                  <input
                    type="text"
                    value={tx.transaction || ''}
                    onChange={isAdmin ? (e) => updateTx({ transaction: e.target.value }) : undefined}
                    disabled={!isAdmin}
                    placeholder="0x..."
                    className={isAdmin ? INPUT : INPUT_DISABLED}
                  />
                </FormField>
              </div>

              {/* Status — inline pill selector */}
              <div>
                <label className={LABEL}>Status</label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((opt) => {
                    const active = currentStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={isAdmin ? () => updateTx({ status: opt.value }) : undefined}
                        disabled={!isAdmin}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${active
                            ? `${opt.bg} ${opt.border} ${opt.color}`
                            : !isAdmin
                              ? 'bg-white/3 border-white/5 text-gray-700 cursor-not-allowed'
                              : 'bg-white/3 border-white/8 text-gray-600 hover:bg-white/6 hover:text-gray-400'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${active ? opt.dot : 'bg-gray-700'}`} />
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

          {/* ══════════ Edge Handles (collapsed by default) ══════════ */}
          {isAdmin && isAnyNodeType && (
            <Section title="Edge Handles" icon={<GitBranch size={10} className="text-gray-500" />} defaultOpen={false}
              badge={`${targetPos[0].toUpperCase()} → ${sourcePos[0].toUpperCase()}`}
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">Incoming</span>
                  <DPad current={targetPos} onChange={(v) => setHandlePos('target', v)} accentColor="bg-cyan-500/25 border border-cyan-500/50 text-cyan-400" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">Outgoing</span>
                  <DPad current={sourcePos} onChange={(v) => setHandlePos('source', v)} accentColor="bg-purple-500/25 border border-purple-500/50 text-purple-400" />
                </div>
              </div>
            </Section>
          )}

          {/* ══════════ Custom Parameters (last, collapsed) ══════════ */}
          {isAdmin && isFingerprintNode && (
            <Section
              title="Custom Parameters"
              icon={<Sliders size={10} className="text-gray-500" />}
              defaultOpen={false}
              badge={`${(selectedNode.data.customParameters || []).length}`}
            >
              {(selectedNode.data.customParameters || []).map((param: any, index: number) => (
                <div key={index} className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Title"
                    value={param.title}
                    onChange={(e) => {
                      const p = [...(selectedNode.data.customParameters || [])];
                      p[index] = { ...p[index], title: e.target.value };
                      update({ customParameters: p });
                    }}
                    className={`${PARAM_INPUT} w-[38%]`}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => {
                      const p = [...(selectedNode.data.customParameters || [])];
                      p[index] = { ...p[index], value: e.target.value };
                      update({ customParameters: p });
                    }}
                    className={`${PARAM_INPUT} flex-1`}
                  />
                  <button
                    onClick={() => {
                      const p = (selectedNode.data.customParameters || []).filter((_: any, i: number) => i !== index);
                      update({ customParameters: p });
                    }}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}

              {(selectedNode.data.customParameters || []).length === 0 && (
                <p className="text-[10px] text-gray-600 italic dv-fade-in">No parameters yet — add one to get started</p>
              )}

              <button
                onClick={() => {
                  const cur = selectedNode.data.customParameters || [];
                  update({ customParameters: [...cur, { title: '', value: '' }] });
                }}
                className="w-full flex items-center justify-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold py-1 rounded-lg border border-dashed border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-all"
              >
                <Plus size={10} /> Add Parameter
              </button>
            </Section>
          )}
        </div>

        {/* ── Action Buttons ── */}
        {isAdmin && isAnyNodeType && (
          <div className="px-3.5 pb-3 pt-1 flex flex-col gap-1">
            <div className="flex gap-1">
              {onAddChildNode && (
                <ActionButton
                  onClick={() => onAddChildNode(selectedNode.id)}
                  icon={<Plus size={12} />}
                  label={isCryptoNode ? 'Child Tx' : isGroupNode ? 'Group Child' : 'Child'}
                  colorClass="bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400"
                />
              )}
              {onAddGroupNode && (
                <ActionButton
                  onClick={() => onAddGroupNode(selectedNode.id)}
                  icon={<Layers size={12} />}
                  label="Group"
                  colorClass="bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 hover:border-purple-500/40 text-purple-400"
                />
              )}
              {(isFingerprintNode || isGroupNode) && onAddCryptoChildNode && (
                <ActionButton
                  onClick={() => onAddCryptoChildNode(selectedNode.id)}
                  icon={<CircleDot size={12} />}
                  label="Crypto"
                  colorClass="bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/25 hover:border-cyan-500/40 text-cyan-400"
                />
              )}
            </div>
            {onDeleteNode && canDelete && (
              <ActionButton
                onClick={() => onDeleteNode(selectedNode.id)}
                icon={<Trash2 size={11} />}
                label="Delete Node"
                colorClass="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/35 text-red-400"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisual;
