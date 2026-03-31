import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownUp, AlertCircle, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface TransferPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FeeSettings {
  mode: 'percent' | 'fixed';
  value: number;
}

interface TransferHistory {
  _id: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  feeMode: string;
  feeValue: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
}

export const TransferPopup: React.FC<TransferPopupProps> = ({ 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { user, token } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [direction, setDirection] = useState<'dashboard_to_available' | 'available_to_dashboard'>('dashboard_to_available');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({ mode: 'fixed', value: 0 });
  const [transfers, setTransfers] = useState<TransferHistory[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFeeSettings = async () => {
      try {
        const response = await apiFetch('/global-settings', { method: 'GET' });
        const data = await response.json();
        if (response.ok && data.success && data.data) {
          setFeeSettings({
            mode: data.data.transferFeeMode || 'fixed',
            value: data.data.transferFeeValue || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching fee settings:', error);
      }
    };

    const fetchTransfers = async () => {
      setLoadingTransfers(true);
      try {
        const response = await apiFetch('/transfer-request/my-requests', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setTransfers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching transfers:', error);
      } finally {
        setLoadingTransfers(false);
      }
    };

    fetchFeeSettings();
    fetchTransfers();

    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen, token]);

  if (!isOpen || !user) return null;

  const currentSourceBalance = direction === 'dashboard_to_available' ? user.balance : user.availableBalance;
  const isOnchainToAvailable = direction === 'dashboard_to_available';
  
  const parsedAmount = parseFloat(amount) || 0;
  const feeAmount = isOnchainToAvailable && feeSettings.value > 0
    ? feeSettings.mode === 'percent'
      ? Math.round((parsedAmount * feeSettings.value / 100) * 100) / 100
      : Math.min(feeSettings.value, parsedAmount)
    : 0;
  const netAmount = Math.round((parsedAmount - feeAmount) * 100) / 100;

  const handleSwap = () => {
    setDirection(prev => prev === 'dashboard_to_available' ? 'available_to_dashboard' : 'dashboard_to_available');
    setAmount('');
  };

  const handleMax = () => {
    const floored = Math.floor(currentSourceBalance * 100) / 100;
    setAmount(floored.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transferAmount = parseFloat(amount);
    
    if (!transferAmount || transferAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (transferAmount > currentSourceBalance) {
      toast.error('Amount exceeds available balance in source wallet');
      return;
    }
    if (isOnchainToAvailable && netAmount <= 0) {
      toast.error('Transfer amount is too small to cover the fee');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/balance/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: transferAmount, direction }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (isOnchainToAvailable) {
          toast.success('Transfer request submitted for approval');
          if (data.data) setTransfers(prev => [data.data, ...prev]);
        } else {
          toast.success('Transfer completed');
        }
        onSuccess();
        setAmount('');
        if (!isOnchainToAvailable) setTimeout(() => onClose(), 500);
      } else {
        toast.error(data.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromLabel = direction === 'dashboard_to_available' ? 'Onchain' : 'Available';
  const toLabel = direction === 'dashboard_to_available' ? 'Available' : 'Onchain';
  const fromBalance = direction === 'dashboard_to_available' ? user.balance : (user.availableBalance || 0);
  const toBalance = direction === 'dashboard_to_available' ? (user.availableBalance || 0) : user.balance;

  const hasTransfers = transfers.length > 0;
  const showHistoryPanel = loadingTransfers || hasTransfers;

  const fmtBal = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isOverBalance = parsedAmount > currentSourceBalance;
  const canSubmit = !isSubmitting && amount && parsedAmount > 0 && !isOverBalance && !(isOnchainToAvailable && netAmount <= 0 && parsedAmount > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 cursor-pointer" onClick={() => { if (!isSubmitting) onClose(); }} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        className={`relative flex items-stretch gap-3 ${showHistoryPanel ? 'max-w-[680px]' : 'max-w-[400px]'} w-full mx-4 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]`}
      >
        {/* ─── Main Form ─── */}
        <div className="flex-1 bg-[#0c0c0c] border border-white/[0.07] rounded-xl overflow-hidden min-w-0">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-200 leading-none">Transfer</h2>
              <p className="text-[11px] text-neutral-600 mt-1.5 font-mono">Move funds between wallets</p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Direction */}
            <div className="mx-5 mb-4">
              <div className="relative">
                {/* From */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">From · {fromLabel}</span>
                    <span className="text-[11px] font-mono text-neutral-500">${fmtBal(fromBalance)}</span>
                  </div>

                  {/* Amount input inline */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-neutral-500 text-lg font-light">$</span>
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-white text-xl font-medium placeholder:text-neutral-700 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleMax}
                      className="text-[10px] font-mono text-purple-400/80 hover:text-purple-300 uppercase tracking-wider transition-colors px-1.5 py-0.5 rounded bg-purple-500/[0.08] hover:bg-purple-500/[0.14]"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Swap button */}
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 flex items-center justify-center" style={{ top: 'calc(50% + 2px)' }}>
                  <button 
                    type="button" 
                    onClick={handleSwap}
                    className="w-8 h-8 rounded-lg bg-[#0c0c0c] border border-white/[0.1] flex items-center justify-center text-neutral-500 hover:text-purple-400 hover:border-purple-500/30 transition-all group"
                  >
                    <ArrowDownUp className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* To */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">To · {toLabel}</span>
                    <span className="text-[11px] font-mono text-neutral-500">${fmtBal(toBalance)}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-neutral-500 text-lg font-light">$</span>
                    <span className="text-neutral-400 text-xl font-medium">
                      {parsedAmount > 0 ? fmtBal(isOnchainToAvailable ? netAmount : parsedAmount) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation error */}
              {isOverBalance && (
                <p className="mt-2 text-red-400/90 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  Exceeds source balance
                </p>
              )}
            </div>

            {/* Fee breakdown */}
            {isOnchainToAvailable && parsedAmount > 0 && feeSettings.value > 0 && (
              <div className="mx-5 mb-4 border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 flex justify-between items-center text-[11px]">
                  <span className="text-neutral-500 font-mono">
                    Fee {feeSettings.mode === 'percent' ? `${feeSettings.value}%` : `$${feeSettings.value}`}
                  </span>
                  <span className="text-red-400/80 font-mono">−${feeAmount.toFixed(2)}</span>
                </div>
                <div className="px-3.5 py-2 flex justify-between items-center text-[11px] border-t border-white/[0.04]">
                  <span className="text-neutral-400">Recipient gets</span>
                  <span className="text-emerald-400 font-medium font-mono">${netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="px-5 pb-5">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-10 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed bg-purple-500/[0.15] text-purple-300 border border-purple-500/[0.25] hover:bg-purple-500/[0.25] hover:border-purple-500/[0.4] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing
                  </>
                ) : isOnchainToAvailable ? (
                  'Submit Request'
                ) : (
                  'Confirm Transfer'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── History Panel ─── */}
        {showHistoryPanel && (
          <div className="w-[240px] flex-shrink-0 bg-[#0c0c0c] border border-white/[0.07] rounded-xl flex flex-col max-h-[480px] overflow-hidden">
            {/* History header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-shrink-0">
              <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">History</span>
              {hasTransfers && (
                <span className="text-[10px] font-mono text-neutral-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {transfers.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 min-h-0 scrollbar-thin scrollbar-thumb-white/5">
              {loadingTransfers ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
                </div>
              ) : (
                transfers.map((transfer, i) => {
                  const isPending = transfer.status === 'pending';
                  const isApproved = transfer.status === 'approved';
                  const isRejected = transfer.status === 'rejected';

                  return (
                    <div
                      key={transfer._id}
                      className="rounded-lg px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Top row: amount + status */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-neutral-200 font-mono">
                          ${transfer.amount.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1">
                          {isPending && (
                            <div className="relative w-3 h-3">
                              <div className="absolute inset-0 rounded-full border border-purple-500/30" />
                              <div className="absolute inset-0 rounded-full border border-transparent border-t-purple-400 animate-spin" />
                            </div>
                          )}
                          {isApproved && <CheckCircle className="w-3 h-3 text-emerald-500/70" />}
                          {isRejected && <XCircle className="w-3 h-3 text-red-400/70" />}
                          <span className={`text-[10px] font-mono uppercase tracking-wider ${
                            isPending ? 'text-purple-400/60' :
                            isApproved ? 'text-emerald-500/60' :
                            'text-red-400/60'
                          }`}>
                            {transfer.status}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row: time + fee */}
                      <div className="flex items-center justify-between text-[10px] text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeSince(transfer.createdAt)}
                        </span>
                        {transfer.feeAmount > 0 && (
                          <span className="font-mono">Fee ${transfer.feeAmount.toFixed(2)}</span>
                        )}
                      </div>

                      {/* Rejected admin note */}
                      {isRejected && transfer.adminNote && (
                        <div className="mt-1.5 px-2 py-1 rounded bg-red-500/[0.06] border border-red-500/[0.1] text-[10px] text-red-300/80 leading-snug">
                          {transfer.adminNote}
                        </div>
                      )}

                      {/* Pending indicator */}
                      {isPending && (
                        <div className="mt-1.5 h-px bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-purple-500/30 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
