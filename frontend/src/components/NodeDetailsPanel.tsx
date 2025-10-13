import React, { useState } from 'react';
import { Calendar, Hash, DollarSign, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { PulsatingButton } from './ui/pulsating-button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import InsufficientBalancePopup from './InsufficientBalancePopup';
import { apiFetch } from '../utils/api';

interface NodeDetailsPanelProps {
  selectedNode: any;
  onClose: () => void;
  hasStarted?: boolean;
  hasWatchedCurrentLevel?: boolean;
  onStartAnimation?: () => void;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ 
  selectedNode, 
  onClose,
  hasStarted = false,
  hasWatchedCurrentLevel = false,
  onStartAnimation
}) => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [nextTierInfo, setNextTierInfo] = useState<{ tier: number; price: number; name: string } | null>(null);
  const [showInsufficientBalancePopup, setShowInsufficientBalancePopup] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState({ requiredAmount: 0, tierName: '' });
  const [pendingTierRequest, setPendingTierRequest] = useState<boolean>(false);

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

  const hasTransaction = selectedNode.data.transaction;
  const transaction = selectedNode.data.transaction || {};

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Success':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20'
        };
      case 'Pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'Fail':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const statusDisplay = getStatusDisplay(transaction.status);

  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-sm">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl" />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <FileText className="text-purple-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Transaction Details</h2>
        </div>

        {/* Content */}
        <div className="space-y-4 relative z-10 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {hasTransaction ? (
            <>
              {/* Status Badge */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
                <span className={statusDisplay.color}>{statusDisplay.icon}</span>
                <span className={`font-semibold ${statusDisplay.color}`}>{transaction.status}</span>
              </div>

              {/* Transaction Amount */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="pl-8">
                    <div className="text-xl font-bold text-white font-mono">
                      {transaction.amount ? Number(transaction.amount).toFixed(0) : '0'} USD
                    </div>
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
          <PulsatingButton 
            pulseColor="#764FCB" 
            duration="1.5s"
            variant={
              pendingTierRequest ? "upgradePending" :
              hasWatchedCurrentLevel ? "withdraw" : 
              hasStarted ? "loading" : 
              "start"
            }
            isLoading={isUpgrading}
            className="w-full h-12"
            onClick={pendingTierRequest ? undefined : (hasWatchedCurrentLevel ? () => {
              // Navigate to profile with state to open withdraw popup
              navigate('/profile', { state: { openWithdrawPopup: true } });
            } : (hasStarted ? undefined : onStartAnimation))}
            disabled={pendingTierRequest || (hasStarted && !hasWatchedCurrentLevel) || isUpgrading}
          >
            {pendingTierRequest ? 'Upgrade Pending' : (isUpgrading ? 'Upgrading...' : hasWatchedCurrentLevel ? 'Withdraw' : hasStarted ? '' : 'Start scan')}
          </PulsatingButton>
          
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

