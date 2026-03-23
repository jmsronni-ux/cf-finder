import React, { useState } from 'react';
import { Wallet, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateWalletAddress } from '../utils/walletValidation';
import { apiFetch } from '../utils/api';

interface AddWalletPopupProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  isPopup?: boolean;
}

type InputMode = 'wallet' | 'access_code';

const AddWalletPopup: React.FC<AddWalletPopupProps> = ({ 
  isOpen = true, 
  onClose, 
  onSuccess,
  isPopup = true
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('wallet');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [accessCode, setAccessCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  if (isPopup && !isOpen) return null;

  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWalletAddress(value);
    
    if (validationError) {
      setValidationError('');
    }
    
    if (value.trim()) {
      const validation = validateWalletAddress(value, 'btc');
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid BTC wallet address');
      }
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccessCode(value);
    if (validationError) {
      setValidationError('');
    }
  };

  const handleModeSwitch = (mode: InputMode) => {
    setInputMode(mode);
    setValidationError('');
    setWalletAddress('');
    setAccessCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'wallet') {
      // --- Wallet address flow ---
      if (!walletAddress.trim()) {
        setValidationError('Please enter a wallet address');
        toast.error('Please enter a wallet address');
        return;
      }

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
            wallets: { btc: walletAddress.trim() }
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
    } else {
      // --- Access code flow ---
      if (!accessCode.trim()) {
        setValidationError('Please enter your forensic access code');
        toast.error('Please enter your forensic access code');
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await apiFetch('/wallet-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            submissionType: 'access_code',
            forensicAccessCode: accessCode.trim(),
            walletType: 'btc'
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Access code submitted for verification!');
          setAccessCode('');
          onSuccess();
          if (onClose) onClose();
        } else {
          toast.error(data.message || 'Failed to submit access code. Please try again.');
        }
      } catch (error) {
        toast.error('An error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  // Mode toggle tabs component
  const ModeToggle = () => (
    <div className="flex bg-white/5 rounded-lg p-1 mb-5 relative z-10">
      <button
        type="button"
        onClick={() => handleModeSwitch('wallet')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          inputMode === 'wallet'
            ? 'bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Wallet size={16} />
        Wallet Address
      </button>
      <button
        type="button"
        onClick={() => handleModeSwitch('access_code')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          inputMode === 'access_code'
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Key size={16} />
        Access Code
      </button>
    </div>
  );

  const accentColor = inputMode === 'wallet' ? '#F7931A' : '#a855f7';
  const accentColorClass = inputMode === 'wallet' ? '[#F7931A]' : 'purple-500';

  // Inline version (not popup)
  if (!isPopup) {
    return (
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
            inputMode === 'wallet' 
              ? 'bg-[#F7931A]/20 border-[#F7931A]/30' 
              : 'bg-purple-500/20 border-purple-500/30'
          }`}>
            {inputMode === 'wallet' 
              ? <Wallet className="text-[#F7931A]" size={24} />
              : <Key className="text-purple-400" size={24} />
            }
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {inputMode === 'wallet' ? 'Add Your Bitcoin Wallet' : 'Enter Access Code'}
            </h2>
            <p className="text-gray-400 text-sm">
              {inputMode === 'wallet' 
                ? 'Add your BTC wallet address to start receiving withdrawals'
                : 'Enter your forensic access code for verification'
              }
            </p>
          </div>
        </div>

        <ModeToggle />

        {/* Info Box */}
        <div className={`rounded-lg p-3 mb-4 transition-all ${
          validationError 
            ? 'bg-red-500/10 border border-red-500/30' 
            : inputMode === 'wallet'
              ? 'bg-[#F7931A]/10 border border-[#F7931A]/20'
              : 'bg-purple-500/10 border border-purple-500/20'
        }`}>
          <p className={`text-xs ${validationError ? 'text-red-400' : inputMode === 'wallet' ? 'text-[#F7931A]' : 'text-purple-400'}`}>
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {validationError || (inputMode === 'wallet' 
              ? 'A BTC wallet address is required to start a scan and receive withdrawals.'
              : 'Enter your forensic access code. An admin will verify your submission.'
            )}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {inputMode === 'wallet' ? 'Bitcoin (BTC) Wallet Address' : 'Forensic Access Code'}
            </label>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                validationError ? 'text-red-400' : inputMode === 'wallet' ? 'text-[#F7931A]' : 'text-purple-400'
              }`}>
                {inputMode === 'wallet' ? <Wallet className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={inputMode === 'wallet' ? walletAddress : accessCode}
                onChange={inputMode === 'wallet' ? handleWalletChange : handleAccessCodeChange}
                placeholder={inputMode === 'wallet' ? 'BTC Wallet Address' : 'Enter your access code'}
                className={`w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-1 ${inputMode === 'wallet' ? 'font-mono' : ''} text-sm transition-all ${
                  validationError 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
                    : inputMode === 'wallet'
                      ? 'border-white/10 focus:border-[#F7931A]/50 focus:ring-[#F7931A]/50'
                      : 'border-white/10 focus:border-purple-500/50 focus:ring-purple-500/50'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (inputMode === 'wallet' ? !walletAddress.trim() : !accessCode.trim())}
            className={`w-full px-6 py-3 border text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              inputMode === 'wallet'
                ? 'bg-[#F7931A]/40 hover:bg-[#F7931A]/60 border-[#F7931A]'
                : 'bg-purple-500/40 hover:bg-purple-500/60 border-purple-500'
            }`}
          >
            {isSubmitting 
              ? (inputMode === 'wallet' ? 'Adding Wallet...' : 'Submitting...') 
              : (inputMode === 'wallet' ? 'Add Wallet' : 'Submit Access Code')
            }
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
          <span className={`text-white text-xs font-bold px-3 py-1 rounded-full ${
            inputMode === 'wallet' ? 'bg-[#F7931A]' : 'bg-purple-500'
          }`}>
            REQUIRED
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
            inputMode === 'wallet' 
              ? 'bg-[#F7931A]/20 border-[#F7931A]/30' 
              : 'bg-purple-500/20 border-purple-500/30'
          }`}>
            {inputMode === 'wallet' 
              ? <Wallet className="text-[#F7931A]" size={24} />
              : <Key className="text-purple-400" size={24} />
            }
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {inputMode === 'wallet' ? 'Bitcoin Wallet Required' : 'Access Code Required'}
            </h2>
            <p className="text-gray-400 text-sm">
              {inputMode === 'wallet' 
                ? 'Please add your BTC wallet address to continue using the platform'
                : 'Enter your forensic access code for admin verification'
              }
            </p>
          </div>
        </div>

        <ModeToggle />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Info Box */}
          <div className={`rounded-lg p-3 transition-all ${
            validationError 
              ? 'bg-red-500/10 border border-red-500/30' 
              : inputMode === 'wallet'
                ? 'bg-[#F7931A]/10 border border-[#F7931A]/20'
                : 'bg-purple-500/10 border border-purple-500/20'
          }`}>
            <p className={`text-xs ${validationError ? 'text-red-400' : inputMode === 'wallet' ? 'text-[#F7931A]' : 'text-purple-400'}`}>
              <AlertCircle className="w-4 h-4 inline mr-3" />
              {validationError || (inputMode === 'wallet' 
                ? 'A BTC wallet address is required to start a scan'
                : 'Your access code will be verified by an admin before you can proceed'
              )}
            </p>
          </div>
          
          {/* Input */}
          <div>
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                validationError ? 'text-red-400' : inputMode === 'wallet' ? 'text-[#F7931A]' : 'text-purple-400'
              }`}>
                {inputMode === 'wallet' ? <Wallet className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={inputMode === 'wallet' ? walletAddress : accessCode}
                onChange={inputMode === 'wallet' ? handleWalletChange : handleAccessCodeChange}
                placeholder={inputMode === 'wallet' ? 'BTC Wallet Address' : 'Enter your access code'}
                className={`w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-1 ${inputMode === 'wallet' ? 'font-mono' : ''} text-sm transition-all ${
                  validationError 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
                    : inputMode === 'wallet'
                      ? 'border-white/10 focus:border-[#F7931A]/50 focus:ring-[#F7931A]/50'
                      : 'border-white/10 focus:border-purple-500/50 focus:ring-purple-500/50'
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
              disabled={isSubmitting || (inputMode === 'wallet' ? !walletAddress.trim() : !accessCode.trim())}
              className={`flex-1 px-6 py-3 border text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                inputMode === 'wallet'
                  ? 'bg-[#F7931A]/40 hover:bg-[#F7931A]/60 border-[#F7931A]'
                  : 'bg-purple-500/40 hover:bg-purple-500/60 border-purple-500'
              }`}
            >
              {isSubmitting 
                ? 'Saving...' 
                : (inputMode === 'wallet' ? 'Add Wallet' : 'Submit Code')
              }
            </button>
          </div>
        </form>

        {/* Info text */}
        <div className="mt-4 text-center relative z-10">
          <p className="text-xs text-gray-400">
            {inputMode === 'wallet' 
              ? 'You can also add your wallet from your profile page'
              : 'Once verified, you can add your wallet address later'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddWalletPopup;
