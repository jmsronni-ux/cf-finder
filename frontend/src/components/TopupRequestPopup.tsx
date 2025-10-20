import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';

interface TopupRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const TopupRequestPopup: React.FC<TopupRequestPopupProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { token } = useAuth();

  // Fetch global settings when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchGlobalSettings();
    }
  }, [isOpen]);

  const fetchGlobalSettings = async () => {
    try {
      const response = await apiFetch('/global-settings');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setWalletAddress(data.data.topupWalletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8');
        setQrCodeUrl(data.data.topupQrCodeUrl || '');
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
      // Use default values on error
    }
  };

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
        }, 10000);
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
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl">
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
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <DollarSign className="text-purple-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Request Top-Up</h2>
                <p className="text-gray-400 text-sm">Submit a balance top-up request</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                disabled={isLoading}
                required
              />
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-6">
              {qrCodeUrl ? (
                <div className="w-48 h-48 rounded-lg flex items-center justify-center border border-white/20 mb-3 overflow-hidden bg-white">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.parentElement?.querySelector('.qr-placeholder');
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'block';
                      }
                    }}
                  />
                  <div className="qr-placeholder" style={{ display: 'none' }}>
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-400">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <p className="text-gray-500 text-xs">Invalid QR Code</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/20 mb-3">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-400">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <p className="text-gray-500 text-xs">QR Code Placeholder</p>
                  </div>
                </div>
              )}
              <p className="text-gray-400 text-sm">Scan to get wallet address</p>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">Wallet Address</label>
              <div className="flex flex-row">
                <input
                  type="text"
                  value={walletAddress}
                  readOnly
                  className="w-full bg-white/5 text-white px-4 py-3 rounded-lg border border-white/10 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success('Wallet address copied!');
                  }}
                  className="bg-white/5 border border-white/10 aspect-square size-12 rounded-lg flex items-center justify-center ms-2 text-white hover:bg-purple-500/20 hover:text-purple-500 transition-colors text-sm font-medium"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-500 text-xs">Send your top-up amount to this address</p>
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

export default TopupRequestPopup;

