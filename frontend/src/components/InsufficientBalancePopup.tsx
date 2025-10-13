import React, { useState } from 'react';
import { X, DollarSign, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface InsufficientBalancePopupProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
  currentBalance: number;
  tierName?: string;
}

const InsufficientBalancePopup: React.FC<InsufficientBalancePopupProps> = ({ 
  isOpen, 
  onClose, 
  requiredAmount,
  currentBalance,
  tierName = 'Next Tier'
}) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { token } = useAuth();

  const shortfall = requiredAmount - currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch('/topup-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowSuccess(true);
        toast.success('Top-up request submitted successfully!');
        
        // Show success state for 2 seconds, then close
        setTimeout(() => {
          setAmount('');
          setShowSuccess(false);
          onClose();
        }, 3000);
      } else {
        toast.error(data.message || 'Failed to submit top-up request');
      }
    } catch (error) {
      console.error('Top-up request error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          disabled={isLoading || showSuccess}
        >
          <X size={24} />
        </button>

        {showSuccess ? (
          /* Success State */
          <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
            <div className="w-20 h-20 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 animate-pulse border border-green-500/30">
              <CheckCircle className="text-green-500" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
            <p className="text-gray-400">Your top-up request for <span className="text-green-500 font-bold">${amount}</span> has been submitted successfully.</p>
            <p className="text-gray-500 text-sm mt-4">An administrator will review your request shortly.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <AlertCircle className="text-red-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Insufficient Balance</h2>
                <p className="text-gray-400 text-sm">You need more funds to upgrade</p>
              </div>
            </div>

            {/* Balance Info */}
            <div className="space-y-3 mb-6 relative z-10">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Current Balance:</span>
                  <span className="text-white font-semibold">${currentBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Required for {tierName}:</span>
                  <span className="text-purple-400 font-semibold">${requiredAmount.toLocaleString()}</span>
                </div>
                <div className="h-px bg-white/10 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Amount Needed:</span>
                  <span className="text-red-400 font-bold">${shortfall.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-300">
                  Upgrade to unlock higher rewards and exclusive benefits!
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Request Top-Up Amount
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Minimum: ${shortfall.toFixed(2)}`}
                    className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-300">
                  <strong>Note:</strong> Your request will be reviewed by an administrator. You'll be notified once it's processed.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-purple-600/40 hover:bg-purple-700 border border-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default InsufficientBalancePopup;

