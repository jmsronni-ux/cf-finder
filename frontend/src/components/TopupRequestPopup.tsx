import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, CheckCircle, Copy, Loader2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';

interface TopupRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type CryptoType = 'BTC' | 'ETH';

// Payment status from the backend
type PaymentStatus = 'pending' | 'detected' | 'confirming' | 'confirmed' | 'completed' | 'expired' | 'failed';

// UI states for the popup
type UIState = 'form' | 'awaiting_payment' | 'payment_detected' | 'confirming' | 'success' | 'error';

interface PaymentSession {
  requestId: string;
  sessionId: string;
  paymentAddress: string;
  cryptocurrency: CryptoType;
  amount: number;
  paymentStatus: PaymentStatus;
  confirmations: number;
  requiredConfirmations: number;
  txHash?: string;
  expiresAt?: string;
}

// Only BTC and ETH are supported for automated payments
const cryptoOptions = [
  { key: 'BTC' as CryptoType, name: 'BTC', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'ETH' as CryptoType, name: 'ETH', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
];

const TopupRequestPopup: React.FC<TopupRequestPopupProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');
  const [uiState, setUiState] = useState<UIState>('form');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      setTimeout(() => {
        setAmount('');
        setUiState('form');
        setPaymentSession(null);
        setError(null);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 300);
    }
  }, [isOpen]);

  // Generate QR code URL from address
  const getQrCodeUrl = (address: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(address)}&size=200x200&bgcolor=ffffff`;
  };

  // Start polling for payment status
  const startPolling = (requestId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiFetch(`/topup-request/${requestId}/payment-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const status = data.data;
          
          setPaymentSession(prev => prev ? {
            ...prev,
            paymentStatus: status.paymentStatus,
            confirmations: status.confirmations || 0,
            txHash: status.txHash
          } : null);

          // Update UI state based on payment status
          switch (status.paymentStatus) {
            case 'detected':
              setUiState('payment_detected');
              break;
            case 'confirming':
              setUiState('confirming');
              break;
            case 'confirmed':
            case 'completed':
              setUiState('success');
              // Stop polling on success
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              break;
            case 'expired':
            case 'failed':
              setUiState('error');
              setError('Payment session expired or failed. Please try again.');
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              break;
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/topup-request/create-with-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          cryptocurrency: selectedCrypto
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentSession({
          requestId: data.data.requestId,
          sessionId: data.data.sessionId,
          paymentAddress: data.data.paymentAddress,
          cryptocurrency: data.data.cryptocurrency,
          amount: numAmount,
          paymentStatus: 'pending',
          confirmations: 0,
          requiredConfirmations: data.data.requiredConfirmations,
          expiresAt: data.data.expiresAt
        });
        setUiState('awaiting_payment');
        toast.success('Payment address generated!');
        
        // Start polling for payment status
        startPolling(data.data.requestId);
      } else {
        setError(data.message || 'Failed to create payment session');
        toast.error(data.message || 'Failed to create payment session');
      }
    } catch (err) {
      console.error('Top-up request error:', err);
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentSession) return;

    try {
      await apiFetch(`/topup-request/${paymentSession.requestId}/cancel-payment`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      toast.info('Payment cancelled');
      onClose();
    } catch (err) {
      console.error('Error cancelling payment:', err);
      toast.error('Failed to cancel payment');
    }
  };

  const copyAddress = () => {
    if (paymentSession?.paymentAddress) {
      navigator.clipboard.writeText(paymentSession.paymentAddress);
      toast.success('Wallet address copied!');
    }
  };

  const selectedCryptoInfo = cryptoOptions.find(c => c.key === selectedCrypto)!;

  if (!isOpen) return null;

  // Render different UI states
  const renderContent = () => {
    switch (uiState) {
      case 'awaiting_payment':
      case 'payment_detected':
      case 'confirming':
        return renderPaymentStatus();
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      default:
        return renderForm();
    }
  };

  const renderForm = () => (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
          <DollarSign className="text-purple-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Request Top-Up</h2>
          <p className="text-gray-400 text-sm">Pay with BTC or ETH</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* Amount Input */}
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
            placeholder="Enter amount in USD"
            className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
            disabled={isLoading}
            required
          />
        </div>

        {/* Crypto Selector */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Select Cryptocurrency</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
            {cryptoOptions.map((crypto) => (
              <button
                key={crypto.key}
                type="button"
                onClick={() => setSelectedCrypto(crypto.key)}
                disabled={isLoading}
                className={`px-4 py-3 rounded-md font-medium transition-all flex flex-col items-center justify-center ${selectedCrypto === crypto.key
                    ? `${crypto.bgColor} ${crypto.borderColor} border text-white`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <img 
                  src={crypto.icon} 
                  alt={crypto.name} 
                  className={`w-8 h-8 ${selectedCrypto === crypto.key ? '' : 'opacity-70'}`}
                />
                <span className="text-sm mt-2">{crypto.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-blue-400 mb-1">Automated Payment</p>
              <p>After submitting, you'll receive a unique wallet address. Send your {selectedCrypto} to this address and your balance will be automatically updated after {selectedCrypto === 'BTC' ? '3' : '12'} confirmations.</p>
            </div>
          </div>
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
            className="flex-1 px-6 py-3 bg-purple-600/40 hover:bg-purple-700 border border-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Address'
            )}
          </button>
        </div>
      </form>
    </>
  );

  const renderPaymentStatus = () => {
    if (!paymentSession) return null;
    
    const cryptoInfo = cryptoOptions.find(c => c.key === paymentSession.cryptocurrency)!;
    const isDetected = uiState === 'payment_detected' || uiState === 'confirming';

    return (
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-lg ${cryptoInfo.bgColor} flex items-center justify-center border ${cryptoInfo.borderColor}`}>
            <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isDetected ? 'Payment Detected!' : 'Awaiting Payment'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isDetected ? 'Waiting for confirmations...' : `Send ${paymentSession.cryptocurrency} to complete`}
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-6 mb-4">
          <div className="w-48 h-48 rounded-lg overflow-hidden bg-white mb-3">
            <img
              src={getQrCodeUrl(paymentSession.paymentAddress)}
              alt="Payment QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-400 text-sm">Scan to pay</p>
        </div>

        {/* Amount and Address */}
        <div className="space-y-4 mb-6">
          {/* Amount */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Amount</div>
            <div className="text-2xl font-bold text-white">${paymentSession.amount} USD</div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className={`text-sm font-medium flex items-center gap-2 ${cryptoInfo.color}`}>
              <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-5 h-5" />
              {cryptoInfo.name} Payment Address
            </label>
            <div className="flex">
              <input
                type="text"
                value={paymentSession.paymentAddress}
                readOnly
                className="w-full bg-white/5 text-white px-4 py-3 rounded-l-lg border border-r-0 border-white/10 text-sm font-mono"
              />
              <button
                type="button"
                onClick={copyAddress}
                className="bg-white/5 border border-white/10 px-4 rounded-r-lg flex items-center justify-center text-white hover:bg-purple-500/20 hover:text-purple-500 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {isDetected && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-green-400">Payment Detected</p>
                <p className="text-sm text-gray-400">
                  Confirmations: {paymentSession.confirmations}/{paymentSession.requiredConfirmations}
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (paymentSession.confirmations / paymentSession.requiredConfirmations) * 100)}%` 
                }}
              />
            </div>

            {paymentSession.txHash && (
              <p className="text-xs text-gray-500 mt-2 font-mono truncate">
                TX: {paymentSession.txHash}
              </p>
            )}
          </div>
        )}

        {/* Waiting Indicator */}
        {uiState === 'awaiting_payment' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
              <div>
                <p className="font-medium text-yellow-400">Waiting for payment...</p>
                <p className="text-sm text-gray-400">Send {paymentSession.cryptocurrency} to the address above</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {uiState === 'awaiting_payment' && (
          <button
            type="button"
            onClick={handleCancelPayment}
            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
          >
            Cancel Payment
          </button>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
      <div className="w-20 h-20 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 animate-pulse border border-green-500/30">
        <CheckCircle className="text-green-500" size={48} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Payment Complete!</h2>
      <p className="text-gray-400 mb-4">
        Your top-up of <span className="text-green-500 font-bold">${paymentSession?.amount}</span> has been processed successfully.
      </p>
      <p className="text-gray-500 text-sm mb-6">Your balance has been updated.</p>
      
      {paymentSession?.txHash && (
        <p className="text-xs text-gray-500 font-mono mb-4 break-all px-4">
          TX: {paymentSession.txHash}
        </p>
      )}

      <button
        onClick={onClose}
        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
      >
        Done
      </button>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
      <div className="w-20 h-20 rounded-lg bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/30">
        <AlertCircle className="text-red-500" size={48} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
      <p className="text-gray-400 mb-6">{error || 'Something went wrong with your payment.'}</p>
      
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
        >
          Close
        </button>
        <button
          onClick={() => {
            setUiState('form');
            setError(null);
            setPaymentSession(null);
          }}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        {renderContent()}
      </div>
    </div>
  );
};

export default TopupRequestPopup;
