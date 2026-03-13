import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, KeyRound, Snowflake, AlertTriangle, X, Minus, Plus, Loader2, Info, DollarSign } from 'lucide-react';
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

  const totalKeyCost = keysCount * pricePerKey;
  const availableBalance = user?.availableBalance || 0;
  const hasSufficientBalance = availableBalance >= totalKeyCost;

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
    if (selectedNode.type !== 'fingerprintNode' || !hasWatchedCurrentLevel) return;

    setKeysCount(1);
    (async () => {
      setLoadingPrice(true);
      try {
        const res = await apiFetch('/global-settings', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok && json?.success) setPricePerKey(json.data.directAccessKeyPrice || 20);
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
      const res = await apiFetch('/key-generation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level, keysCount, nodeId: selectedNode.id, nodeAmount: selectedNode.data?.transaction?.amount })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`${keysCount} Access Key${keysCount > 1 ? 's' : ''} generated`);
        await refreshUser();
        setPendingKeyRequest(json.data);
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
  const hasTransaction = selectedNode.data.transaction;
  const transaction = selectedNode.data.transaction || {};

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

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'Success': { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400', label: 'Verified' },
    'Pending': { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-400', label: 'Pending' },
    'Fail': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-400', label: 'Failed' },
    'Locked': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-neutral-500', label: 'Locked' },
    'Cold Wallet': { icon: <Snowflake className="w-3.5 h-3.5" />, color: 'text-sky-400', label: 'Cold' },
    'Reported': { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-orange-400', label: 'Reported' },
    'Available': { icon: <KeyRound className="w-3.5 h-3.5" />, color: 'text-amber-400', label: 'Awaiting' },
  };
  const status = statusConfig[nodeStatus] || statusConfig['Available'];

  const showInlineKeys = isFingerprintNode && hasWatchedCurrentLevel && withdrawalSystem === 'direct_access_keys';

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
                    ${transaction.amount ? Number(transaction.amount).toLocaleString() : '0'}
                  </div>
                  {transaction.currency && ratesMap[transaction.currency] && (
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
                  {isFingerprintNode && hasWatchedCurrentLevel && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-neutral-500">Status</span>
                      <span className={`flex items-center gap-1.5 ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline Access Keys */}
                {showInlineKeys && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    {pendingKeyRequest ? (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing Request
                        </div>
                        <p className="text-neutral-400 text-xs mt-1.5">
                          {pendingKeyRequest.keysCount} key{pendingKeyRequest.keysCount > 1 ? 's' : ''} · ${pendingKeyRequest.totalCost?.toFixed(2)} USD
                        </p>
                      </div>
                    ) : nodeStatus === 'Locked' ? (
                      <div className="rounded-lg bg-neutral-500/10 border border-neutral-500/15 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-neutral-400 text-sm">
                          <XCircle className="w-3.5 h-3.5" />
                          Unlock previous nodes first
                        </div>
                      </div>
                    ) : nodeStatus === 'Success' ? (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Node Unlocked ✓
                        </div>
                      </div>
                    ) : nodeStatus === 'Pending' ? (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Awaiting Admin Review
                        </div>
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
                            <span className="text-neutral-500 text-xs ml-1">× ${loadingPrice ? '...' : pricePerKey}</span>
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

          {/* Bottom actions */}
          {!showInlineKeys && withdrawalSystem !== 'direct_access_keys' && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <PulsatingButton
                pulseColor="#764FCB"
                duration="1.5s"
                variant={pendingTierRequest ? "upgradePending" : hasStarted ? "loading" : "start"}
                isLoading={isUpgrading}
                className="w-full h-9"
                onClick={pendingTierRequest ? undefined : (hasStarted ? undefined : () => {
                  if (!user?.walletVerified) {
                    toast.error('Please verify your wallet before starting', { description: 'Go to your profile to request wallet verification' });
                    return;
                  }
                  onStartAnimation?.();
                })}
                disabled={pendingTierRequest || hasStarted || isUpgrading}
              >
                {pendingTierRequest ? 'Upgrade Pending' : (isUpgrading ? 'Upgrading...' : hasStarted ? 'Running...' : 'Start scan')}
              </PulsatingButton>
            </div>
          )}
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
};

export default NodeDetailsPanel;
