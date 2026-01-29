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

type CryptoType = 'BTC' | 'ETH' | 'BCY' | 'BETH';

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

// BTC, ETH, BCY (test), and BETH (test) are supported for automated payments
const cryptoOptions = [
  { key: 'BTC' as CryptoType, name: 'BTC', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', confirmations: 3 },
  { key: 'ETH' as CryptoType, name: 'ETH', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', confirmations: 12 },
  { key: 'BCY' as CryptoType, name: 'BCY (Test)', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', confirmations: 1, isTest: true },
  { key: 'BETH' as CryptoType, name: 'BETH (Test)', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', confirmations: 1, isTest: true },
];

const TopupRequestPopup: React.FC<TopupRequestPopupProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');
  const [inputMode, setInputMode] = useState<InputMode>('USD');
  const [uiState, setUiState] = useState<UIState>('form');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { token, user } = useAuth();
  const { ratesMap, loading: ratesLoading } = useConversionRates();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter crypto options based on admin status - only show test cryptos to admins
  const availableCryptoOptions = useMemo(() => {
    return cryptoOptions.filter(crypto => !crypto.isTest || user?.isAdmin);
  }, [user?.isAdmin]);

  // Get selected crypto option to check if it's a test network
  const selectedCryptoOption = availableCryptoOptions.find(c => c.key === selectedCrypto) || availableCryptoOptions[0];
  const isTestCrypto = selectedCryptoOption?.isTest || false;

  // Ensure selected crypto is valid when available options change
  useEffect(() => {
    const isCurrentCryptoAvailable = availableCryptoOptions.some(c => c.key === selectedCrypto);
    if (!isCurrentCryptoAvailable && availableCryptoOptions.length > 0) {
      setSelectedCrypto(availableCryptoOptions[0].key);
    }
  }, [availableCryptoOptions, selectedCrypto]);

  // Calculate converted amounts based on input mode
  const { usdAmount, cryptoAmount } = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      return { usdAmount: 0, cryptoAmount: 0 };
    }

    // For test cryptocurrencies, use a default test rate if no rate is configured
    // This allows testing without requiring conversion rate setup
    const hasRate = ratesMap[selectedCrypto];
    // BCY: 1 BCY = 80000 USD, BETH: 1 BETH = 3000 USD (same as ETH), other test coins: 1:1
    const testRate = selectedCrypto === 'BCY' ? 80000 : selectedCrypto === 'BETH' ? 3000 : 1;

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
          // IMPORTANT: Only show success when status === 'approved' (backend confirmed balance update)
          // Don't show success just because confirmations are met - wait for backend to process
          if (isApproved) {
            // Request is officially approved by backend - balance has been updated
            setUiState('success');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (hasEnoughConfirmations && confirmations > 0) {
            // Confirmations met but backend hasn't approved yet - show confirming state and keep polling
            // Backend will auto-approve on next poll, then we'll show success
            setUiState('confirming');
            // Don't stop polling - keep waiting for backend to approve
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
                // Payment gateway says confirmed/completed, but wait for backend to approve
                // Keep showing confirming state and continue polling until status === 'approved'
                setUiState('confirming');
                // Don't stop polling - wait for backend approval
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
    const selectedCryptoOption = availableCryptoOptions.find(c => c.key === selectedCrypto) || availableCryptoOptions[0];

    // Calculate grid columns based on available cryptos
    const gridCols = availableCryptoOptions.length <= 2 ? 'grid-cols-2' :
                     availableCryptoOptions.length === 3 ? 'grid-cols-3' :
                     'grid-cols-4';

    return (
      <>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <DollarSign className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Top-Up</h2>
            <p className="text-gray-400 text-sm">Pay with BTC or ETH</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Crypto Selector - Moved up */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Select Cryptocurrency</label>
            <div className={`grid ${gridCols} gap-2 p-1 bg-white/5 rounded-lg border border-white/10`}>
              {availableCryptoOptions.map((crypto) => (
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

          {/* Amount Input with integrated mode toggle and conversion display */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Amount</label>
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
                step={inputMode === 'USD' ? '0.1' : '0.00000001'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={inputMode === 'USD' ? 'Enter amount in USD' : `Enter amount in ${selectedCrypto}`}
                className="w-full bg-white/5 text-white pl-10 pr-[200px] py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isLoading || (!isTestCrypto && ratesLoading)}
                required
              />

              {/* Conversion display inside input on right */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {parseFloat(amount) > 0 && (ratesMap[selectedCrypto] || isTestCrypto) && (
                  <>
                    {inputMode === 'USD' ? (
                      <span className="text-sm text-gray-400">
                        ≈ <span className={`font-medium ${selectedCryptoOption.color}`}>
                          {formatCryptoAmount(cryptoAmount, selectedCrypto)} {selectedCrypto}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        ≈ <span className="font-medium text-green-400">
                          ${usdAmount.toFixed(2)}
                        </span>
                      </span>
                    )}
                    <div className="w-px h-5 bg-white/10 mx-1" />
                  </>
                )}

                {/* Subtle mode toggle inside input */}
                <button
                  type="button"
                  onClick={() => {
                    if (inputMode === 'USD') {
                      if (usdAmount > 0) {
                        setAmount(formatCryptoAmount(cryptoAmount, selectedCrypto));
                      }
                      setInputMode('CRYPTO');
                    } else {
                      if (cryptoAmount > 0) {
                        setAmount(usdAmount.toFixed(2));
                      }
                      setInputMode('USD');
                    }
                  }}
                  disabled={isLoading || ratesLoading}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                  title={inputMode === 'USD' ? `Switch to ${selectedCrypto}` : 'Switch to USD'}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="text-xs">{inputMode === 'USD' ? selectedCrypto : 'USD'}</span>
                </button>
              </div>
            </div>

            {/* Loading rates indicator */}
            {ratesLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading conversion rates...
              </div>
            )}
            {isTestCrypto && !ratesMap[selectedCrypto] && parseFloat(amount) > 0 && (
              <div className="text-xs text-gray-500">Using test exchange rate</div>
            )}
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
                  Depositing...
                </>
              ) : (
                'Deposit'
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

    const copyAmount = () => {
      const amountText = `${formatCryptoAmount(paymentSession.cryptoAmount, paymentSession.cryptocurrency)}`;
      navigator.clipboard.writeText(amountText);
      toast.success('Amount copied!');
    };

    // Show spinner view when payment is detected
    if (isDetected) {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center py-12">
          {/* Animated spinner */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-green-500/20" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-green-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Payment Received</h2>
          <p className="text-gray-400 text-center mb-6">
            Awaiting blockchain confirmations...
          </p>

          {/* Amount display */}
          <div className={`${cryptoInfo.bgColor} border ${cryptoInfo.borderColor} rounded-lg px-6 py-3 mb-4`}>
            <div className="flex items-center gap-2">
              <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-5 h-5" />
              <span className={`text-lg font-bold ${cryptoInfo.color}`}>
                {formatCryptoAmount(paymentSession.cryptoAmount, paymentSession.cryptocurrency)} {paymentSession.cryptocurrency}
              </span>
              <span className="text-sm text-gray-500">≈ ${paymentSession.amount.toFixed(2)}</span>
            </div>
          </div>

        </div>
      );
    }

    // Awaiting payment view
    return (
      <div className="relative z-10">
        {/* Status Badge at Top */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2">
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
            <span className="text-sm font-medium text-yellow-400">Awaiting Payment</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-1">Send Payment</h2>
          <p className="text-gray-400 text-sm">Scan QR code or copy details below</p>
        </div>

        {/* QR Code - More compact with padding */}
        <div className="flex justify-center mb-4">
          <div className="bg-white border border-white/10 rounded-lg p-4">
            <div className="w-40 h-40 overflow-hidden bg-white">
              <img
                src={getQrCodeUrl(paymentSession.paymentAddress)}
                alt="Payment QR Code"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Amount - Compact with Copy */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Send Exactly</label>
            <div className="flex h-11">
              <div className={`flex-1 ${cryptoInfo.bgColor} border ${cryptoInfo.borderColor} rounded-l-lg px-3 flex items-center gap-2`}>
                <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-5 h-5" />
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${cryptoInfo.color}`}>
                    {formatCryptoAmount(paymentSession.cryptoAmount, paymentSession.cryptocurrency)} {paymentSession.cryptocurrency}
                  </span>
                  <span className="text-xs text-gray-500">≈ ${paymentSession.amount.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyAmount}
                className={`${cryptoInfo.bgColor} border ${cryptoInfo.borderColor} border-l-0 px-3 rounded-r-lg flex items-center justify-center text-white hover:opacity-80 transition-opacity`}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Address - Compact with Copy */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To Address</label>
            <div className="flex h-11">
              <input
                type="text"
                value={paymentSession.paymentAddress}
                readOnly
                className="flex-1 bg-white/5 text-white px-3 rounded-l-lg border border-r-0 border-white/10 text-sm font-mono"
              />
              <button
                type="button"
                onClick={copyAddress}
                className="bg-white/5 border border-white/10 px-3 rounded-r-lg flex items-center justify-center text-white hover:bg-purple-500/20 hover:text-purple-500 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={handleCancelPayment}
          className="w-full px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all mt-7"
        >
          Cancel Payment
        </button>
      </div>
    );
  };

  const renderSuccess = () => {
    const cryptoInfo = paymentSession ? cryptoOptions.find(c => c.key === paymentSession.cryptocurrency) : null;

    return (
      <div className="flex flex-col items-center justify-center py-10 text-center relative z-10">
        {/* Animated success icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/30">
            <CheckCircle className="text-green-500 w-12 h-12" />
          </div>
          {/* Decorative rings */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border border-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Payment Complete!</h2>
        <p className="text-gray-400 mb-2">Your balance has been updated</p>

        {/* Amount card */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl py-4 mb-4 w-3/4 my-4">
          <div className="text-sm text-gray-400 mb-1">Amount Added</div>
          <div className="text-3xl font-bold text-green-400">
            ${paymentSession?.amount.toFixed(2)}
          </div>
          {cryptoInfo && paymentSession && (
            <div className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-500">
              <img src={cryptoInfo.icon} alt={cryptoInfo.name} className="w-4 h-4" />
              {formatCryptoAmount(paymentSession.cryptoAmount, paymentSession.cryptocurrency)} {paymentSession.cryptocurrency}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-10 w-3/4 py-3 mt-5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-500/20"
        >
          Done
        </button>
      </div>
    );
  };

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
