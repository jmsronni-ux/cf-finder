import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Wallet, AlertCircle, CheckCircle, Clock, Loader2, XCircle, Copy, Coins, Check, Plus, User, ArrowUp } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import { BorderBeam } from './ui/border-beam';
import { NumberTicker } from './ui/number-ticker';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface EnhancedWithdrawPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
  userData?: any; // Add userData prop to access level rewards
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

interface NetworkRewards {
  [network: string]: number;
}

interface ConversionBreakdown {
  [network: string]: {
    original: number;
    usdt: number;
    rate: number;
  };
}

interface ConversionRates {
  [network: string]: number;
}

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', icon: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', icon: '/assets/crypto-logos/tron-trx-logo.svg', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', icon: '/assets/crypto-logos/tether-usdt-logo.svg', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', icon: '/assets/crypto-logos/bnb-bnb-logo.svg', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', icon: '/assets/crypto-logos/solana-sol-logo.svg', color: 'text-purple-500' }
];

const EnhancedWithdrawPopup: React.FC<EnhancedWithdrawPopupProps> = ({ 
  isOpen, 
  onClose, 
  currentBalance, 
  onSuccess,
  userData 
}) => {
  const [networkRewards, setNetworkRewards] = useState<NetworkRewards>({});
  const [conversionBreakdown, setConversionBreakdown] = useState<ConversionBreakdown>({});
  const [conversionRates, setConversionRates] = useState<ConversionRates>({});
  const [totalUSDT, setTotalUSDT] = useState<number>(0);
  const [availableUSDT, setAvailableUSDT] = useState<number>(0); // Total excluding withdrawn networks
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());
  const [withdrawAll, setWithdrawAll] = useState<boolean>(false);
  const [wallet, setWallet] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [pendingRequest, setPendingRequest] = useState<WithdrawRequest | null>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [commissionBreakdown, setCommissionBreakdown] = useState<any[]>([]);
  const [allNetworksWithdrawn, setAllNetworksWithdrawn] = useState<boolean>(false);
  const [isUpgradingTier, setIsUpgradingTier] = useState<boolean>(false);
  const [withdrawnNetworks, setWithdrawnNetworks] = useState<Set<string>>(new Set());
  const [lastSubmittedCommission, setLastSubmittedCommission] = useState<number | null>(null);
  const confettiShownRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Check wallet verification on popup open
  useEffect(() => {
    if (isOpen && !user?.walletVerified) {
      toast.error('Wallet verification required', {
        description: 'Please verify your wallet before making withdrawal requests'
      });
    }
  }, [isOpen, user?.walletVerified]);

  // Fetch conversion rates from backend
  const fetchConversionRates = async () => {
    try {
      const response = await apiFetch('/conversion-rate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const rates: ConversionRates = {};
        (data.data.rates || []).forEach((rate: any) => {
          rates[rate.network] = rate.rateToUSD;
        });
        setConversionRates(rates);
        console.log('[Conversion Rates] Fetched from backend:', rates);
        return rates;
      } else {
        console.error('Failed to fetch conversion rates:', data.message);
        // Fallback to default rates
        return { BTC: 45000, ETH: 3000, TRON: 0.1, USDT: 1, BNB: 300, SOL: 100 };
      }
    } catch (error) {
      console.error('Error fetching conversion rates:', error);
      // Fallback to default rates
      return { BTC: 45000, ETH: 3000, TRON: 0.1, USDT: 1, BNB: 300, SOL: 100 };
    }
  };
 
  // Fetch commission from backend API
  const fetchCommissionForSelectedNetworks = async () => {
    if (!user?._id) return;
    
    // Get the selected networks to withdraw
    const networksToWithdraw = withdrawAll 
      ? Object.keys(networkRewards)
      : Array.from(selectedNetworks);
    
    // Don't fetch if no networks are selected
    if (networksToWithdraw.length === 0) {
      setTotalCommission(0);
      setCommissionBreakdown([]);
      return;
    }
    
    try {
      const response = await apiFetch(`/user-network-reward/user/${user._id}/calculate-commission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          networks: networksToWithdraw,
          withdrawAll: withdrawAll
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTotalCommission(data.data.totalCommission);
        setCommissionBreakdown(data.data.commissionBreakdown);
        console.log('[Commission] Commission calculated:', data.data);
      } else {
        console.error('Failed to calculate commission:', data.message);
        setTotalCommission(0);
        setCommissionBreakdown([]);
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      setTotalCommission(0);
      setCommissionBreakdown([]);
    }
  };

  // Fetch user's network rewards for CURRENT LEVEL only
  const fetchNetworkRewards = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoadingRewards(true);
      
      // Fetch conversion rates first
      const rates = await fetchConversionRates();
      
      const level = user?.tier || 1;
      const response = await apiFetch(`/user-network-reward/user/${user._id}/level/${level}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Normalize rewards map { BTC: { amount }, ... } -> { BTC: amount }
        const rewards: Record<string, number> = {};
        const raw = data.data?.rewards || {};
        Object.entries(raw).forEach(([network, val]: [string, any]) => {
          rewards[network] = Number(val?.amount ?? val ?? 0);
        });

        console.log(`[Withdraw Popup] Fetched network rewards for level ${level}:`, rewards);
        console.log(`[Withdraw Popup] Raw API response:`, data.data);
        setNetworkRewards(rewards);

        // Build USDT conversion using rates from backend
        const breakdown: any = {};
        let total = 0;
        Object.entries(rewards).forEach(([network, amount]) => {
          const rate = rates[network] ?? 1;
          const usdt = amount * rate;
          breakdown[network] = { original: amount, usdt, rate };
          total += usdt;
        });
        setConversionBreakdown(breakdown);
        setTotalUSDT(total);

        console.log('[Network Rewards] Fetched and calculated:', {
          rewards,
          breakdown,
          totalUSDT: total,
          rates
        });

        // Commission will be calculated when networks are selected
        setTotalCommission(0);
      } else {
        console.error('Failed to fetch network rewards:', data.message);
      }
    } catch (error) {
      console.error('Error fetching network rewards:', error);
    } finally {
      setIsLoadingRewards(false);
    }
  };

  // Check for pending requests
  const checkPendingRequests = async () => {
    if (!user?._id) return;
    
    try {
      setIsCheckingPending(true);
      const response = await apiFetch('/withdraw-request/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const pendingRequests = data.data.filter((req: WithdrawRequest) => req.status === 'pending');
        if (pendingRequests.length > 0) {
          setPendingRequest(pendingRequests[0]);
          setRequestStatus('pending');
        }
      }
    } catch (error) {
      console.error('Error checking pending requests:', error);
    } finally {
      setIsCheckingPending(false);
    }
  };

  // Load data when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchNetworkRewards();
      checkPendingRequests();
      
      // Fetch approved withdrawal history and collect withdrawn networks for current level
      (async () => {
        try {
          const res = await apiFetch('/withdraw-request/my-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          if (res.ok && json?.success) {
            const approved = (json.data || []).filter((r: any) => r.status === 'approved');
            const set = new Set<string>();
            approved.forEach((req: any) => {
              // Only consider withdrawals from the current level
              if (req.level === (userData?.tier || 1)) {
                (req.networks || []).forEach((n: string) => set.add(n.toUpperCase()));
              }
            });
            setWithdrawnNetworks(set);
          } else {
            setWithdrawnNetworks(new Set());
          }
        } catch {
          setWithdrawnNetworks(new Set());
        }
      })();
    }
  }, [isOpen, user, token]);

  // Poll for request status updates
  useEffect(() => {
    if (requestStatus === 'pending' && pendingRequest) {
      const checkStatus = async () => {
        try {
          const response = await apiFetch(`/withdraw-request/${pendingRequest._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          
          if (response.ok && data.success) {
            const request = data.data;
            if (request.status === 'approved') {
              setRequestStatus('approved');
              toast.success('🎉 Withdrawal approved! Funds added to your balance.');
              onSuccess();
              // Navigate to profile with success state (navigate first, then close)
              navigate('/profile', { 
                state: { 
                  showWithdrawSuccess: true,
                  withdrawAmount: Math.max(0, (request.amount || 0) - (lastSubmittedCommission || 0)),
                  withdrawWallet: request.walletAddress || 'Network Rewards'
                } 
              });
              onClose();
            } else if (request.status === 'rejected') {
              setRequestStatus('rejected');
              toast.error('Withdrawal request was rejected. Please contact support.');
            }
          }
        } catch (error) {
          console.error('Error checking request status:', error);
        }
      };

      pollingIntervalRef.current = setInterval(checkStatus, 3000);
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [requestStatus, pendingRequest, token, onSuccess]);

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      setTimeout(() => {
        if (requestStatus !== 'pending') {
          setRequestStatus('idle');
          setPendingRequest(null);
          setSelectedNetworks(new Set());
          setWithdrawAll(false);
          setWallet('');
          confettiShownRef.current = false; // Reset confetti flag
        }
      }, 300);
    }
  }, [isOpen, requestStatus]);

  // Recalculate commission when selected networks change
  useEffect(() => {
    if (Object.keys(networkRewards).length > 0) {
      fetchCommissionForSelectedNetworks();
    }
  }, [selectedNetworks, withdrawAll, networkRewards]);

  // Calculate available USDT (excluding withdrawn networks)
  useEffect(() => {
    if (Object.keys(conversionBreakdown).length > 0) {
      let available = 0;
      Object.entries(conversionBreakdown).forEach(([network, breakdown]: any) => {
        const upper = network.toUpperCase();
        // Only count networks that haven't been withdrawn
        if (!withdrawnNetworks.has(upper) && (breakdown?.usdt || 0) > 0) {
          available += breakdown.usdt;
        }
      });
      setAvailableUSDT(available);
      console.log('[Available USDT] Calculated available USDT (excluding withdrawn):', {
        availableUSDT: available,
        totalUSDT,
        withdrawnNetworks: Array.from(withdrawnNetworks)
      });
    }
  }, [conversionBreakdown, withdrawnNetworks, totalUSDT]);

  // Check if all networks have been withdrawn (by history) or no available rewards
  useEffect(() => {
    if (Object.keys(networkRewards).length > 0) {
      // A network is available if it has USDT > 0 and is NOT in withdrawn history
      const available = Object.entries(conversionBreakdown).some(([network, breakdown]: any) => {
        const upper = network.toUpperCase();
        return (breakdown?.usdt || 0) > 0 && !withdrawnNetworks.has(upper);
      });
      const allWithdrawn = !available;
      setAllNetworksWithdrawn(allWithdrawn);
      
      // Trigger confetti only once when all networks are withdrawn
      if (allWithdrawn && !confettiShownRef.current && isOpen) {
        confettiShownRef.current = true;
        // Fire confetti
        const duration = 15000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);
      }
    }
  }, [networkRewards, conversionBreakdown, withdrawnNetworks, isOpen]);

  // If everything is withdrawn, clear any selections and withdrawAll flag
  useEffect(() => {
    if (allNetworksWithdrawn) {
      setSelectedNetworks(new Set());
      setWithdrawAll(false);
      setTotalCommission(0);
    }
  }, [allNetworksWithdrawn]);

  if (!isOpen) return null;

  const handleNetworkToggle = (network: string) => {
    const newSelected = new Set(selectedNetworks);
    if (newSelected.has(network)) {
      newSelected.delete(network);
    } else {
      newSelected.add(network);
    }
    setSelectedNetworks(newSelected);
    setWithdrawAll(false);
  };

  const handleWithdrawAllToggle = () => {
    setWithdrawAll(!withdrawAll);
    if (!withdrawAll) {
      setSelectedNetworks(new Set());
    }
  };

  const getSelectedAmount = (): number => {
    if (withdrawAll) {
      // Return only available USDT (excluding withdrawn networks)
      return availableUSDT;
    }
    
    let total = 0;
    selectedNetworks.forEach(network => {
      const breakdown = conversionBreakdown[network];
      if (breakdown) {
        total += breakdown.usdt;
      }
    });
    return total;
  };

  const handleTierUpgrade = async () => {
    if (!user || !token) {
      toast.error('Authentication required');
      return;
    }

    // Calculate next tier
    const nextTier = (user.tier || 1) + 1;
    
    if (nextTier > 5) {
      toast.info('You are already at the maximum tier');
      return;
    }

    setIsUpgradingTier(true);
    try {
      // Submit tier upgrade request (with backend validation that all networks are withdrawn)
      const res = await apiFetch('/tier-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestedTier: nextTier })
      });
      const json = await res.json();
      
      if (res.ok && json?.success) {
        toast.success(`🎉 Tier upgrade request for Level ${nextTier} submitted! Awaiting admin approval.`, {
          duration: 5000
        });
        
        // Close popup and navigate to profile to see request status
        onClose();
        navigate('/profile');
      } else {
        toast.error(json?.message || 'Failed to submit tier upgrade request');
      }
    } catch (e) {
      console.error('Tier upgrade request error:', e);
      toast.error('Failed to submit tier upgrade request');
    } finally {
      setIsUpgradingTier(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check wallet verification first
    if (!user?.walletVerified) {
      toast.error('Wallet verification required', {
        description: 'Please verify your wallet in your profile before making withdrawal requests'
      });
      return;
    }
    
    const withdrawAmount = getSelectedAmount();
    
    // Validation
    if (withdrawAmount <= 0) {
      toast.error('Please select networks to withdraw from');
      return;
    }
    
    // For network rewards, only check if user has enough balance to pay commission
    if (totalCommission > currentBalance) {
      toast.error(`Insufficient balance to pay commission. Required: $${totalCommission}, Available: $${currentBalance}`);
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get available networks (excluding already withdrawn ones)
      const allNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
      const availableNetworks = withdrawAll 
        ? allNetworks.filter(network => {
            const upper = network.toUpperCase();
            const breakdown = conversionBreakdown[network];
            // Include only networks that are NOT withdrawn and have value > 0
            return !withdrawnNetworks.has(upper) && (breakdown?.usdt || 0) > 0;
          })
        : Array.from(selectedNetworks);
      
      // Get network rewards for available networks only
      const selectedNetworkRewards = withdrawAll 
        ? Object.fromEntries(
            availableNetworks.map(network => [network, networkRewards[network] || 0])
          )
        : Object.fromEntries(
            Array.from(selectedNetworks).map(network => [network, networkRewards[network] || 0])
          );
      
      console.log('[Withdraw] Submitting withdrawal:', {
        withdrawAll,
        availableNetworks,
        withdrawnNetworks: Array.from(withdrawnNetworks),
        selectedNetworkRewards,
        amount: withdrawAmount
      });

      const requestBody = {
        amount: withdrawAmount,
        wallet: '', // No wallet needed since money goes to balance
        networks: availableNetworks,
        networkRewards: selectedNetworkRewards,
        withdrawAll: withdrawAll,
        addToBalance: true // New flag to add network rewards to user balance instead of direct withdrawal
      };
      
      // Persist the commission related to this submission for later approval navigation
      setLastSubmittedCommission(totalCommission || 0);

      const response = await apiFetch('/withdraw-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('[Withdraw] API response:', { status: response.status, data });

      if (response.ok && data.success) {
        console.log('[Withdraw] Success! Request created:', data.data);
        
        // Check if the request was auto-approved (status is 'approved')
        if (data.data.status === 'approved') {
          // Auto-approved! Show success immediately
          toast.success('🎉 Withdrawal approved! Funds added to your balance.');
          
          // Refresh user data
          await refreshUser();
          
          // Navigate to profile with success state (navigate first, then close)
          navigate('/profile', { 
            state: { 
              showWithdrawSuccess: true,
              withdrawAmount: Math.max(0, (data.data.amount || 0) - (totalCommission || 0)),
              withdrawWallet: 'Network Rewards'
            } 
          });
          onClose();
        } else {
          // Request is pending approval
          setPendingRequest(data.data);
          setRequestStatus('pending');
          toast.success('Request submitted! Waiting for admin approval...');
          
          // Refresh network rewards after successful withdrawal
          await fetchNetworkRewards();
          
          // Update user data in AuthContext
          await refreshUser();
          
          // Clear selected networks since they've been withdrawn
          setSelectedNetworks(new Set());
          setWithdrawAll(false);
          setTotalCommission(0);
        }
      } else {
        console.log('[Withdraw] API error:', data.message);
        toast.error(data.message || 'Withdrawal request failed. Please try again.');
        setIsSubmitting(false); // Re-enable button on error
      }
    } catch (error) {
      console.error('[Withdraw] Network error:', error);
      toast.error('An error occurred. Please try again.');
      setIsSubmitting(false); // Re-enable button on error
    }
    // Don't reset isSubmitting on success - let the navigation handle cleanup
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
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
              <div className="text-center mb-6">
                <div className="flex justify-start gap-5 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Wallet className="text-purple-400" size={24} />
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <h2 className="text-2xl font-bold text-white">
                     {allNetworksWithdrawn ? 'All Networks Withdrawn!' : `Layer ${userData?.tier || 1} Scan Completed!`}
                    </h2>
                    <p className="text-gray-400 text-sm text-left">
                      {allNetworksWithdrawn
                        ? "Congratulations! You've successfully withdrawn from all networks."
                        : <>We have successfully identified <span className="font-bold text-green-500">${availableUSDT.toLocaleString()} USDT</span> available on this layer.</>
                      }
                    </p>
                  </div>
                </div>
              </div>
              

              {/* Network Rewards Display */}
              {isLoadingRewards ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading your network rewards...</p>
                </div>
              ) : (
                <div className="mb-6">

                {/* Commission Warning */}
                {totalCommission > currentBalance && (
                  <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-6">
                    <p className="text-red-400 text-sm font-semibold flex items-center gap-2 flex-row">
                      <XCircle className="w-4 h-4" />
                      <span>
                      Insufficient balance to pay commission. Please deposit <span className=" text-white">${(totalCommission - currentBalance).toLocaleString()}</span> to proceed.
                      </span>
                    </p>
                  </div>
                )}
                  
                  {/* Withdraw All Option - Hidden when all networks withdrawn */}
                  {!allNetworksWithdrawn && (
                    <div className="mb-6">
                      <div
                        onClick={handleWithdrawAllToggle}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
                          withdrawAll
                            ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/20'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {withdrawAll && (
                          <BorderBeam 
                            size={80} 
                            duration={8} 
                            colorFrom="#10b981" 
                            colorTo="#34d399"
                            borderWidth={2}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all ${
                              withdrawAll
                                ? 'bg-green-500 border-green-400'
                                : 'bg-white/5 border-white/20'
                            }`}>
                              {withdrawAll && <Check className="w-6 h-6 text-white" />}
                            </div>

                            <div className="flex flex-col items-start mb-1">
                              <span className="text-white font-semibold text-md">Withdraw All Networks</span>
                              <p className="text-gray-400 text-xs">Select all available networks</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-green-400">$</span>
                              <span className="text-2xl font-bold text-green-400">
                                {availableUSDT.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Available Value</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Network Options - 3 Column Grid */}
                  {!allNetworksWithdrawn && (
                    <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                      Or Select Individual Networks
                    </h3>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {NETWORKS.map(network => {
                      const amount = networkRewards[network.key] || 0;
                      const breakdown = conversionBreakdown[network.key];
                      const isSelected = selectedNetworks.has(network.key);
                      const hasAmount = amount > 0;
                      const isWithdrawn = withdrawnNetworks.has(network.key);
                      
                      return (
                        <div
                          key={network.key}
                          onClick={() => hasAmount && !withdrawAll && !isWithdrawn && handleNetworkToggle(network.key)}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            !hasAmount || isWithdrawn
                              ? 'opacity-40 cursor-not-allowed bg-green-500/5 border-green-500/20'
                              : withdrawAll
                              ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10'
                              : isSelected
                              ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/10 cursor-pointer'
                              : 'bg-white/5 border-white/10 hover:border-white/20 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all ${
                              !hasAmount || isWithdrawn
                                ? 'bg-green-500/20 border-green-500/30'
                                : isSelected && !withdrawAll
                                ? 'bg-green-500 border-green-400'
                                : 'bg-white/5 border-white/20'
                            }`}>
                              {(!hasAmount || isWithdrawn) && <Check className="w-5 h-5 text-green-500/50" />}
                              {isSelected && !withdrawAll && hasAmount && <Check className="w-5 h-5 text-white" />}
                            </div>
                            <img 
                              src={network.icon} 
                              alt={network.name} 
                              className={`w-6 h-6 ${(!hasAmount || isWithdrawn) ? 'opacity-50' : ''}`} 
                            />
                          </div>
                          <div>
                            <div className={`text-sm mb-2 ${(!hasAmount || isWithdrawn) ? 'text-gray-500' : 'text-gray-300'}`}>
                              {amount.toLocaleString()} {network.key}
                            </div>
                            <div className={`text-xs ${(!hasAmount || isWithdrawn) ? 'text-gray-600' : 'text-gray-400'}`}>
                              ${breakdown?.usdt?.toLocaleString?.() || '0'} USDT
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              {/* Conditional Button Section */}
              {allNetworksWithdrawn ? (
                // Show Upgrade Button when all networks are withdrawn
                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={handleTierUpgrade}
                    disabled={isUpgradingTier}
                    className="w-full bg-purple-500/20 border border-purple-500  hover:bg-purple-500 text-white py-6 rounded-xl font-semibold transition-all cursor-pointer"
                  >
                    {isUpgradingTier ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting Upgrade Request...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Upgrade to Level {(user?.tier || 1) + 1}
                        <ArrowUp className="w-5 h-5 border border-white rounded ms-1" />
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                // Show normal withdraw buttons
                <>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => {
                        if (totalCommission > currentBalance) {
                          // Navigate to profile with state to open top-up popup
                          navigate('/profile', { state: { openTopupPopup: true } });
                          onClose();
                        } else {
                          // Navigate to profile normally
                          navigate('/profile');
                          onClose();
                        }
                      }}
                      className={`flex-1 py-6 rounded-xl font-semibold transition-all shadow-lg ${
                        totalCommission > currentBalance
                          ? 'bg-green-500/40 hover:bg-green-500/50 border border-green-500/50 shadow-green-500/20'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      } text-white`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {totalCommission > currentBalance ? (
                          <>
                            <Plus className="w-5 h-5" />
                            Request Top-Up
                          </>
                        ) : (
                          <>
                            <User className="w-5 h-5" />
                            Go to Profile
                          </>
                        )}
                      </span>
                    </Button>
                    {!allNetworksWithdrawn && (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || getSelectedAmount() <= 0 || totalCommission > currentBalance || !user?.walletVerified}
                        className="flex-1 bg-purple-500/40 hover:bg-purple-500/50 border border-purple-500/50 text-white py-6 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                          </span>
                        ) : totalCommission > currentBalance ? (
                          'Insufficient Balance'
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Withdraw ${getSelectedAmount().toLocaleString()}
                          </span>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Commission Info */}
                  {(!allNetworksWithdrawn && (withdrawAll || selectedNetworks.size > 0)) && (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-500">
                        Network commission: ${totalCommission.toLocaleString()} ({((totalCommission / getSelectedAmount()) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* PENDING STATE - Show pending request */}
          {requestStatus === 'pending' && pendingRequest && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-yellow-500 opacity-30" />
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Request Pending</h3>
              <p className="text-gray-400 mb-6">
                Your withdrawal request for <span className="text-green-400 font-bold">${pendingRequest.amount.toLocaleString()}</span> is being reviewed by our team.
              </p>
              <div className="relative bg-white/5 border border-yellow-500/30 rounded-xl p-6 mb-6 overflow-hidden">
                <div className="relative z-10">
                  <div className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-4">Request Details</div>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-semibold">${pendingRequest.amount.toLocaleString()}</span>
                    </div>
                    {pendingRequest.walletAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Wallet:</span>
                        <span className="text-white font-mono text-sm">{pendingRequest.walletAddress.substring(0, 10)}...{pendingRequest.walletAddress.substring(pendingRequest.walletAddress.length - 8)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 font-semibold text-sm">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                You'll be notified once your request is processed.
              </p>
            </div>
          )}

          {/* APPROVED STATE */}
          {requestStatus === 'approved' && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500 opacity-30" />
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Request Approved!</h3>
              <p className="text-gray-400 mb-8">
                Your withdrawal has been approved and funds will be sent to your wallet shortly.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-500/20"
              >
                Close
              </button>
            </div>
          )}

          {/* REJECTED STATE */}
          {requestStatus === 'rejected' && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500 opacity-30" />
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Request Rejected</h3>
              <p className="text-gray-400 mb-8">
                Your withdrawal request was rejected. Please contact support for more information.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/20"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedWithdrawPopup;
