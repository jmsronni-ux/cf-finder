import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Wallet, AlertCircle, CheckCircle, Clock, Loader2, XCircle, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

interface WithdrawPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

interface WithdrawRequest {
  _id: string;
  amount: number;
  walletAddress: string;
  confirmedWallet?: string;
  confirmedAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const WithdrawPopup: React.FC<WithdrawPopupProps> = ({ 
  isOpen, 
  onClose, 
  currentBalance,
  onSuccess 
}) => {
  const [amount, setAmount] = useState<string>('');
  const [wallet, setWallet] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [pendingRequest, setPendingRequest] = useState<WithdrawRequest | null>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tierRequestSubmittedRef = useRef<boolean>(false);
  const { user, token } = useAuth();

  // Function to automatically submit tier upgrade request
  const submitAutomaticTierUpgrade = async () => {
    // Prevent duplicate submissions
    if (tierRequestSubmittedRef.current) return;
    
    // Check if user is at max tier already
    if (!user || user.tier >= 5) {
      console.log('User is at max tier or user not found');
      return;
    }
    
    try {
      // Fetch next tier info
      const tierInfoRes = await apiFetch('/tier/my-tier', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const tierInfoJson = await tierInfoRes.json();
      
      if (tierInfoRes.ok && tierInfoJson?.success && tierInfoJson.data.upgradeOptions?.length > 0) {
        const nextTier = tierInfoJson.data.upgradeOptions[0];
        
        // Submit tier upgrade request automatically
        const res = await apiFetch('/tier-request/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ requestedTier: nextTier.tier })
        });
        const json = await res.json();
        
        if (res.ok && json?.success) {
          tierRequestSubmittedRef.current = true;
          toast.success(`🎉 Tier upgrade request for ${nextTier.name} automatically submitted!`, {
            duration: 5000
          });
        } else {
          // If request already exists, that's fine - don't show error
          if (json?.message?.includes('already have a pending request')) {
            console.log('User already has a pending tier request');
          } else {
            toast.info('Tier upgrade request: ' + (json?.message || 'Could not submit automatically'));
          }
        }
      }
    } catch (error) {
      console.error('Error submitting automatic tier upgrade:', error);
      // Don't show error toast - this is a background action
    }
  };

  // Poll for request status updates
  useEffect(() => {
    if (requestStatus === 'pending' && pendingRequest) {
      const checkStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await apiFetch('/withdraw-request/my-requests', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          
          const data = await response.json();
          if (data.success && data.data) {
            const currentRequest = data.data.find((req: WithdrawRequest) => req._id === pendingRequest._id);
            if (currentRequest && currentRequest.status !== 'pending') {
              setPendingRequest(currentRequest);
              setRequestStatus(currentRequest.status);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
              if (currentRequest.status === 'approved') {
                onSuccess();
                // Automatically submit tier upgrade request after successful withdrawal
                submitAutomaticTierUpgrade();
              }
            }
          }
        } catch (error) {
          console.error('Error checking request status:', error);
        }
      };

      // Poll every 3 seconds
      pollingIntervalRef.current = setInterval(checkStatus, 3000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [requestStatus, pendingRequest, onSuccess]);

  // Check for existing pending request when popup opens
  useEffect(() => {
    const checkForPendingRequest = async () => {
      if (!isOpen) return;
      
      setIsCheckingPending(true);
      try {
        const token = localStorage.getItem('token');
        const response = await apiFetch('/withdraw-request/my-requests', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        if (data.success && data.data) {
          // Find the most recent pending request
          const pending = data.data.find((req: WithdrawRequest) => req.status === 'pending');
          if (pending) {
            // Resume from pending state
            setPendingRequest(pending);
            setRequestStatus('pending');
            setAmount(pending.amount.toString());
            setWallet(pending.walletAddress);
            return; // Don't reset to idle if there's a pending request
          }
          
          // Check if the most recent request was approved recently (within last 10 seconds)
          const recent = data.data[0];
          if (recent && recent.status === 'approved') {
            const processedTime = new Date(recent.processedAt).getTime();
            const now = Date.now();
            const timeDiff = now - processedTime;
            
            // If approved within last 10 seconds, show the approved state
            if (timeDiff < 10000) {
              setPendingRequest(recent);
              setRequestStatus('approved');
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      } finally {
        setIsCheckingPending(false);
      }
    };

    if (isOpen) {
      checkForPendingRequest();
    }
  }, [isOpen]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // Only reset to idle if not pending - this allows user to reopen and resume
      setTimeout(() => {
        if (requestStatus !== 'pending') {
          setRequestStatus('idle');
          setPendingRequest(null);
          setAmount('');
          setWallet('');
          tierRequestSubmittedRef.current = false; // Reset tier request flag
        }
      }, 300);
    }
  }, [isOpen, requestStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    // Validation
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount > currentBalance) {
      toast.error(`Insufficient balance. Available: $${currentBalance}`);
      return;
    }
    
    if (!wallet.trim()) {
      toast.error('Please enter your wallet address');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('/withdraw-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          wallet: wallet.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Set pending status and keep popup open
        setPendingRequest(data.data);
        setRequestStatus('pending');
        toast.success('Request submitted! Waiting for admin approval...');
      } else {
        toast.error(data.message || 'Withdrawal request failed. Please try again.');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (requestStatus === 'pending') {
      const confirm = window.confirm('Your request is still pending. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-10 rounded-2xl" />
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10">
          {/* CHECKING STATE - Loading while checking for pending requests */}
          {isCheckingPending && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Checking for pending requests...</p>
            </div>
          )}

          {/* IDLE STATE - Show Form */}
          {!isCheckingPending && requestStatus === 'idle' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <DollarSign className="text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
                  <p className="text-gray-400 text-sm">Available Balance: <span className="text-green-500 font-semibold">${currentBalance}</span></p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                disabled={isSubmitting}
                required
              />
            </div>
            {parseFloat(amount) > currentBalance && (
              <p className="mt-1 text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Amount exceeds available balance
              </p>
            )}
          </div>

          {/* Wallet Input */}
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Wallet className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Enter your wallet address"
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-purple-300 text-xs">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Your withdrawal request will be submitted for admin approval.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
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
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-purple-600/40 hover:bg-purple-700 border border-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
            </>
          )}

          {/* PENDING STATE - Waiting for Admin */}
          {!isCheckingPending && requestStatus === 'pending' && pendingRequest && (
            <div className="text-center py-6">
              <div className='flex flex-row items-center justify-start gap-4 mb-5'>
                <div className="w-14 h-14 aspect-square rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
                <div className='flex flex-col items-start justify-center'>
                  <h2 className="text-2xl font-bold text-white mb-1">Request Pending</h2>
                  <p className="text-gray-400">Waiting for admin approval...</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <Clock className="w-4 h-4 text-yellow-400" />
                <p className="text-yellow-400 font-semibold text-sm">Don't Close This Window!</p>
              </div>

              <div className="bg-background/50 border border-border rounded-lg p-3 space-y-2 text-left">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold">Requested Amount:</span> ${pendingRequest.amount}
                </p>
                <p className="text-sm text-gray-400">
                  <span className="font-semibold">Your Wallet:</span>
                  <br />
                  <span className="font-mono text-xs break-all text-gray-500">{pendingRequest.walletAddress}</span>
                </p>
              </div>
            </div>
          )}

          {/* APPROVED STATE - Show Payment Instructions from Admin */}
          {!isCheckingPending && requestStatus === 'approved' && pendingRequest && (
            <div className="py-6">
              <div className='flex flex-row items-center justify-center gap-4 mb-6'>
                <div className="w-14 h-14 aspect-square rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500">
                  <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
                </div>
                <div className='flex flex-col items-start justify-start'>
                  <h2 className="text-2xl font-bold text-white mb-2">Request Approved!</h2>
                  <p className="text-gray-400">Admin has provided payment instructions</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-2 border-green-500/30 rounded-lg p-5 mb-4 space-y-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-400 mb-2"> SEND THIS AMOUNT</p>
                  <p className="text-4xl font-bold text-green-400">
                    ${pendingRequest.confirmedAmount?.toLocaleString() || pendingRequest.amount}
                  </p>
                </div>
                
                <div className="border-t border-green-500/20 pt-3">
                  <p className="text-xs text-gray-400 mb-2 text-center">TO THIS WALLET ADDRESS</p>
                  <div className="bg-black/30 rounded-lg p-3 border border-green-500/20 relative group">
                    <p className="text-sm font-mono text-green-400 break-all text-center pr-8">
                      {pendingRequest.confirmedWallet || pendingRequest.walletAddress}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pendingRequest.confirmedWallet || pendingRequest.walletAddress);
                        toast.success('Wallet address copied!');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors"
                      title="Copy wallet address"
                    >
                      <Copy className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                  <p className="text-xs text-yellow-300 text-center">
                    ⚠️ Please send the exact amount
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-300 text-center">
                  Your platform balance has been deducted. <br /> Please send the crypto to complete the withdrawal.
                </p>
              </div>

              <Button
                onClick={handleClose}
                className="w-full h-12 font-semibold bg-green-600/50 hover:bg-green-700 text-white border border-green-600"
              >
                I confirm the payment
              </Button>
            </div>
          )}

          {/* REJECTED STATE */}
          {!isCheckingPending && requestStatus === 'rejected' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500 mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Request Rejected</h2>
              <p className="text-gray-400 mb-4">Your withdrawal request was not approved</p>
              
              <Button
                onClick={handleClose}
                className="w-full bg-red-600/50 hover:bg-red-700 text-white border border-red-600"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawPopup;

