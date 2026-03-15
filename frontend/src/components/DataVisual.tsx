import React, { useState } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Hash,
  Coins,
  Plus,
  Trash2,
  Settings,
  Layers,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  GitBranch,
  ChevronDown,
  CircleDot,
} from 'lucide-react';

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

// Currency icon + color map
const currencyConfig: Record<string, { icon: string; color: string; bg: string }> = {
  BTC: { icon: '₿', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  ETH: { icon: 'Ξ', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/25' },
  SOL: { icon: '◎', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25' },
  USDT: { icon: '₮', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/25' },
  BNB: { icon: '◆', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
  TRX: { icon: '⟐', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/25' },
};

// Status color map
const statusConfig: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  Pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', dot: 'bg-yellow-400' },
  Fail: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
  'Cold Wallet': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
  Reported: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
};

// Collapsible D-pad dropdown for edge handle positions
const EdgeHandlesDropdown: React.FC<{
  targetPos: string;
  sourcePos: string;
  DPad: React.FC<{ current: string; onChange: (v: string) => void; accentColor: string }>;
  setHandlePos: (type: 'target' | 'source', value: string) => void;
}> = ({ targetPos, sourcePos, DPad, setHandlePos }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <GitBranch size={10} className="text-gray-500" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Edge Handles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-600 font-mono">
            {targetPos[0].toUpperCase()} → {sourcePos[0].toUpperCase()}
          </span>
          <ChevronDown
            size={11}
            className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-3 pb-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            {/* Incoming column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">Incoming</span>
              <DPad
                current={targetPos}
                onChange={(v) => setHandlePos('target', v)}
                accentColor="bg-cyan-500/25 border border-cyan-500/50 text-cyan-400"
              />
            </div>
            {/* Outgoing column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">Outgoing</span>
              <DPad
                current={sourcePos}
                onChange={(v) => setHandlePos('source', v)}
                accentColor="bg-purple-500/25 border border-purple-500/50 text-purple-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const tx = selectedNode.data.transaction;
  const currentCurrency = tx?.currency || 'BTC';
  const currentStatus = tx?.status || 'Success';
  const currInfo = currencyConfig[currentCurrency] || currencyConfig.BTC;
  const statusInfo = statusConfig[currentStatus] || statusConfig.Success;

  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-[22rem]">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Settings className="text-purple-400" size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Edit Node</h2>
              <p className="text-[11px] text-gray-500 font-mono truncate max-w-[160px]">
                {selectedNode.data.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 px-5 pb-2 space-y-2.5">
          {/* ── Crypto Node Network Selector (at the very top) ── */}
          {isAdmin && isCryptoNode && (() => {
            const currentOpt = cryptoTypeOptions.find(c => c.label === selectedNode.data.label) || cryptoTypeOptions[0];
            return (
              <div>
                <label className="block text-[10px] text-gray-500 mb-1.5 ml-0.5 uppercase tracking-wider">Network</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {cryptoTypeOptions.map((opt) => {
                    const active = opt.code === currentOpt.code;
                    return (
                      <button
                        key={opt.code}
                        onClick={() => {
                          onUpdateNodeData(selectedNode.id, {
                            label: opt.label,
                            logo: opt.logo
                          });
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                          active
                            ? `${opt.activeBg} scale-[1.02]`
                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        <img src={opt.logo} alt={opt.code} className="w-3.5 h-3.5 object-contain" />
                        {opt.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Level field for Crypto & Group nodes ── */}
          {isAdmin && (isCryptoNode || isGroupNode) && (
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Level</label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Layers size={12} /></div>
                <input
                  type="number" min={1} max={5}
                  value={selectedNode.data.level || 1}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { level: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ── Fingerprint Node Properties ── */}
          {isAdmin && isFingerprintNode && (
            <div className="grid grid-cols-2 gap-2">
              {/* Level */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Level</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Layers size={12} /></div>
                  <input
                    type="number" min={1} max={5}
                    value={selectedNode.data.level || 1}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { level: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
              {/* Pending */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Pending</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Clock size={12} /></div>
                  <input
                    type="number" min={0}
                    value={selectedNode.data.pending || 0}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { pending: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
              {/* Success Rate (Legacy) */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Success Rate</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Clock size={12} /></div>
                  <input
                    type="text"
                    placeholder="e.g. 98%"
                    value={selectedNode.data.successRate || ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { successRate: e.target.value })}
                    className="w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Custom Parameters */}
              <div className="col-span-2 space-y-2 pt-1">
                <div className="flex items-center justify-between ml-0.5">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider">Custom Parameters</label>
                  <button
                    onClick={() => {
                      const currentParams = selectedNode.data.customParameters || [];
                      onUpdateNodeData(selectedNode.id, {
                        customParameters: [...currentParams, { title: '', value: '' }]
                      });
                    }}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-all"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>

                {(selectedNode.data.customParameters || []).map((param: any, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Title"
                        value={param.title}
                        onChange={(e) => {
                          const newParams = [...(selectedNode.data.customParameters || [])];
                          newParams[index] = { ...newParams[index], title: e.target.value };
                          onUpdateNodeData(selectedNode.id, { customParameters: newParams });
                        }}
                        className="w-full bg-white/5 text-white px-2 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono hover:border-white/20 focus:border-purple-500/50 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => {
                          const newParams = [...(selectedNode.data.customParameters || [])];
                          newParams[index] = { ...newParams[index], value: e.target.value };
                          onUpdateNodeData(selectedNode.id, { customParameters: newParams });
                        }}
                        className="w-full bg-white/5 text-white px-2 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono hover:border-white/20 focus:border-purple-500/50 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          const newParams = (selectedNode.data.customParameters || []).filter((_: any, i: number) => i !== index);
                          onUpdateNodeData(selectedNode.id, { customParameters: newParams });
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors flex justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {(selectedNode.data.customParameters || []).length === 0 && (
                  <p className="text-[10px] text-gray-600 italic ml-0.5">No custom parameters added</p>
                )}
              </div>
            </div>
          )}

          {/* ── Edge Handle Positions (Collapsible D-pad) ── */}
          {isAdmin && (isFingerprintNode || isCryptoNode || isGroupNode) && (() => {
            const targetPos = selectedNode.data.handles?.target?.position || 'left';
            const sourcePos = selectedNode.data.handles?.source?.position || 'right';
            const setHandlePos = (type: 'target' | 'source', value: string) => {
              const currentHandles = selectedNode.data.handles || { target: { position: 'left' }, source: { position: 'right' } };
              onUpdateNodeData(selectedNode.id, {
                handles: { ...currentHandles, [type]: { ...currentHandles[type], position: value } }
              });
            };

            const DPad = ({ current, onChange, accentColor }: { current: string; onChange: (v: string) => void; accentColor: string }) => {
              const btn = (dir: string, icon: React.ReactNode) => {
                const active = current === dir;
                return (
                  <button
                    onClick={() => onChange(dir)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                      active
                        ? `${accentColor} shadow-lg scale-110`
                        : 'bg-white/5 border border-white/10 text-gray-600 hover:bg-white/10 hover:text-gray-400'
                    }`}
                  >
                    {icon}
                  </button>
                );
              };

              return (
                <div className="flex flex-col items-center gap-0.5">
                  {/* Top */}
                  {btn('top', <ArrowUp size={12} />)}
                  {/* Left - Center - Right */}
                  <div className="flex items-center gap-0.5">
                    {btn('left', <ArrowLeft size={12} />)}
                    <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-center">
                      <span className="text-[8px] text-gray-500 font-mono uppercase">{current.slice(0, 1)}</span>
                    </div>
                    {btn('right', <ArrowRight size={12} />)}
                  </div>
                  {/* Bottom */}
                  {btn('bottom', <ArrowDown size={12} />)}
                </div>
              );
            };

            return (
              <EdgeHandlesDropdown
                targetPos={targetPos}
                sourcePos={sourcePos}
                DPad={DPad}
                setHandlePos={setHandlePos}
              />
            );
          })()}

          {/* ── Transaction Fields ── */}
          {tx && (
            <>
              {/* Amount + Currency inline */}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-3">
                  <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><DollarSign size={12} /></div>
                    <input
                      type="number" step="0.00000001"
                      value={tx.amount || 0}
                      onChange={isAdmin ? (e) => onUpdateNodeData(selectedNode.id, {
                        transaction: { ...tx, amount: parseFloat(e.target.value) || 0 }
                      }) : undefined}
                      disabled={!isAdmin}
                      className={`w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none'}`}
                    />
                  </div>
                </div>
                {/* Currency with icon badge */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Currency</label>
                  <div className="relative">
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold ${currInfo.color}`}>
                      {currInfo.icon}
                    </div>
                    <select
                      value={currentCurrency}
                      onChange={isAdmin ? (e) => onUpdateNodeData(selectedNode.id, {
                        transaction: { ...tx, currency: e.target.value }
                      }) : undefined}
                      disabled={!isAdmin}
                      className={`w-full ${currInfo.bg} text-white pl-8 pr-2 py-2 rounded-lg border text-xs font-semibold appearance-none transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 focus:outline-none'}`}
                    >
                      {Object.keys(currencyConfig).map((c) => (
                        <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Date</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Calendar size={12} /></div>
                  <input
                    type="date"
                    value={tx.date || ''}
                    onChange={isAdmin ? (e) => onUpdateNodeData(selectedNode.id, {
                      transaction: { ...tx, date: e.target.value }
                    }) : undefined}
                    disabled={!isAdmin}
                    className={`w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none'}`}
                  />
                </div>
              </div>

              {/* Status — color highlighted */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Status</label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  <select
                    value={currentStatus}
                    onChange={isAdmin ? (e) => onUpdateNodeData(selectedNode.id, {
                      transaction: { ...tx, status: e.target.value }
                    }) : undefined}
                    disabled={!isAdmin}
                    className={`w-full ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} pl-8 pr-2 py-2 rounded-lg border text-xs font-semibold appearance-none transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 focus:outline-none'}`}
                  >
                    <option value="Success" className="bg-[#1a1a1a] text-white">Success</option>
                    <option value="Pending" className="bg-[#1a1a1a] text-white">Pending</option>
                    <option value="Fail" className="bg-[#1a1a1a] text-white">Fail</option>
                    <option value="Cold Wallet" className="bg-[#1a1a1a] text-white">Cold Wallet</option>
                    <option value="Reported" className="bg-[#1a1a1a] text-white">Reported</option>
                  </select>
                </div>
              </div>

              {/* Transaction Hash */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 ml-0.5 uppercase tracking-wider">Tx Hash</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"><Hash size={12} /></div>
                  <input
                    type="text"
                    value={tx.transaction || ''}
                    onChange={isAdmin ? (e) => onUpdateNodeData(selectedNode.id, {
                      transaction: { ...tx, transaction: e.target.value }
                    }) : undefined}
                    disabled={!isAdmin}
                    placeholder="0x..."
                    className={`w-full bg-white/5 text-white pl-8 pr-2 py-2 rounded-lg border border-white/10 text-xs font-mono transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none'}`}
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Action Buttons */}
        <div className="relative z-10 px-5 pb-5 pt-2 space-y-1.5">
          {isAdmin && (isFingerprintNode || isCryptoNode || isGroupNode) && onAddChildNode && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onAddChildNode(selectedNode.id)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              >
                <Plus size={14} />
                {isCryptoNode ? 'Add Child Transaction Node' : isGroupNode ? 'Add Child Node to Group' : 'Add Child Node'}
              </button>
              
              {onAddGroupNode && (
                <button
                  onClick={() => onAddGroupNode(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 hover:border-purple-500/40 text-purple-400 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                >
                  <Layers size={14} />
                  Add Group Node
                </button>
              )}
            </div>
          )}

          {/* ── Add Crypto Child Node (fingerprint & group nodes only) ── */}
          {isAdmin && (isFingerprintNode || isGroupNode) && onAddCryptoChildNode && (
            <button
              onClick={() => onAddCryptoChildNode(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/25 hover:border-cyan-500/40 text-cyan-400 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <CircleDot size={14} />
              Add Crypto Node
            </button>
          )}

          {isAdmin && (isFingerprintNode || isCryptoNode || isGroupNode) && onDeleteNode && canDelete && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/35 text-red-400 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <Trash2 size={13} />
              Delete Node
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default DataVisual;

// ─── Crypto type options ───
const cryptoTypeOptions = [
  { code: 'BTC',  label: 'Bitcoin',  logo: '/assets/crypto-logos/bitcoin-btc-logo.svg',  activeBg: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  { code: 'ETH',  label: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg', activeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { code: 'SOL',  label: 'Solana',   logo: '/assets/crypto-logos/solana-sol-logo.svg',   activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
  { code: 'USDT', label: 'Tether',   logo: '/assets/crypto-logos/tether-usdt-logo.svg', activeBg: 'bg-green-500/20 border-green-500/40 text-green-400' },
  { code: 'BNB',  label: 'BNB',      logo: '/assets/crypto-logos/bnb-bnb-logo.svg',     activeBg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
  { code: 'TRX',  label: 'TRX',      logo: '/assets/crypto-logos/tron-trx-logo.svg',    activeBg: 'bg-red-500/20 border-red-500/40 text-red-400' },
];
