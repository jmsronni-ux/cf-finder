import React, { useState, useEffect } from 'react';
import FakeTerminal from './FakeTerminal';
import { Calendar, Hash, DollarSign, CheckCircle2, Clock, XCircle, FileText, User, Wallet, KeyRound, Snowflake, AlertTriangle, X, Minus, Plus, Loader2, Info, Settings, Layers } from 'lucide-react';
import { PulsatingButton } from './ui/pulsating-button';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import InsufficientBalancePopup from './InsufficientBalancePopup';
import { apiFetch } from '../utils/api';
import { useConversionRates } from '../hooks/useConversionRates';

interface NodeDetailsPanelProps {
  selectedNode: any;
  onClose: () => void;
  hasStarted?: boolean;
  hasWatchedCurrentLevel?: boolean;
  onStartAnimation?: () => void;
  onWithdrawClick?: () => void;
  withdrawalSystem?: string;
  level?: number;
  onKeyGenerationSuccess?: () => void;
}

// Progress bar sub-component removed — replaced by ProcessingSteps below

// 3-step milestone tracker for processing states
const PROCESSING_STEPS = [
  { label: 'Scanning Blockchain', threshold: 0 },
  { label: 'Tracing Fund Path', threshold: 35 },
  { label: 'Initiating Recovery', threshold: 70 },
];

const ProcessingSteps: React.FC<{ executeAt?: string; createdAt?: string }> = ({ executeAt, createdAt }) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (executeAt && createdAt) {
      const start = new Date(createdAt).getTime();
      const end = new Date(executeAt).getTime();
      const total = end - start;
      if (total <= 0) { setProgress(100); return; }

      const update = () => {
        const elapsed = Date.now() - start;
        setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      let p = 0;
      const interval = setInterval(() => {
        p += 0.3 + Math.random() * 0.5;
        if (p > 95) p = 95;
        setProgress(p);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [executeAt, createdAt]);

  // Determine step states
  const getStepState = (i: number) => {
    const isReached = progress >= PROCESSING_STEPS[i].threshold;
    const isLast = i === PROCESSING_STEPS.length - 1;
    const isPassed = isReached && (isLast ? progress >= 90 : progress >= PROCESSING_STEPS[i + 1].threshold);
    const isActive = isReached && !isPassed;
    return { isReached, isPassed, isActive };
  };

  return (
    <div className="mt-3 relative">
      {/* Connecting line background */}
      <div className="absolute top-[9px] left-[9px] right-[9px] h-[2px] bg-white/[0.06] rounded-full" />
      {/* Connecting line fill — green for passed, amber for active */}
      <div
        className="absolute top-[9px] left-[9px] h-[2px] rounded-full transition-all duration-1000 ease-linear"
        style={{
          width: `calc(${Math.min(progress, 100)}% - 18px)`,
          background: progress >= PROCESSING_STEPS[PROCESSING_STEPS.length - 1].threshold
            ? 'rgb(52, 211, 153)' // emerald-400
            : `linear-gradient(to right, rgb(52, 211, 153) ${Math.max(0, progress - 15)}%, rgb(245, 158, 11) 100%)`,
        }}
      />
      {/* Traveling dot */}
      <div
        className={`absolute top-[5px] w-[10px] h-[10px] rounded-full transition-all duration-1000 ease-linear z-10 ${
          progress >= PROCESSING_STEPS[PROCESSING_STEPS.length - 1].threshold
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
            : 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
        }`}
        style={{ left: `calc(${Math.min(progress, 100)}% - 14px)` }}
      />
      {/* Step circles + labels */}
      <div className="flex justify-between relative z-20">
        {PROCESSING_STEPS.map((step, i) => {
          const { isReached, isPassed, isActive } = getStepState(i);
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: '33.33%' }}>
              <div
                className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  isPassed
                    ? 'border-emerald-400 bg-[#0a1a14]'
                    : isActive
                      ? 'border-amber-400 bg-amber-400/20'
                      : 'border-white/10 bg-[#0c0c0c]'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-[6px] h-[6px] rounded-full bg-amber-400 animate-pulse" />
                ) : null}
              </div>
              <span className={`text-[9px] mt-1.5 text-center leading-tight transition-colors duration-500 ${
                isPassed ? 'text-emerald-400 font-medium' : isActive ? 'text-amber-400 font-medium' : 'text-neutral-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  selectedNode,
  onClose,
  hasStarted = false,
  hasWatchedCurrentLevel = false,
  onStartAnimation,
  onWithdrawClick,
  withdrawalSystem = 're_allocate_funds',
  level = 1,
  onKeyGenerationSuccess
}) => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [nextTierInfo, setNextTierInfo] = useState<{ tier: number; price: number; name: string } | null>(null);
  const [showInsufficientBalancePopup, setShowInsufficientBalancePopup] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState({ requiredAmount: 0, tierName: '' });
  const [pendingTierRequest, setPendingTierRequest] = useState<boolean>(false);
  const [wallets, setWallets] = useState<{ btc?: string; eth?: string; tron?: string; usdtErc20?: string } | null>(null);
  const { ratesMap } = useConversionRates();

  // Direct Access Keys state
  const [keysCount, setKeysCount] = useState(1);
  const [pricePerKey, setPricePerKey] = useState(20);
  const [keyLoading, setKeyLoading] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [pendingKeyRequest, setPendingKeyRequest] = useState<any>(null);
  const [showKeyTooltip, setShowKeyTooltip] = useState(false);
  const [keyPriceMode, setKeyPriceMode] = useState<'static' | 'percent'>('static');
  const [keyPricePercent, setKeyPricePercent] = useState(5);

  const isGroupNode = selectedNode?.type === 'fingerprintGroupNode';
  const nodeAmount = selectedNode?.data?.transaction?.amount || 0;
  // Compute effective price based on mode
  const effectivePrice = keyPriceMode === 'percent'
    ? Math.max(1, (nodeAmount * keyPricePercent) / 100)
    : pricePerKey;
  const totalKeyCost = keysCount * effectivePrice * (isGroupNode ? (selectedNode?.data?.childCount || 0) : 1);
  const availableBalance = user?.availableBalance || 0;
  const hasSufficientBalance = availableBalance >= totalKeyCost;

  const isDAK = withdrawalSystem === 'direct_access_keys';

  // Fetch pending tier requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!token) return;
      try {
        const res = await apiFetch('/tier-request/my-requests', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success) {
          const pending = json.data.requests?.find((req: any) => req.status === 'pending');
          setPendingTierRequest(!!pending);
        }
      } catch (e) { console.error('Failed to fetch pending requests', e); }
    };
    fetchPendingRequests();
  }, [token, user?.tier]);

  // Fetch next tier upgrade options
  useEffect(() => {
    const fetchNextTierInfo = async () => {
      if (!token || !user) return;
      try {
        const res = await apiFetch('/tier/my-tier', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success && json.data.upgradeOptions?.length > 0) {
          const nextTier = json.data.upgradeOptions[0];
          setNextTierInfo({ tier: nextTier.tier, price: nextTier.upgradePrice, name: nextTier.name });
        } else {
          setNextTierInfo(null);
        }
      } catch (e) { console.error('NodeDetailsPanel: Failed to fetch tier info', e); }
    };
    fetchNextTierInfo();
  }, [token, user?.tier]);

  // Fetch user wallets
  useEffect(() => {
    const fetchWallets = async () => {
      if (!token) return;
      try {
        const res = await apiFetch('/user/me/wallets', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setWallets({ btc: json?.data?.btc || '', eth: json?.data?.eth || '', tron: json?.data?.tron || '', usdtErc20: json?.data?.usdtErc20 || '' });
        }
      } catch (e) { console.error('Failed to fetch wallets', e); }
    };
    fetchWallets();
  }, [token]);

  // DAK: Fetch key price and check pending request
  useEffect(() => {
    if (withdrawalSystem !== 'direct_access_keys' || !selectedNode) return;
    if ((selectedNode.type !== 'fingerprintNode' && selectedNode.type !== 'fingerprintGroupNode') || !hasWatchedCurrentLevel) return;

    setKeysCount(1);
    (async () => {
      setLoadingPrice(true);
      try {
        const res = await apiFetch('/global-settings', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok && json?.success) {
          setPricePerKey(json.data.directAccessKeyPrice || 20);
          setKeyPriceMode(json.data.keyPriceMode || 'static');
          setKeyPricePercent(json.data.directAccessKeyPricePercent ?? 5);
        }
      } catch (e) { console.error('Failed to fetch key price'); }
      finally { setLoadingPrice(false); }
    })();

    (async () => {
      try {
        const res = await apiFetch('/key-generation/my-requests', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok && json?.success) {
          const pending = json.data?.find((r: any) => r.nodeId === selectedNode.id && r.status === 'pending');
          setPendingKeyRequest(pending || null);
        }
      } catch (e) { console.error('Failed to check pending key requests'); }
    })();
  }, [withdrawalSystem, selectedNode?.id, hasWatchedCurrentLevel, token]);

  const handleGenerateKeys = async () => {
    if (!hasSufficientBalance || !selectedNode?.id) return;
    setKeyLoading(true);
    try {
      const isGroup = selectedNode.type === 'fingerprintGroupNode';
      const endpoint = isGroup ? '/key-generation/create-group' : '/key-generation/create';
      const body = isGroup ? {
        level,
        keysCount,
        parentNodeId: selectedNode.id,
        childNodeIds: selectedNode.data?.childNodeIds,
        nodeAmounts: selectedNode.data?.nodeAmounts
      } : {
        level,
        keysCount,
        nodeId: selectedNode.id,
        nodeAmount: selectedNode.data?.transaction?.amount
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(isGroup ? `${keysCount} Access Key${keysCount > 1 ? 's' : ''} generated for ${selectedNode.data?.childCount} nodes` : `${keysCount} Access Key${keysCount > 1 ? 's' : ''} generated`);
        await refreshUser();
        // For groups, we might have multiple pending requests, but the UI only tracks one here.
        // The InProgressPanel and node markers will handle multiple.
        if (!isGroup) setPendingKeyRequest(json.data);
        onKeyGenerationSuccess?.();
      } else { toast.error(json?.message || 'Failed to generate keys'); }
    } catch (e) { toast.error('Failed to generate keys'); }
    finally { setKeyLoading(false); }
  };

  const handleUpgradeClick = async () => {
    if (!user || !token) { toast.error('Authentication required'); return; }
    if (user?.tier === 5) { toast.info('You are already at the maximum tier'); navigate('/profile'); return; }
    if (!nextTierInfo) { toast.error('Unable to load tier information.'); return; }
    if (user.balance < nextTierInfo.price) {
      setInsufficientBalanceInfo({ requiredAmount: nextTierInfo.price, tierName: nextTierInfo.name });
      setShowInsufficientBalancePopup(true);
      return;
    }
    setIsUpgrading(true);
    try {
      const res = await apiFetch('/tier/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetTier: nextTierInfo.tier })
      });
      const json = await res.json();
      if (res.ok && json?.success) { toast.success(json.message || `Upgraded to ${nextTierInfo.name}!`); await refreshUser(); onClose(); }
      else { toast.error(json?.message || 'Failed to upgrade tier'); }
    } catch (e) { console.error('Tier upgrade error:', e); toast.error('Failed to upgrade tier'); }
    finally { setIsUpgrading(false); }
  };

  if (!selectedNode) return null;

  const isUserNode = selectedNode.id === 'center' || selectedNode.type === 'accountNode';
  const isFingerprintNode = selectedNode.type === 'fingerprintNode';
  const hasTransaction = selectedNode.data.transaction || isGroupNode;
  const transaction = selectedNode.data.transaction || {};

  // Wallets for old design
  const verifiedWalletsOld = wallets ? [
    { name: 'Bitcoin (BTC)', address: wallets.btc, icon: '₿', color: 'text-orange-400' },
    { name: 'Ethereum (ETH)', address: wallets.eth, icon: 'Ξ', color: 'text-blue-400' },
    { name: 'Tron (TRON)', address: wallets.tron, icon: 'T', color: 'text-red-400' },
    { name: 'USDT ERC20', address: wallets.usdtErc20, icon: '₮', color: 'text-green-400' }
  ].filter(wallet => wallet.address && wallet.address.trim() !== '') : [];

  // Wallets for new design
  const verifiedWallets = wallets ? [
    { name: 'BTC', address: wallets.btc, icon: '₿' },
    { name: 'ETH', address: wallets.eth, icon: 'Ξ' },
    { name: 'TRON', address: wallets.tron, icon: 'T' },
    { name: 'USDT', address: wallets.usdtErc20, icon: '₮' }
  ].filter(w => w.address && w.address.trim() !== '') : [];

  // Node status
  let nodeStatus = 'Available';
  if (selectedNode.data.dakLocked) nodeStatus = 'Locked';
  else if (selectedNode.data.nodeProgressStatus === 'pending') nodeStatus = 'Pending';
  else if (selectedNode.data.nodeProgressStatus === 'success') nodeStatus = 'Success';
  else if (selectedNode.data.nodeProgressStatus === 'fail') nodeStatus = 'Fail';
  else if (selectedNode.data.nodeProgressStatus === 'cold wallet') nodeStatus = 'Cold Wallet';
  else if (selectedNode.data.nodeProgressStatus === 'reported') nodeStatus = 'Reported';

  // Old design status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Success':
      case 'success':
        return { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
      case 'Pending':
      case 'pending':
        return { icon: <Clock className="w-5 h-5" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' };
      case 'Fail':
      case 'fail':
        return { icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
      case 'Locked':
        return { icon: <XCircle className="w-5 h-5" />, color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/20' };
      case 'Cold Wallet':
      case 'cold wallet':
        return { icon: <Snowflake className="w-5 h-5" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' };
      case 'Reported':
      case 'reported':
        return { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' };
      default:
        return { icon: <KeyRound className="w-5 h-5" />, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' };
    }
  };

  const statusDisplay = getStatusDisplay(nodeStatus);

  // New design status config
  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'Success': { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400', label: 'Success' },
    'Pending': { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-400', label: 'Pending' },
    'Fail': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-400', label: 'Failed' },
    'Locked': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-neutral-500', label: 'Locked' },
    'Cold Wallet': { icon: <Snowflake className="w-3.5 h-3.5" />, color: 'text-sky-400', label: 'Cold' },
    'Reported': { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-orange-400', label: 'Reported' },
    'Available': { icon: <KeyRound className="w-3.5 h-3.5" />, color: 'text-amber-400', label: 'Awaiting' },
  };
  const status = statusConfig[nodeStatus] || statusConfig['Available'];

  const showInlineKeys = isFingerprintNode && hasWatchedCurrentLevel && isDAK;

  // ─── GROUP NODE BUNDLE PANEL (Direct Access Keys) ───
  if (isGroupNode && isDAK) {
    const childCount = selectedNode.data?.childCount || 0;
    const aggregatedAmount = selectedNode.data?.aggregatedAmount || 0;

    return (
      <div className="absolute top-20 right-6 z-30 w-full max-w-[340px] group-panel-enter">
        <div className="group-panel-stack">
          <div className="bg-[#0c0c0c] border border-white/[0.07] rounded-xl shadow-2xl overflow-hidden">

            {/* ─── Group banner ─── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-white/[0.02] border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <Layers className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[13px] font-medium text-neutral-400 uppercase tracking-wide">Group</span>
                <span className="text-[11px] tabular-nums text-neutral-500 bg-white/[0.06] px-2 py-0.5 rounded-full font-medium">{childCount} nodes</span>
              </div>
              <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* ─── Content ─── */}
              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">

                {/* ─── Aggregated amount ─── */}
                <div className="mb-4">
                  <div className="text-2xl font-semibold text-white font-mono tabular-nums tracking-tight">
                    ${aggregatedAmount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                    across {childCount} node{childCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* ─── Meta rows ─── */}
                <div className="space-y-2 text-xs">
                  {selectedNode.data.successRate && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Success Rate</span>
                      <span className="text-emerald-400 font-medium">{selectedNode.data.successRate}</span>
                    </div>
                  )}
                  {(selectedNode.data.customParameters || []).map((param: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-neutral-500">{param.title || 'Param'}</span>
                      <span className="text-neutral-300">{param.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Status</span>
                    <span className={`flex items-center gap-1.5 ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* ─── Key Generation / Status ─── */}
                {hasWatchedCurrentLevel && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    {pendingKeyRequest ? (
                      (() => {
                        const sa = pendingKeyRequest.scheduledAction;
                        const hasSchedule = sa?.executeAt && sa?.createdAt;
                        return (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Processing Bundle
                              </div>
                              <span className="text-neutral-500 text-[10px] font-mono tabular-nums">
                                {pendingKeyRequest.keysCount}× · {childCount}n
                              </span>
                            </div>
                            <FakeTerminal />
                            <p className="text-neutral-500 text-[10px] font-mono text-center">
                              {pendingKeyRequest.keysCount} key{pendingKeyRequest.keysCount > 1 ? 's' : ''} × {childCount} nodes · ${pendingKeyRequest.totalCost?.toFixed(2)} USD
                            </p>

                            <ProcessingSteps
                              executeAt={sa?.executeAt}
                              createdAt={sa?.createdAt}
                            />
                          </div>
                        );
                      })()
                    ) : nodeStatus === 'Locked' ? (
                      <div className="rounded-lg bg-neutral-500/10 border border-neutral-500/15 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-neutral-400 text-sm">
                          <XCircle className="w-3.5 h-3.5" />
                          Unlock previous nodes first
                        </div>
                      </div>
                    ) : (nodeStatus === 'Success' && childCount === 0) ? (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3">
                        <div className="flex items-center justify-between text-emerald-400 text-sm font-medium">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            All Nodes Recovered
                          </span>
                          {selectedNode.data.approvedAmount != null && selectedNode.data.approvedAmount > 0 && (
                            <span className="font-semibold">${Number(selectedNode.data.approvedAmount).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ) : nodeStatus === 'Pending' ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing Bundle
                        </div>
                        <FakeTerminal />
                        <ProcessingSteps />
                      </div>
                    ) : (
                      /* ─── Bundle key generation ─── */
                      <div className="space-y-3">
                        {/* Quantity row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setKeysCount(Math.max(1, keysCount - 1))}
                              disabled={keysCount <= 1}
                              className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center disabled:opacity-20 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-semibold text-white w-8 text-center tabular-nums">{keysCount}</span>
                            <button
                              onClick={() => setKeysCount(keysCount + 1)}
                              className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-neutral-500 text-xs ml-1">× ${loadingPrice ? '...' : effectivePrice.toFixed(2)}</span>
                          </div>
                          <span className="text-amber-400 font-semibold text-sm tabular-nums">${totalKeyCost.toFixed(2)}</span>
                        </div>

                        {/* Bundle breakdown */}
                        <div className="text-[10px] text-neutral-600 font-mono text-center">
                          {keysCount} key{keysCount > 1 ? 's' : ''} × ${loadingPrice ? '…' : effectivePrice.toFixed(2)}/key × {childCount} nodes
                        </div>

                        {/* Balance */}
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-600">Available balance</span>
                          <span className={hasSufficientBalance ? 'text-neutral-400' : 'text-red-400'}>${availableBalance.toFixed(2)}</span>
                        </div>

                        {/* CTA */}
                        {hasSufficientBalance ? (
                          <button
                            onClick={handleGenerateKeys}
                            disabled={keyLoading || loadingPrice}
                            className="w-full h-10 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:hover:bg-amber-600 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                          >
                            {keyLoading ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                            ) : (
                              <><KeyRound className="w-3.5 h-3.5" /> Generate for {childCount} Nodes</>
                            )}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-red-400 text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Insufficient balance
                            </div>
                            <button
                              onClick={() => { onClose(); window.location.href = '/profile'; }}
                              className="w-full h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                              <DollarSign className="w-3 h-3" /> Top Up Balance
                            </button>
                          </div>
                        )}

                        {/* Info tooltip */}
                        <div className="relative">
                          <button
                            onMouseEnter={() => setShowKeyTooltip(true)}
                            onMouseLeave={() => setShowKeyTooltip(false)}
                            className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors flex items-center gap-1"
                          >
                            <Info className="w-2.5 h-2.5" /> What are Access Keys?
                          </button>
                          {showKeyTooltip && (
                            <div className="absolute bottom-full left-0 mb-1 bg-[#141414] border border-white/10 rounded-lg p-2.5 text-[11px] text-neutral-400 max-w-[280px] z-50 shadow-xl leading-relaxed">
                              Access Keys attempt to reconstruct the transaction path. Generating keys for a group applies them to <strong className="text-white">all {childCount} child nodes</strong> at once.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <InsufficientBalancePopup
          isOpen={showInsufficientBalancePopup}
          onClose={() => setShowInsufficientBalancePopup(false)}
          requiredAmount={insufficientBalanceInfo.requiredAmount}
          currentBalance={user?.balance || 0}
          tierName={insufficientBalanceInfo.tierName}
        />
      </div>
    );
  }

  // ─── NEW DESIGN (Direct Access Keys) ───
  if (isDAK) {
    return (
      <div className="absolute top-20 right-6 z-30 w-full max-w-[340px]">
        <div className="bg-[#0c0c0c] border border-white/[0.07] rounded-xl shadow-2xl">
          <div className="p-5">

            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-medium text-neutral-400 uppercase tracking-wide">
                {isUserNode ? 'Account' : 'Node Details'}
              </h2>
              <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors -mr-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
              {isUserNode ? (
                <>
                  {/* User info — simple */}
                  <div className="mb-4">
                    <div className="text-white text-lg font-semibold">{user?.name || 'User'}</div>
                    <div className="text-neutral-500 text-xs mt-0.5">Tier {user?.tier || 1}</div>
                  </div>

                  {/* Wallets — flat list */}
                  {verifiedWallets.length > 0 ? (
                    <div className="space-y-3">
                      {verifiedWallets.map((w, i) => (
                        <div key={i}>
                          <div className="text-neutral-500 text-[11px] mb-1">{w.icon} {w.name}</div>
                          <div className="text-[11px] font-mono text-neutral-300 break-all leading-relaxed">{w.address}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-600 text-xs">No wallets added</p>
                  )}
                </>
              ) : hasTransaction ? (
                <>
                  {/* Amount — prominent */}
                  <div className="mb-4">
                    <div className="text-2xl font-semibold text-white font-mono tabular-nums tracking-tight">
                      ${isGroupNode ? (selectedNode.data?.aggregatedAmount || 0).toLocaleString() : (transaction.amount ? Number(transaction.amount).toLocaleString() : '0')}
                    </div>
                    {isGroupNode ? (
                      <div className="text-[11px] text-purple-400 font-medium uppercase tracking-wider mt-0.5">
                        Group Aggregation · {selectedNode.data?.childCount || 0} Nodes
                      </div>
                    ) : transaction.currency && ratesMap[transaction.currency] && (
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        ≈ {(Number(transaction.amount) / ratesMap[transaction.currency]).toFixed(8)} {transaction.currency}
                      </div>
                    )}
                  </div>

                  {/* Meta — simple key-value rows */}
                  <div className="space-y-2 text-xs">
                    {transaction.date && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Date</span>
                        <span className="text-neutral-300">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {transaction.transaction && (
                      <div>
                        <span className="text-neutral-500">Hash</span>
                        <div className="text-[11px] font-mono text-neutral-400 break-all mt-1 leading-relaxed">{transaction.transaction}</div>
                      </div>
                    )}
                    {selectedNode.data.successRate && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Success Rate</span>
                        <span className="text-emerald-400 font-medium">{selectedNode.data.successRate}</span>
                      </div>
                    )}
                    {(selectedNode.data.customParameters || []).map((param: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-neutral-500">{param.title || 'Param'}</span>
                        <span className="text-neutral-300">{param.value}</span>
                      </div>
                    ))}
                    {isFingerprintNode && hasWatchedCurrentLevel && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-neutral-500">Status</span>
                        <span className={`flex items-center gap-1.5 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    )}
                    {isGroupNode && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-neutral-500">Group Status</span>
                        <span className={`flex items-center gap-1.5 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Inline Access Keys */}
                  {(showInlineKeys || (isGroupNode && hasWatchedCurrentLevel)) && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      {pendingKeyRequest ? (
                        (() => {
                          const sa = pendingKeyRequest.scheduledAction;
                          const hasSchedule = sa?.executeAt && sa?.createdAt;
                          return (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Processing Request
                                </div>
                                <span className="text-neutral-500 text-[10px] font-mono tabular-nums">
                                  {pendingKeyRequest.keysCount} key{pendingKeyRequest.keysCount > 1 ? 's' : ''}
                                </span>
                              </div>
                              <FakeTerminal />
                              <p className="text-neutral-500 text-[10px] font-mono text-center">
                                {pendingKeyRequest.keysCount} key{pendingKeyRequest.keysCount > 1 ? 's' : ''} · ${pendingKeyRequest.totalCost?.toFixed(2)} USD
                              </p>

                              <ProcessingSteps
                                executeAt={sa?.executeAt}
                                createdAt={sa?.createdAt}
                              />
                            </div>
                          );
                        })()
                      ) : nodeStatus === 'Locked' ? (
                        <div className="rounded-lg bg-neutral-500/10 border border-neutral-500/15 px-3.5 py-3">
                          <div className="flex items-center gap-2 text-neutral-400 text-sm">
                            <XCircle className="w-3.5 h-3.5" />
                            Unlock previous nodes first
                          </div>
                        </div>
                      ) : (nodeStatus === 'Success' && (!isGroupNode || (selectedNode.data?.childCount || 0) === 0)) ? (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3">
                          <div className="flex items-center justify-between text-emerald-400 text-sm font-medium">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Successful Recovery
                            </span>
                            {selectedNode.data.approvedAmount != null && selectedNode.data.approvedAmount > 0 && (
                              <span className="font-semibold">${Number(selectedNode.data.approvedAmount).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      ) : nodeStatus === 'Pending' ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Processing
                          </div>
                          <FakeTerminal />
                          <ProcessingSteps />
                        </div>
                      ) : (
                        /* Key generation */
                        <div className="space-y-3">
                          {/* Quantity + cost in one row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setKeysCount(Math.max(1, keysCount - 1))}
                                disabled={keysCount <= 1}
                                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center disabled:opacity-20 transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-lg font-semibold text-white w-8 text-center tabular-nums">{keysCount}</span>
                              <button
                                onClick={() => setKeysCount(keysCount + 1)}
                                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-neutral-500 text-xs ml-1">× ${loadingPrice ? '...' : effectivePrice.toFixed(2)}</span>
                            </div>
                            <span className="text-amber-400 font-semibold text-sm tabular-nums">${totalKeyCost.toFixed(2)}</span>
                          </div>

                          {/* Balance line */}
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-600">Available balance</span>
                            <span className={hasSufficientBalance ? 'text-neutral-400' : 'text-red-400'}>${availableBalance.toFixed(2)}</span>
                          </div>

                          {/* CTA */}
                          {hasSufficientBalance ? (
                            <button
                              onClick={handleGenerateKeys}
                              disabled={keyLoading || loadingPrice}
                              className="w-full h-10 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:hover:bg-amber-600 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                            >
                              {keyLoading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                              ) : (
                                <><KeyRound className="w-3.5 h-3.5" /> Generate Keys</>
                              )}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                Insufficient balance
                              </div>
                              <button
                                onClick={() => { onClose(); window.location.href = '/profile'; }}
                                className="w-full h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                              >
                                <DollarSign className="w-3 h-3" /> Top Up Balance
                              </button>
                            </div>
                          )}

                          {/* Info tooltip */}
                          <div className="relative">
                            <button
                              onMouseEnter={() => setShowKeyTooltip(true)}
                              onMouseLeave={() => setShowKeyTooltip(false)}
                              className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors flex items-center gap-1"
                            >
                              <Info className="w-2.5 h-2.5" /> What are Access Keys?
                            </button>
                            {showKeyTooltip && (
                              <div className="absolute bottom-full left-0 mb-1 bg-[#141414] border border-white/10 rounded-lg p-2.5 text-[11px] text-neutral-400 max-w-[280px] z-50 shadow-xl leading-relaxed">
                                Access Keys attempt to reconstruct the transaction path for this node. More keys = higher success probability.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-neutral-600 text-xs">No transaction data</p>
              )}
            </div>
          </div>
        </div>

        <InsufficientBalancePopup
          isOpen={showInsufficientBalancePopup}
          onClose={() => setShowInsufficientBalancePopup(false)}
          requiredAmount={insufficientBalanceInfo.requiredAmount}
          currentBalance={user?.balance || 0}
          tierName={insufficientBalanceInfo.tierName}
        />
      </div>
    );
  }

  // ─── OLD DESIGN (Re-allocate Funds) ───
  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            {isUserNode ? (
              <User className="text-purple-400" size={24} />
            ) : (
              <FileText className="text-purple-400" size={24} />
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isUserNode ? 'Account Details' : 'Transaction Details'}
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-4 relative z-10 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {isUserNode ? (
            /* User Node Content */
            <>
              {/* Username */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="pl-8">
                    <div className="text-xs text-gray-400 mb-1">Username</div>
                    <div className="text-lg font-bold text-white">
                      {user?.name || 'User'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Wallets */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-300">Verified Wallets</h3>
                </div>

                {verifiedWalletsOld.length > 0 ? (
                  <div className="space-y-2">
                    {verifiedWalletsOld.map((wallet, index) => (
                      <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className={`text-xl font-bold ${wallet.color} mt-0.5`}>
                            {wallet.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 mb-1">{wallet.name}</div>
                            <div className="text-xs font-mono text-white break-all">
                              {wallet.address}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-gray-400 text-sm text-center">
                      No wallets added yet
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : hasTransaction ? (
            /* Transaction Node Content */
            <>


              {/* Transaction Amount */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="pl-8 flex flex-row justify-between items-center">
                    <div className="text-xl font-bold text-white font-mono">
                      {transaction.amount ? Number(transaction.amount).toFixed(0) : '0'} USD
                    </div>
                    {transaction.currency && ratesMap[transaction.currency] && (
                      <div className="text-xs text-gray-400 font-mono">
                        ≈ {(Number(transaction.amount) / ratesMap[transaction.currency]).toFixed(8)} {transaction.currency}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              {selectedNode.data.successRate && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="pl-8 flex flex-row justify-between items-center">
                      <div className="text-xs text-gray-400">Success Rate</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        {selectedNode.data.successRate}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Parameters (Old Design) */}
              {(selectedNode.data.customParameters || []).map((param: any, index: number) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div className="pl-8 flex flex-row justify-between items-center">
                      <div className="text-xs text-gray-400">{param.title || 'Param'}</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {param.value}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Transaction Date */}
              {transaction.date && (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="w-full bg-white/5 text-white pl-10 pr-5 py-3 rounded-lg border border-white/10">
                      <div className="text-sm font-medium">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Hash */}
              {transaction.transaction && (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="w-full bg-white/5 text-white pl-10 pr-5 py-3 rounded-lg border border-white/10">
                      <div className="text-xs font-mono break-all">
                        {transaction.transaction}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Transaction Data */
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-purple-300 text-sm text-center">
                No transaction details available for this node.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 relative z-10 space-y-3">
          <PulsatingButton
            pulseColor="#764FCB"
            duration="1.5s"
            variant={
              pendingTierRequest ? "upgradePending" :
                hasStarted ? "loading" :
                  "start"
            }
            isLoading={isUpgrading}
            className="w-full h-12"
            onClick={pendingTierRequest ? undefined : (hasStarted ? undefined : () => {
              if (!user?.walletVerified) {
                toast.error('Please verify your wallet before starting', {
                  description: 'Go to your profile to request wallet verification'
                });
                return;
              }
              onStartAnimation?.();
            })}
            disabled={pendingTierRequest || hasStarted || isUpgrading}
          >
            {pendingTierRequest ? 'Upgrade Pending' : (isUpgrading ? 'Upgrading...' : hasStarted ? 'Running...' : 'Start scan')}
          </PulsatingButton>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Insufficient Balance Popup */}
      <InsufficientBalancePopup
        isOpen={showInsufficientBalancePopup}
        onClose={() => setShowInsufficientBalancePopup(false)}
        requiredAmount={insufficientBalanceInfo.requiredAmount}
        currentBalance={user?.balance || 0}
        tierName={insufficientBalanceInfo.tierName}
      />
    </div>
  );
};

export default NodeDetailsPanel;
