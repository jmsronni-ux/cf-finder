import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, DollarSign, AlertCircle, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
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

  // Fetch fee settings + all transfers on open
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
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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
  }, [isOpen, token]);

  if (!isOpen || !user) return null;

  const currentSourceBalance = direction === 'dashboard_to_available' ? user.balance : user.availableBalance;
  const isOnchainToAvailable = direction === 'dashboard_to_available';
  
  // Calculate fee (only for onchain → available)
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
        body: JSON.stringify({
          amount: transferAmount,
          direction
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (isOnchainToAvailable) {
          toast.success('📋 Transfer request submitted for admin approval!');
          // Add to pending list immediately
          if (data.data) {
            setTransfers(prev => [data.data, ...prev]);
          }
        } else {
          toast.success('🎉 Transfer successful!');
        }
        onSuccess();
        setAmount('');
        if (!isOnchainToAvailable) {
          setTimeout(() => onClose(), 500);
        }
      } else {
        toast.error(data.message || 'Transfer failed. Please try again.');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromLabel = direction === 'dashboard_to_available' ? 'Onchain' : 'Available';
  const toLabel = direction === 'dashboard_to_available' ? 'Available' : 'Onchain';
  const fromBalance = direction === 'dashboard_to_available' ? user.balance : (user.availableBalance || 0);
  const toBalance = direction === 'dashboard_to_available' ? (user.availableBalance || 0) : user.balance;

  const hasTransfers = transfers.length > 0;

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`flex items-stretch gap-4 transition-all duration-300 ${hasTransfers ? 'max-w-[740px]' : 'max-w-md'} w-full mx-4`}>
        
        {/* Left: Transfer Form */}
        <div className="flex-1 relative bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 min-w-0">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 aspect-square rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <ArrowRightLeft className="text-purple-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Transfer Funds</h2>
                <p className="text-gray-400 text-sm">Move balance between wallets</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Direction Toggle Card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider">From</span>
                    <div className="font-semibold text-white">{fromLabel}</div>
                    <div className="text-sm text-purple-400 mt-1">${fromBalance.toFixed(2)}</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleSwap}
                    className="mx-4 p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 text-purple-400 transition-all hover:scale-110"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider">To</span>
                    <div className="font-semibold text-white">{toLabel}</div>
                    <div className="text-sm text-green-400 mt-1">${toBalance.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-400">Amount to transfer</label>
                  <button type="button" onClick={handleMax} className="text-xs text-purple-400 hover:text-purple-300">Max</button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={currentSourceBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 text-white pl-10 pr-16 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                    disabled={isSubmitting}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-sm text-gray-500 font-medium font-mono">USD</span>
                  </div>
                </div>
                {parseFloat(amount) > currentSourceBalance && (
                  <p className="mt-1 text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Amount exceeds available balance
                  </p>
                )}
              </div>

              {/* Fee Preview (only for onchain → available with fee > 0) */}
              {isOnchainToAvailable && parsedAmount > 0 && feeSettings.value > 0 && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Transfer Amount</span>
                    <span className="text-white">${parsedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      Fee ({feeSettings.mode === 'percent' ? `${feeSettings.value}%` : `$${feeSettings.value}`})
                    </span>
                    <span className="text-red-400">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm">
                    <span className="text-gray-300 font-medium">You'll receive</span>
                    <span className="text-green-400 font-bold">${netAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || parseFloat(amount) > currentSourceBalance || !amount || (isOnchainToAvailable && netAmount <= 0 && parsedAmount > 0)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600/40 hover:bg-purple-700 border border-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
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
        </div>

        {/* Right: Transfer History Panel (separate element) */}
        {hasTransfers && (
          <div className="w-[260px] flex-shrink-0 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Transfer History</h3>
              <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-medium">
                {transfers.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1 -mr-1 scrollbar-thin scrollbar-thumb-white/10">
              {loadingTransfers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div
                    key={transfer._id}
                    className={`group relative bg-white/5 border rounded-lg p-3 transition-all ${
                      transfer.status === 'pending' ? 'border-purple-500/20 hover:border-purple-500/40' :
                      transfer.status === 'approved' ? 'border-green-500/20 hover:border-green-500/40' :
                      'border-red-500/20 hover:border-red-500/40'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className="absolute top-2.5 right-2.5">
                      {transfer.status === 'pending' ? (
                        <div className="relative w-3.5 h-3.5">
                          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" />
                        </div>
                      ) : transfer.status === 'approved' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <DollarSign className={`w-3.5 h-3.5 ${
                        transfer.status === 'pending' ? 'text-purple-400' :
                        transfer.status === 'approved' ? 'text-green-400' : 'text-red-400'
                      }`} />
                      <span className="text-sm font-bold text-white">${transfer.amount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeSince(transfer.createdAt)}
                      </span>
                      {transfer.feeAmount > 0 && (
                        <span className="text-gray-500">
                          Fee: <span className="text-red-400/80">${transfer.feeAmount.toFixed(2)}</span>
                        </span>
                      )}
                    </div>

                    {/* Admin note for rejected */}
                    {transfer.status === 'rejected' && transfer.adminNote && (
                      <div className="mt-2 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-300 leading-tight">
                        {transfer.adminNote}
                      </div>
                    )}

                    {/* Processing bar for pending */}
                    {transfer.status === 'pending' && (
                      <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full w-1/2 bg-gradient-to-r from-purple-500/60 to-transparent rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
