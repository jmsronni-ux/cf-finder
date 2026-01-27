import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, DollarSign, CheckCircle, Copy, Loader2, AlertCircle, ArrowRightLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { useConversionRates } from '@/hooks/useConversionRates';
import { convertUSDTToCrypto, convertCryptoToUSDT, formatCryptoAmount } from '@/utils/cryptoConversion';

interface TopupRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type CryptoType = 'BTC' | 'ETH' | 'BCY';

// Payment status from the backend
type PaymentStatus = 'pending' | 'detected' | 'confirming' | 'confirmed' | 'completed' | 'expired' | 'failed';

// UI states for the popup
type UIState = 'form' | 'awaiting_payment' | 'payment_detected' | 'confirming' | 'success' | 'error' | 'timeout';

interface PaymentSession {
  requestId: string;
  sessionId: string;
  paymentAddress: string;
  cryptocurrency: CryptoType;
  amount: number; // Amount in USD
  cryptoAmount: number; // Amount in selected crypto
  paymentStatus: PaymentStatus;
  confirmations: number;
  requiredConfirmations: number;
  txHash?: string;
  expiresAt?: string;
}

type InputMode = 'USD' | 'CRYPTO';

// BTC, ETH, and BCY (test) are supported for automated payments
const cryptoOptions = [
  { key: 'BTC' as CryptoType, name: 'BTC', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', confirmations: 3 },
  { key: 'ETH' as CryptoType, name: 'ETH', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', confirmations: 12 },
  { key: 'BCY' as CryptoType, name: 'BCY (Test)', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', confirmations: 1, isTest: true },
];

const TopupRequestPopup: React.FC<TopupRequestPopupProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');
  const [inputMode, setInputMode] = useState<InputMode>('USD');
  const [uiState, setUiState] = useState<UIState>('form');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuth();
  const { ratesMap, loading: ratesLoading } = useConversionRates();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected crypto option to check if it's a test network
  const selectedCryptoOption = cryptoOptions.find(c => c.key === selectedCrypto)!;
  const isTestCrypto = selectedCryptoOption?.isTest || false;

  // Calculate converted amounts based on input mode
  const { usdAmount, cryptoAmount } = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      return { usdAmount: 0, cryptoAmount: 0 };
    }

    // For test cryptocurrencies, use a default test rate if no rate is configured
    // This allows testing without requiring conversion rate setup
    const hasRate = ratesMap[selectedCrypto];
    const testRate = selectedCrypto === 'BCY' ? 80000 : 1; // BCY: 1 BCY = 80000 USD, other test coins: 1:1

    if (inputMode === 'USD') {
      const usd = numAmount;
      const crypto = hasRate
        ? convertUSDTToCrypto(usd, selectedCrypto, ratesMap)
        : (isTestCrypto ? usd / testRate : 0);
      return { usdAmount: usd, cryptoAmount: crypto };
    } else {
      const crypto = numAmount;
      const usd = hasRate
        ? convertCryptoToUSDT(crypto, selectedCrypto, ratesMap)
        : (isTestCrypto ? crypto * testRate : 0);
      return { usdAmount: usd, cryptoAmount: crypto };
    }
  }, [amount, inputMode, selectedCrypto, ratesMap, isTestCrypto]);
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
        setInputMode('USD');
        setUiState('form');
        setPaymentSession(null);
        setError(null);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 300);
    } else {
      // Check for existing pending request when opening
      checkPendingRequest();
    }
  }, [isOpen]);

  const checkPendingRequest = async () => {
    try {
      const response = await apiFetch('/topup-request/my-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.data.length > 0) {
        // Find the most recent pending request with payment session
        const pendingRequest = data.data.find((req: any) =>
          req.status === 'pending' &&
          req.paymentStatus &&
          ['pending', 'detected', 'confirming'].includes(req.paymentStatus) &&
          req.paymentSessionId
        );

        if (pendingRequest) {
          // Check if it's expired
          const createdAt = new Date(pendingRequest.createdAt);
          const timeoutAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
          const isExpired = new Date() > timeoutAt;

          if (!isExpired) {
            setPaymentSession({
              requestId: pendingRequest._id,
              sessionId: pendingRequest.paymentSessionId,
              paymentAddress: pendingRequest.paymentAddress,
              cryptocurrency: pendingRequest.cryptocurrency,
              amount: pendingRequest.amount,
              cryptoAmount: pendingRequest.cryptoAmount || 0, // Fallback for old records
              paymentStatus: pendingRequest.paymentStatus,
              confirmations: pendingRequest.confirmations || 0,
              requiredConfirmations: pendingRequest.requiredConfirmations || 1, // Default to 1 if missing
              txHash: pendingRequest.txHash,
              expiresAt: pendingRequest.paymentExpiresAt
            });

            setUiState(pendingRequest.paymentStatus === 'pending' ? 'awaiting_payment' :
              pendingRequest.paymentStatus === 'detected' ? 'payment_detected' : 'confirming');

            // Resume polling
            startPolling(pendingRequest._id);
          }
        }
      }
    } catch (err) {
      console.error('Error checking pending requests:', err);
    }
  };

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

          // Check for timeout: 0 confirmations after 1 hour from creation
          const confirmations = status.confirmations || 0;
          const createdAt = status.createdAt ? new Date(status.createdAt) : null;
          const timeoutAt = createdAt ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null; // 1 hour after creation
          const hasTimedOut = timeoutAt && new Date() > timeoutAt;

          // Timed out only if: 1 hour passed AND still 0 confirmations
          const isTimedOut = (hasTimedOut && confirmations === 0) ||
            (status.paymentStatus === 'expired' && confirmations === 0);

          // Check if topup request is approved (balance already updated)
          const requiredConfirmations = status.requiredConfirmations || 1;
          const hasEnoughConfirmations = confirmations >= requiredConfirmations;
          const isApproved = status.status === 'approved';

          // Update UI state based on payment status
          if (isApproved || (hasEnoughConfirmations && confirmations > 0)) {
            // Request is approved or has enough confirmations - show success
            setUiState('success');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (isTimedOut && ['pending', 'expired'].includes(status.paymentStatus)) {
            // Timed out with no confirmations - show timeout error
            setUiState('timeout');
            setError('Payment session timed out. No transaction was detected within the time limit. Please contact support if you made a payment, or try again.');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else {
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
                // If expired but has confirmations, show regular error
                setUiState('error');
                setError('Payment session expired or failed. Please try again.');
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                break;
            }
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usdAmount <= 0 || cryptoAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    const isCryptoInput = inputMode === 'CRYPTO';
    const requestAmount = isCryptoInput ? parseFloat(amount) : parseFloat(amount); // Use raw input amount

    try {
      const response = await apiFetch('/topup-request/create-with-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: requestAmount,
          cryptocurrency: selectedCrypto,
          amountType: isCryptoInput ? 'crypto' : 'usd'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentSession({
          requestId: data.data.requestId,
          sessionId: data.data.sessionId,
          paymentAddress: data.data.paymentAddress,
          cryptocurrency: data.data.cryptocurrency,
          amount: data.data.usdAmount, // Use backend returned USD amount
          cryptoAmount: data.data.cryptoAmount, // Use backend returned crypto amount
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
      case 'timeout':
        return renderTimeout();
      default:
        return renderForm();
    }
  };

  const renderForm = () => {
    const selectedCryptoOption = cryptoOptions.find(c => c.key === selectedCrypto)!;

    return (
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
          {/* Crypto Selector - Moved up */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Select Cryptocurrency</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              {cryptoOptions.map((crypto) => (
                <button
                  key={crypto.key}
                  type="button"
                  onClick={() => setSelectedCrypto(crypto.key)}
                  disabled={isLoading}
                  className={`px-3 py-3 rounded-md font-medium transition-all flex flex-col items-center justify-center relative ${selectedCrypto === crypto.key
                    ? `${crypto.bgColor} ${crypto.borderColor} border text-white`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {crypto.isTest && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">TEST</span>
                  )}
                  <img
                    src={crypto.icon}
                    alt={crypto.name}
                    className={`w-7 h-7 ${selectedCrypto === crypto.key ? '' : 'opacity-70'} ${crypto.isTest ? 'hue-rotate-90' : ''}`}
                  />
                  <span className="text-xs mt-2">{crypto.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Enter Amount In</label>
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (inputMode !== 'USD') {
                    // Convert current crypto amount to USD when switching
                    if (cryptoAmount > 0) {
                      setAmount(usdAmount.toFixed(2));
                    }
                    setInputMode('USD');
                  }
                }}
                disabled={isLoading || ratesLoading}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'USD'
                  ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <DollarSign className="w-4 h-4" />
                USD
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputMode !== 'CRYPTO') {
                    // Convert current USD amount to crypto when switching
                    if (usdAmount > 0) {
                      setAmount(formatCryptoAmount(cryptoAmount, selectedCrypto));
                    }
                    setInputMode('CRYPTO');
                  }
                }}
                disabled={isLoading || ratesLoading}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${inputMode === 'CRYPTO'
                  ? `${selectedCryptoOption.bgColor} ${selectedCryptoOption.borderColor} border text-white`
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <img src={selectedCryptoOption.icon} alt={selectedCrypto} className="w-4 h-4" />
                {selectedCrypto}
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {inputMode === 'USD' ? (
                  <DollarSign className="w-5 h-5" />
                ) : (
                  <img src={selectedCryptoOption.icon} alt={selectedCrypto} className="w-5 h-5" />
                )}
              </div>
              <input
                type="number"
                min="0"
                step={inputMode === 'USD' ? '1' : '0.00000001'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={inputMode === 'USD' ? 'Enter amount in USD' : `Enter amount in ${selectedCrypto}`}
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                disabled={isLoading || (!isTestCrypto && ratesLoading)}
                required
              />
            </div>

            {/* Conversion Display */}
            {parseFloat(amount) > 0 && (ratesMap[selectedCrypto] || isTestCrypto) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                <ArrowRightLeft className="w-4 h-4 text-gray-500" />
                {inputMode === 'USD' ? (
                  <span className="text-sm text-gray-400">
                    ≈ <span className={`font-medium ${selectedCryptoOption.color}`}>
                      {formatCryptoAmount(cryptoAmount, selectedCrypto)} {selectedCrypto}
                    </span>
                    {isTestCrypto && !ratesMap[selectedCrypto] && (
                      <span className="text-xs text-gray-500 ml-1">(test rate)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">
                    ≈ <span className="font-medium text-green-400">
                      ${usdAmount.toFixed(2)} USD
                    </span>
                    {isTestCrypto && !ratesMap[selectedCrypto] && (
                      <span className="text-xs text-gray-500 ml-1">(test rate)</span>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Loading rates indicator */}
            {ratesLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading conversion rates...
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className={`${selectedCryptoOption.isTest ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'} border rounded-lg p-4`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 ${selectedCryptoOption.isTest ? 'text-green-400' : 'text-blue-400'} flex-shrink-0 mt-0.5`} />
              <div className="text-sm text-gray-300">
                <p className={`font-medium ${selectedCryptoOption.isTest ? 'text-green-400' : 'text-blue-400'} mb-1`}>
                  {selectedCryptoOption.isTest ? 'Test Network Payment' : 'Automated Payment'}
                </p>
                {selectedCryptoOption.isTest ? (
                  <p>BCY is a BlockCypher test cryptocurrency. This is for <strong>testing purposes only</strong> - no real funds are required. Your balance will be updated after {selectedCryptoOption.confirmations} confirmation.</p>
                ) : (
                  <p>After submitting, you'll receive a unique wallet address. Send your {selectedCrypto} to this address and your balance will be automatically updated after {selectedCryptoOption.confirmations} confirmations.</p>
                )}
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
              disabled={isLoading || (!isTestCrypto && ratesLoading) || (parseFloat(amount) || 0) <= 0}
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
  };

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
          {/* Crypto Amount - Primary */}
          <div className={`${cryptoInfo.bgColor} border ${cryptoInfo.borderColor} rounded-lg p-4`}>
            <div className="text-sm text-gray-400 mb-1">Send Exactly</div>
            <div className={`text-2xl font-bold ${cryptoInfo.color} flex items-center gap-2`}>
              <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-6 h-6" />
              {formatCryptoAmount(paymentSession.cryptoAmount, paymentSession.cryptocurrency)} {paymentSession.cryptocurrency}
            </div>
            <div className="text-sm text-gray-500 mt-1">≈ ${paymentSession.amount.toFixed(2)} USD</div>
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

  const renderTimeout = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
      <div className="w-20 h-20 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4 border border-orange-500/30">
        <Clock className="text-orange-500" size={48} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Payment Timed Out</h2>
      <p className="text-gray-400 mb-4">
        No payment was detected within the 1-hour time limit.
      </p>
      <p className="text-gray-500 text-sm mb-6">
        If you sent a payment after the session expired, please contact support with your transaction details. Your request has been forwarded to an admin for manual review.
      </p>

      {paymentSession && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 w-full max-w-sm text-left">
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-medium text-white">Request ID:</span> {paymentSession.requestId}
          </p>
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-medium text-white">Amount:</span> ${paymentSession.amount.toFixed(2)} USD
          </p>
          <p className="text-sm text-gray-400">
            <span className="font-medium text-white">Crypto:</span> {paymentSession.cryptocurrency}
          </p>
        </div>
      )}

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
