import React, { useState } from 'react';
import { Wallet, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateWalletAddress } from '../utils/walletValidation';
import { apiFetch } from '../utils/api';

interface AddWalletPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NETWORKS = [
  { value: 'btc', label: 'Bitcoin (BTC)', placeholder: 'bc1...' },
  { value: 'eth', label: 'Ethereum (ETH)', placeholder: '0x...' },
  { value: 'tron', label: 'Tron (TRX)', placeholder: 'T...' },
  { value: 'usdtErc20', label: 'USDT (ERC20)', placeholder: '0x...' },
];

const AddWalletPopup: React.FC<AddWalletPopupProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState<string>('btc');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedNetworkData = NETWORKS.find(n => n.value === selectedNetwork);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!walletAddress.trim()) {
      toast.error('Please enter a wallet address');
      return;
    }

    // Validate wallet address format
    const validation = validateWalletAddress(walletAddress, selectedNetwork);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid wallet address');
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
            [selectedNetwork]: walletAddress.trim()
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet added successfully!');
        setWalletAddress('');
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || 'Failed to add wallet. Please try again.');
      }
    } catch (error) {
      console.error('Add wallet error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Required badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            REQUIRED
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Wallet className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Wallet Address Required</h2>
            <p className="text-gray-400 text-sm">Please add a wallet address to continue using the platform</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Network Selection */}
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Wallet className="w-5 h-5" />
              </div>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                disabled={isSubmitting}
              >
                {NETWORKS.map((network) => (
                  <option key={network.value} value={network.value}>
                    {network.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wallet Address Input */}
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Wallet className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={selectedNetworkData?.placeholder || 'Enter wallet address'}
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono text-sm transition-all"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-purple-300 text-xs">
              <AlertCircle className="w-4 h-4 inline mr-3" />
              A wallet address is required to start a scan and receive withdrawals.
            </p>
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
              className="flex-1 px-6 py-3 bg-purple-600/40 hover:bg-purple-700 border border-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
