import React, { useState } from 'react';
import { X, ArrowRightLeft, DollarSign, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface TransferPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  if (!isOpen || !user) return null;

  const currentSourceBalance = direction === 'dashboard_to_available' ? user.balance : user.availableBalance;
  
  const handleSwap = () => {
    setDirection(prev => prev === 'dashboard_to_available' ? 'available_to_dashboard' : 'dashboard_to_available');
    setAmount('');
  };

  const handleMax = () => {
    setAmount(currentSourceBalance.toString());
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
        toast.success('🎉 Transfer successful!');
        onSuccess();
        setTimeout(() => {
          onClose();
          setAmount('');
        }, 500);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 aspect-square rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <ArrowRightLeft className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Transfer Funds</h2>
              <p className="text-gray-400 text-sm">Move balance between wallets</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Direction Toggle Card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                    
                    {/* Source */}
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider">From</span>
                        <div className="font-semibold text-white">
                            {direction === 'dashboard_to_available' ? 'Current Balance' : 'Available Balance'}
                        </div>
                        <div className="text-sm text-blue-400 mt-1">
                            ${direction === 'dashboard_to_available' ? user.balance.toFixed(2) : (user.availableBalance || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* Swap Button */}
                    <button 
                        type="button" 
                        onClick={handleSwap}
                        className="mx-4 p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-400 transition-all hover:scale-110"
                    >
                        <ArrowRightLeft className="w-5 h-5" />
                    </button>

                    {/* Destination */}
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider">To</span>
                        <div className="font-semibold text-white">
                            {direction === 'dashboard_to_available' ? 'Available Balance' : 'Current Balance'}
                        </div>
                        <div className="text-sm text-green-400 mt-1">
                            ${direction === 'dashboard_to_available' ? (user.availableBalance || 0).toFixed(2) : user.balance.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">Amount to transfer</label>
                <button type="button" onClick={handleMax} className="text-xs text-blue-400 hover:text-blue-300">Max</button>
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
                  className="w-full bg-white/5 text-white pl-10 pr-16 py-3 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-lg transition-all"
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

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
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
                disabled={isSubmitting || parseFloat(amount) > currentSourceBalance || !amount}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600/40 hover:bg-blue-700 border border-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Transfer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
