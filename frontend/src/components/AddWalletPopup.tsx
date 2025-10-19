import React, { useState } from 'react';
import { Wallet, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateWalletAddress } from '../utils/walletValidation';
import { apiFetch } from '../utils/api';

interface AddWalletPopupProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  isPopup?: boolean; // New prop to determine if it's a popup or inline
}

const AddWalletPopup: React.FC<AddWalletPopupProps> = ({ 
  isOpen = true, 
  onClose, 
  onSuccess,
  isPopup = true
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  if (isPopup && !isOpen) return null;

  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWalletAddress(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
    
    // Validate on change if there's a value
    if (value.trim()) {
      const validation = validateWalletAddress(value, 'btc');
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid BTC wallet address');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!walletAddress.trim()) {
      setValidationError('Please enter a wallet address');
      toast.error('Please enter a wallet address');
      return;
    }

    // Validate BTC wallet address format
    const validation = validateWalletAddress(walletAddress, 'btc');
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid BTC wallet address');
      toast.error(validation.error || 'Invalid BTC wallet address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/user/me/wallets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          wallets: {
            btc: walletAddress.trim()
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet added successfully!');
        setWalletAddress('');
        onSuccess();
        if (onClose) onClose();
      } else {
        toast.error(data.message || 'Failed to add wallet. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  // Inline version (not popup)
  if (!isPopup) {
    return (
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-[#F7931A]/20 flex items-center justify-center border border-[#F7931A]/30">
            <Wallet className="text-[#F7931A]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Add Your Bitcoin Wallet</h2>
            <p className="text-gray-400 text-sm">Add your BTC wallet address to start receiving withdrawals</p>
          </div>
        </div>

        {/* Info Box */}
        <div className={`rounded-lg p-3 mb-4 transition-all ${
          validationError 
            ? 'bg-red-500/10 border border-red-500/30' 
            : 'bg-[#F7931A]/10 border border-[#F7931A]/20'
        }`}>
          <p className={`text-xs ${validationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {validationError || 'A BTC wallet address is required to start a scan and receive withdrawals.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Wallet Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bitcoin (BTC) Wallet Address</label>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${validationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={walletAddress}
                onChange={handleWalletChange}
                placeholder="BTC Wallet Address"
                className={`w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-1 font-mono text-sm transition-all ${
                  validationError 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
                    : 'border-white/10 focus:border-[#F7931A]/50 focus:ring-[#F7931A]/50'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !walletAddress.trim()}
            className="w-full px-6 py-3 bg-[#F7931A]/40 hover:bg-[#F7931A]/60 border border-[#F7931A] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding Wallet...' : 'Add Wallet'}
          </button>
        </form>
      </div>
    );
  }

  // Popup version
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Required badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#F7931A] text-white text-xs font-bold px-3 py-1 rounded-full">
            REQUIRED
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-[#F7931A]/20 flex items-center justify-center border border-[#F7931A]/30">
            <Wallet className="text-[#F7931A]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Bitcoin Wallet Required</h2>
            <p className="text-gray-400 text-sm">Please add your BTC wallet address to continue using the platform</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Info Box */}
          <div className={`rounded-lg p-3 transition-all ${
            validationError 
              ? 'bg-red-500/10 border border-red-500/30' 
              : 'bg-[#F7931A]/10 border border-[#F7931A]/20'
          }`}>
            <p className={`text-xs ${validationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
              <AlertCircle className="w-4 h-4 inline mr-3" />
              {validationError || 'A BTC wallet address is required to start a scan'}
            </p>
          </div>
          
          {/* Wallet Address Input */}
          <div>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${validationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={walletAddress}
                onChange={handleWalletChange}
                placeholder="BTC Wallet Address"
                className={`w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-1 font-mono text-sm transition-all ${
                  validationError 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
                    : 'border-white/10 focus:border-[#F7931A]/50 focus:ring-[#F7931A]/50'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGoToProfile}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all disabled:opacity-50"
            >
              Go to Profile
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !walletAddress.trim()}
              className="flex-1 px-6 py-3 bg-[#F7931A]/40 hover:bg-[#F7931A]/60 border border-[#F7931A] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Add Wallet'}
            </button>
          </div>
        </form>

        {/* Info text */}
        <div className="mt-4 text-center relative z-10">
          <p className="text-xs text-gray-400">
            You can also add your wallet from your profile page
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddWalletPopup;
