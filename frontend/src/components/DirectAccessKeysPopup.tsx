import React, { useState, useEffect } from 'react';
import { X, KeyRound, Minus, Plus, AlertCircle, Loader2, Info, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface DirectAccessKeysPopupProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  nodeId?: string;
  nodeAmount?: number;
  onSuccess: () => void;
}

export const DirectAccessKeysPopup: React.FC<DirectAccessKeysPopupProps> = ({
  isOpen,
  onClose,
  level,
  nodeId,
  nodeAmount,
  onSuccess
}) => {
  const { user, token, refreshUser } = useAuth();
  const [keysCount, setKeysCount] = useState(1);
  const [pricePerKey, setPricePerKey] = useState(20);
  const [loading, setLoading] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [keyPriceMode, setKeyPriceMode] = useState<'static' | 'percent'>('static');
  const [keyPricePercent, setKeyPricePercent] = useState(5);

  // Calculate effective price: if percent mode, derive from nodeAmount
  const effectivePrice = keyPriceMode === 'percent'
    ? Math.max(1, ((nodeAmount || 0) * keyPricePercent) / 100)
    : pricePerKey;
  const totalCost = keysCount * effectivePrice;
  const availableBalance = user?.availableBalance || 0;
  const hasSufficientBalance = availableBalance >= totalCost;

  useEffect(() => {
    if (isOpen && nodeId) {
      setKeysCount(1);
      fetchPrice();
      checkPendingRequest();
    }
  }, [isOpen, nodeId]);

  const fetchPrice = async () => {
    setLoadingPrice(true);
    try {
      const res = await apiFetch('/global-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setPricePerKey(json.data.directAccessKeyPrice || 20);
        setKeyPriceMode(json.data.keyPriceMode || 'static');
        setKeyPricePercent(json.data.directAccessKeyPricePercent ?? 5);
      }
    } catch (e) {
      console.error('Failed to fetch key price');
    } finally {
      setLoadingPrice(false);
    }
  };

  const checkPendingRequest = async () => {
    if (!nodeId) return;
    try {
      const res = await apiFetch('/key-generation/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        // Find pending request specifically for this node
        const pending = json.data?.find((r: any) => r.nodeId === nodeId && r.status === 'pending');
        setPendingRequest(pending || null);
      }
    } catch (e) {
      console.error('Failed to check pending requests');
    }
  };

  const handleGenerateKeys = async () => {
    if (!hasSufficientBalance || !nodeId) return;

    setLoading(true);
    try {
      const res = await apiFetch('/key-generation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ level, keysCount, nodeId, nodeAmount })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`${keysCount} Direct Access Key${keysCount > 1 ? 's' : ''} generated for Node successfully!`);
        await refreshUser();
        onSuccess();
        setPendingRequest(json.data);
      } else {
        toast.error(json?.message || 'Failed to generate keys');
      }
    } catch (e) {
      toast.error('Failed to generate keys for this node');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
            <KeyRound className="text-orange-400 w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Generate Access Keys</h2>
            <p className="text-xs text-gray-400">Node: {nodeId}</p>
          </div>
        </div>

        {/* If pending request exists show waiting state */}
        {pendingRequest ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                <span className="font-semibold text-yellow-400">Processing Request</span>
              </div>
              <p className="text-sm text-gray-300">
                You have a pending generation request for <strong>{pendingRequest.keysCount}</strong> key{pendingRequest.keysCount > 1 ? 's' : ''} against this specific node.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Total cost: ${pendingRequest.totalCost?.toFixed(2)} USD — Awaiting system/admin validation.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/20"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Cost per Key */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Cost per Node Key</span>
                <span className="text-lg font-bold text-white">
                  {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : `$${effectivePrice.toFixed(2)} USD`}
                </span>
              </div>
              {keyPriceMode === 'percent' && !loadingPrice && (
                <p className="text-[11px] text-gray-500 mt-1">
                  {keyPricePercent}% of ${(nodeAmount || 0).toLocaleString()} node amount
                </p>
              )}
            </div>

            {/* Key Quantity Selector */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Number of Attempts</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setKeysCount(Math.max(1, keysCount - 1))}
                  disabled={keysCount <= 1}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 disabled:opacity-30 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-3xl font-bold text-white w-16 text-center">{keysCount}</span>
                <button
                  onClick={() => setKeysCount(keysCount + 1)}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Total Cost Display */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-400">Keys: {keysCount}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Available Balance: <span className={hasSufficientBalance ? 'text-green-400' : 'text-red-400'}>${availableBalance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-400">Total Cost</span>
                  <p className="text-2xl font-bold text-orange-400">${totalCost.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            {/* Tooltip */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Info className="w-3 h-3" />
                What are Direct Access Keys?
              </button>
              {showTooltip && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/15 rounded-lg p-3 text-xs text-gray-300 max-w-xs z-50 shadow-xl">
                  Direct Access Keys allow the system to attempt reconstruction of the transaction path for this specific Node.
                  Multiple keys increase the probability of successful access.
                </div>
              )}
            </div>

            {/* Action Button */}
            {hasSufficientBalance ? (
              <Button
                onClick={handleGenerateKeys}
                disabled={loading || loadingPrice}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" /> Generate Keys
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Insufficient available balance</span>
                </div>
                <Button
                  onClick={() => {
                    onClose();
                    // Navigate to profile for top-up
                    window.location.href = '/profile';
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold"
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Request Top Up
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectAccessKeysPopup;
