import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Wallet, AlertCircle, CheckCircle, Clock, Loader2, XCircle, Copy, Coins } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

interface EnhancedWithdrawPopupProps {
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

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', icon: 'T', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', icon: '$', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', icon: 'B', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500' }
];

const EnhancedWithdrawPopup: React.FC<EnhancedWithdrawPopupProps> = ({ 
  isOpen, 
  onClose, 
  currentBalance,
  onSuccess 
}) => {
  const [networkRewards, setNetworkRewards] = useState<NetworkRewards>({});
  const [conversionBreakdown, setConversionBreakdown] = useState<ConversionBreakdown>({});
  const [totalUSDT, setTotalUSDT] = useState<number>(0);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());
  const [withdrawAll, setWithdrawAll] = useState<boolean>(false);
  const [wallet, setWallet] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [pendingRequest, setPendingRequest] = useState<WithdrawRequest | null>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user, token } = useAuth();

  // Calculate total commission from user data
  const calculateTotalCommission = () => {
    if (!user) return 0;
    
    let commission = 0;
    const levels = [1, 2, 3, 4, 5];
    
    for (const level of levels) {
      const networkRewardsField = `lvl${level}NetworkRewards`;
      const commissionField = `lvl${level}Commission`;
      const userNetworkRewards = (user as any)[networkRewardsField] || {};
      const levelCommission = (user as any)[commissionField] || 0;
      
      // Check if user has rewards for this level
      const hasRewards = Object.values(userNetworkRewards).some((val: any) => val > 0);
      
      // If user has rewards for this level, add commission
      if (hasRewards && levelCommission > 0) {
        commission += levelCommission;
      }
    }
    
    return commission;
  };

  // Fetch user's total network rewards
  const fetchNetworkRewards = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoadingRewards(true);
      const response = await apiFetch(`/user-network-reward/user/${user._id}/total`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setNetworkRewards(data.data.totalRewards);
        setConversionBreakdown(data.data.conversionBreakdown);
        setTotalUSDT(data.data.totalUSDT);
        
        // Calculate commission
        const commission = calculateTotalCommission();
        setTotalCommission(commission);
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
    }
  }, [isOpen, user]);

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
              toast.success('🎉 Withdrawal approved! Funds will be sent to your wallet.');
              onSuccess();
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
        }
      }, 300);
    }
  }, [isOpen, requestStatus]);

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
      return totalUSDT;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = getSelectedAmount();
    
    // Validation
    if (withdrawAmount <= 0) {
      toast.error('Please select networks to withdraw from');
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
      const response = await apiFetch('/withdraw-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          wallet: wallet.trim(),
          networks: withdrawAll ? ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'] : Array.from(selectedNetworks),
          networkRewards: withdrawAll ? networkRewards : Object.fromEntries(
            Array.from(selectedNetworks).map(network => [network, networkRewards[network] || 0])
          ),
          withdrawAll: withdrawAll
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
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
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                  <Coins className="text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Withdraw Network Rewards</h2>
                  <p className="text-gray-400 text-sm">Available Balance: <span className="text-green-500 font-semibold">${currentBalance.toLocaleString()}</span></p>
                  {totalCommission > 0 && (
                    <p className="text-orange-400 text-sm mt-1">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Commission Required: <span className="font-semibold">${totalCommission.toLocaleString()} USDT</span>
                    </p>
                  )}
                  {totalCommission > currentBalance && (
                    <p className="text-red-400 text-xs mt-1">
                      ⚠️ Insufficient balance to pay commission
                    </p>
                  )}
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
                  <h3 className="text-lg font-semibold text-white mb-4">Your Network Rewards</h3>
                  
                  {/* Withdraw All Option */}
                  <div className="mb-4">
                    <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={withdrawAll}
                        onChange={handleWithdrawAllToggle}
                        className="w-4 h-4 text-purple-500 bg-transparent border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-medium">Withdraw All Networks</span>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-lg font-bold text-green-400">${totalUSDT.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Total Value</div>
                      </div>
                    </label>
                  </div>

                  {/* Individual Network Options */}
                  <div className="space-y-2">
                    {NETWORKS.map(network => {
                      const amount = networkRewards[network.key] || 0;
                      const breakdown = conversionBreakdown[network.key];
                      const isSelected = selectedNetworks.has(network.key);
                      
                      if (amount === 0) return null;
                      
                      return (
                        <label key={network.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleNetworkToggle(network.key)}
                            disabled={withdrawAll}
                            className="w-4 h-4 text-purple-500 bg-transparent border-white/20 rounded focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
                          />
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${network.color}`}>{network.icon}</span>
                            <span className="text-white font-medium">{network.name}</span>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-sm text-white">{amount.toLocaleString()} {network.key}</div>
                            <div className="text-xs text-gray-400">${breakdown?.usdt.toLocaleString() || '0'} USDT</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Selected Amount Summary */}
                  {getSelectedAmount() > 0 && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-green-400 font-medium">Selected Amount:</span>
                        <span className="text-xl font-bold text-green-400">${getSelectedAmount().toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Wallet Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder="Enter your wallet address"
                      className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-lg transition-all"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                {/* Commission Warning */}
                {totalCommission > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h4 className="text-orange-400 font-semibold mb-1">Commission Required</h4>
                        <p className="text-orange-300/80 text-sm">
                          A commission fee of <span className="font-semibold">${totalCommission.toLocaleString()} USDT</span> will be deducted from your balance to process this withdrawal.
                        </p>
                        {totalCommission > currentBalance && (
                          <p className="text-red-400 text-sm mt-2 font-semibold">
                            ⚠️ You don't have enough balance to pay the commission. Please deposit more funds.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || getSelectedAmount() <= 0 || totalCommission > currentBalance}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting Request...
                    </>
                  ) : totalCommission > currentBalance ? (
                    'Insufficient Balance for Commission'
                  ) : (
                    `Withdraw $${getSelectedAmount().toLocaleString()}`
                  )}
                </Button>
              </form>
            </>
          )}

          {/* PENDING STATE - Show pending request */}
          {requestStatus === 'pending' && pendingRequest && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request Pending</h3>
              <p className="text-gray-400 mb-6">
                Your withdrawal request for <span className="text-green-400 font-semibold">${pendingRequest.amount}</span> is being reviewed by our team.
              </p>
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-400 mb-2">Request Details:</div>
                <div className="text-white">Amount: ${pendingRequest.amount}</div>
                <div className="text-white">Wallet: {pendingRequest.walletAddress}</div>
                <div className="text-white">Status: <span className="text-yellow-400">Pending</span></div>
              </div>
              <p className="text-sm text-gray-400">
                You'll be notified once your request is processed.
              </p>
            </div>
          )}

          {/* APPROVED STATE */}
          {requestStatus === 'approved' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request Approved!</h3>
              <p className="text-gray-400 mb-6">
                Your withdrawal has been approved and funds will be sent to your wallet shortly.
              </p>
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
              >
                Close
              </Button>
            </div>
          )}

          {/* REJECTED STATE */}
          {requestStatus === 'rejected' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request Rejected</h3>
              <p className="text-gray-400 mb-6">
                Your withdrawal request was rejected. Please contact support for more information.
              </p>
              <Button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
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

export default EnhancedWithdrawPopup;
