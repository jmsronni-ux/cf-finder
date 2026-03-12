import React, { useState } from 'react';
import { Calendar, Hash, DollarSign, CheckCircle2, Clock, XCircle, FileText, User, Wallet, KeyRound, Snowflake, AlertTriangle } from 'lucide-react';
import { PulsatingButton } from './ui/pulsating-button';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import InsufficientBalancePopup from './InsufficientBalancePopup';
import { apiFetch } from '../utils/api';
import { useConversionRates } from '../hooks/useConversionRates';

interface NodeDetailsPanelProps {
  selectedNode: any;
  onClose: () => void;
  hasStarted?: boolean;
  hasWatchedCurrentLevel?: boolean;
  onStartAnimation?: () => void;
  onWithdrawClick?: () => void;
  withdrawalSystem?: string;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  selectedNode,
  onClose,
  hasStarted = false,
  hasWatchedCurrentLevel = false,
  onStartAnimation,
  onWithdrawClick,
  withdrawalSystem = 're_allocate_funds'
}) => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [nextTierInfo, setNextTierInfo] = useState<{ tier: number; price: number; name: string } | null>(null);
  const [showInsufficientBalancePopup, setShowInsufficientBalancePopup] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState({ requiredAmount: 0, tierName: '' });
  const [pendingTierRequest, setPendingTierRequest] = useState<boolean>(false);
  const [wallets, setWallets] = useState<{ btc?: string; eth?: string; tron?: string; usdtErc20?: string } | null>(null);
  const { ratesMap } = useConversionRates();

  // Fetch pending tier requests
  React.useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!token) return;
      try {
        const res = await apiFetch('/tier-request/my-requests', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success) {
          const pending = json.data.requests?.find((req: any) => req.status === 'pending');
          setPendingTierRequest(!!pending);
        }
      } catch (e) {
        console.error('Failed to fetch pending requests', e);
      }
    };
    fetchPendingRequests();
  }, [token, user?.tier]);

  // Fetch next tier upgrade options
  React.useEffect(() => {
    const fetchNextTierInfo = async () => {
      if (!token || !user) {
        return;
      }

      try {
        const res = await apiFetch('/tier/my-tier', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();

        if (res.ok && json?.success && json.data.upgradeOptions?.length > 0) {
          const nextTier = json.data.upgradeOptions[0];
          setNextTierInfo({
            tier: nextTier.tier,
            price: nextTier.upgradePrice,
            name: nextTier.name
          });
        } else {
          setNextTierInfo(null);
        }
      } catch (e) {
        console.error('NodeDetailsPanel: Failed to fetch tier info', e);
      }
    };

    fetchNextTierInfo();
  }, [token, user?.tier]);

  // Fetch user wallets
  React.useEffect(() => {
    const fetchWallets = async () => {
      if (!token) return;
      try {
        const res = await apiFetch('/user/me/wallets', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setWallets({
            btc: json?.data?.btc || '',
            eth: json?.data?.eth || '',
            tron: json?.data?.tron || '',
            usdtErc20: json?.data?.usdtErc20 || ''
          });
        }
      } catch (e) {
        console.error('Failed to fetch wallets', e);
      }
    };
    fetchWallets();
  }, [token]);

  // Handle upgrade button click
  const handleUpgradeClick = async () => {
    if (!user || !token) {
      toast.error('Authentication required');
      return;
    }

    // If no next tier available (max tier), navigate to profile
    if (user?.tier === 5) {
      toast.info('You are already at the maximum tier');
      navigate('/profile');
      return;
    }

    if (!nextTierInfo) {
      toast.error('Unable to load tier information. Please try again.');
      return;
    }

    // Check if user has enough balance
    if (user.balance < nextTierInfo.price) {
      setInsufficientBalanceInfo({
        requiredAmount: nextTierInfo.price,
        tierName: nextTierInfo.name
      });
      setShowInsufficientBalancePopup(true);
      return;
    }

    // Proceed with upgrade
    setIsUpgrading(true);
    try {
      const res = await apiFetch('/tier/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetTier: nextTierInfo.tier })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(json.message || `Successfully upgraded to ${nextTierInfo.name}!`);
        // Refresh user data
        await refreshUser();
        onClose(); // Close the panel after successful upgrade
      } else {
        toast.error(json?.message || 'Failed to upgrade tier');
      }
    } catch (e) {
      console.error('Tier upgrade error:', e);
      toast.error('Failed to upgrade tier');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Early return after all hooks
  if (!selectedNode) return null;

  // Detect if this is the user/center node
  const isUserNode = selectedNode.id === 'center' || selectedNode.type === 'accountNode';
  const isFingerprintNode = selectedNode.type === 'fingerprintNode';

  const hasTransaction = selectedNode.data.transaction;
  const transaction = selectedNode.data.transaction || {};

  // Get wallets that have been added (non-empty)
  const verifiedWallets = wallets ? [
    { name: 'Bitcoin (BTC)', address: wallets.btc, icon: '₿', color: 'text-orange-400' },
    { name: 'Ethereum (ETH)', address: wallets.eth, icon: 'Ξ', color: 'text-blue-400' },
    { name: 'Tron (TRON)', address: wallets.tron, icon: 'T', color: 'text-red-400' },
    { name: 'USDT ERC20', address: wallets.usdtErc20, icon: '₮', color: 'text-green-400' }
  ].filter(wallet => wallet.address && wallet.address.trim() !== '') : [];

  // Get status mapping (no longer mapping the generic status immediately to the header, 
  // we will map it below dynamically based on Node Progress state)
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Success':
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20'
        };
      case 'Pending':
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'Fail':
      case 'fail':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20'
        };
      case 'Locked':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20'
        }
      case 'Cold Wallet':
      case 'cold wallet':
        return {
          icon: <Snowflake className="w-5 h-5" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
      case 'Reported':
      case 'reported':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
      default: // Available
        return {
          icon: <KeyRound className="w-5 h-5 text-orange-400" />,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
    }
  };

  // Compute the current user-facing status for *this specific node*
  let nodeStatus = 'Available';
  if (selectedNode.data.dakLocked) {
    nodeStatus = 'Locked';
  } else if (selectedNode.data.nodeProgressStatus === 'pending') {
    nodeStatus = 'Pending';
  } else if (selectedNode.data.nodeProgressStatus === 'success') {
    nodeStatus = 'Success';
  } else if (selectedNode.data.nodeProgressStatus === 'fail') {
    nodeStatus = 'Fail';
  }

  const statusDisplay = getStatusDisplay(nodeStatus);

  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            {isUserNode ? (
              <User className="text-purple-400" size={24} />
            ) : (
              <FileText className="text-purple-400" size={24} />
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isUserNode ? 'Account Details' : 'Transaction Details'}
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-4 relative z-10 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {isUserNode ? (
            /* User Node Content */
            <>
              {/* Username */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="pl-8">
                    <div className="text-xs text-gray-400 mb-1">Username</div>
                    <div className="text-lg font-bold text-white">
                      {user?.name || 'User'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Wallets */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-300">Verified Wallets</h3>
                </div>

                {verifiedWallets.length > 0 ? (
                  <div className="space-y-2">
                    {verifiedWallets.map((wallet, index) => (
                      <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className={`text-xl font-bold ${wallet.color} mt-0.5`}>
                            {wallet.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 mb-1">{wallet.name}</div>
                            <div className="text-xs font-mono text-white break-all">
                              {wallet.address}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-gray-400 text-sm text-center">
                      No wallets added yet
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : hasTransaction ? (
            /* Transaction Node Content */
            <>
              {/* Status Badge (Dynamic node state) */}
              {isFingerprintNode && hasWatchedCurrentLevel && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
                  <span className={statusDisplay.color}>{statusDisplay.icon}</span>
                  <span className={`font-semibold ${statusDisplay.color}`}>
                    {nodeStatus === 'Locked' && 'Dependency Locked'}
                    {nodeStatus === 'Available' && 'Waiting for Keys'}
                    {nodeStatus === 'Pending' && 'Keys Requested (Pending)'}
                    {nodeStatus === 'Success' && 'Key Verified (Success)'}
                    {nodeStatus === 'Fail' && 'Key Failed (Retry)'}
                    {nodeStatus === 'Cold Wallet' && 'Cold Wallet'}
                    {nodeStatus === 'Reported' && 'Reported'}
                  </span>
                </div>
              )}

              {/* Transaction Amount */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="pl-8 flex flex-row justify-between items-center">
                    <div className="text-xl font-bold text-white font-mono">
                      {transaction.amount ? Number(transaction.amount).toFixed(0) : '0'} USD
                    </div>
                    {transaction.currency && ratesMap[transaction.currency] && (
                      <div className="text-xs text-gray-400 font-mono">
                        ≈ {(Number(transaction.amount) / ratesMap[transaction.currency]).toFixed(8)} {transaction.currency}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Date */}
              {transaction.date && (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="w-full bg-white/5 text-white pl-10 pr-5 py-3 rounded-lg border border-white/10">
                      <div className="text-sm font-medium">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Hash */}
              {transaction.transaction && (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="w-full bg-white/5 text-white pl-10 pr-5 py-3 rounded-lg border border-white/10">
                      <div className="text-xs font-mono break-all">
                        {transaction.transaction}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Transaction Data */
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-purple-300 text-sm text-center">
                No transaction details available for this node.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 relative z-10 space-y-3">
          {isFingerprintNode && hasWatchedCurrentLevel && withdrawalSystem === 'direct_access_keys' ? (
            /* Generate Keys specific block — only visible in Direct Access Keys mode */
            <>
              {nodeStatus === 'Locked' && (
                <Button
                  disabled
                  className="w-full bg-gray-600 cursor-not-allowed text-white h-12 text-sm font-semibold"
                >
                  Unlock previous nodes first
                </Button>
              )}
              {(nodeStatus === 'Available' || nodeStatus === 'Fail') && (
                <PulsatingButton
                  pulseColor="#f97316"
                  duration="1.5s"
                  variant={"withdraw"}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700"
                  onClick={onWithdrawClick}
                >
                  Generate Access Keys
                </PulsatingButton>
              )}
              {nodeStatus === 'Pending' && (
                <Button
                  disabled
                  className="w-full bg-yellow-600/20 border border-yellow-500/30 cursor-not-allowed text-yellow-400 h-12 text-sm font-semibold"
                >
                  Awaiting Admin Review...
                </Button>
              )}
              {nodeStatus === 'Success' && (
                <Button
                  disabled
                  className="w-full bg-green-600/20 border border-green-500/30 cursor-not-allowed text-green-400 h-12 text-sm font-semibold"
                >
                  Node Unlocked ✓
                </Button>
              )}
            </>
          ) : withdrawalSystem === 'direct_access_keys' ? (
            /* Non-fingerprint node in Direct Access Keys mode — no scan available */
            null
          ) : (
            <PulsatingButton
              pulseColor="#764FCB"
              duration="1.5s"
              variant={
                pendingTierRequest ? "upgradePending" :
                  hasStarted ? "loading" :
                    "start"
              }
              isLoading={isUpgrading}
              className="w-full h-12"
              onClick={pendingTierRequest ? undefined : (hasStarted ? undefined : () => {
                if (!user?.walletVerified) {
                  toast.error('Please verify your wallet before starting', {
                    description: 'Go to your profile to request wallet verification'
                  });
                  return;
                }
                onStartAnimation?.();
              })}
              disabled={pendingTierRequest || hasStarted || isUpgrading}
            >
              {pendingTierRequest ? 'Upgrade Pending' : (isUpgrading ? 'Upgrading...' : hasStarted ? 'Running...' : 'Start scan')}
            </PulsatingButton>
          )}


          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Insufficient Balance Popup */}
      <InsufficientBalancePopup
        isOpen={showInsufficientBalancePopup}
        onClose={() => setShowInsufficientBalancePopup(false)}
        requiredAmount={insufficientBalanceInfo.requiredAmount}
        currentBalance={user?.balance || 0}
        tierName={insufficientBalanceInfo.tierName}
      />
    </div>
  );
};

export default NodeDetailsPanel;

