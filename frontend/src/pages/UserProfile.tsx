import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowBigUpIcon, CrownIcon, ShieldIcon, ZapIcon, StarIcon, Loader2, Wallet, Plus, Users, UserIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import EnhancedWithdrawPopup from '../components/EnhancedWithdrawPopup';
import TopupRequestPopup from '../components/TopupRequestPopup';
import UserTransactions from './UserTransactions';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import div from '../components/ui/magic-card';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';
import LevelProgressBar from '../components/LevelProgressBar';
import { Link } from 'react-router-dom';
import WithdrawPopup from '@/components/WithdrawPopup';
import AddWalletPopup from '../components/AddWalletPopup';
import ChangeWallet from '../components/ChangeWallet';
import WithdrawSuccessPopup from '../components/WithdrawSuccessPopup';
import { WalletVerificationRequest } from '../types/wallet-verification';

interface TierInfo {
  tier: number;
  name: string;
  description: string;
  benefits: string[];
  color: string;
  icon: React.ReactNode;
  features?: string[];
}

const UserProfile: React.FC = () => {
  const { user, logout, token, refreshUser } = useAuth();
  const location = useLocation();
  const [wallets, setWallets] = useState<{ btc?: string; eth?: string; tron?: string; usdtErc20?: string } | null>(null);
  const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);
  const [showTopupPopup, setShowTopupPopup] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<TierInfo[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [upgradingToTier, setUpgradingToTier] = useState<number | null>(null);
  const [pendingTierRequest, setPendingTierRequest] = useState<{ tier: number; name: string } | null>(null);
  const [showTierRequestSuccess, setShowTierRequestSuccess] = useState(false);
  const [submittedTierRequest, setSubmittedTierRequest] = useState<{ tier: number; name: string } | null>(null);
  const [showChangeWalletPopup, setShowChangeWalletPopup] = useState(false);
  const [showWithdrawSuccess, setShowWithdrawSuccess] = useState(false);
  const [withdrawSuccessData, setWithdrawSuccessData] = useState<{ amount?: number; wallet?: string }>({});
  const [verificationRequest, setVerificationRequest] = useState<WalletVerificationRequest | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const navigate = useNavigate();

  // Ensure we show real-time tier/balance from DB
  useEffect(() => {
    refreshUser();
  }, []);

  // Check if we should auto-open the withdraw or topup popup from navigation state
  useEffect(() => {
    const state = location.state as { 
      openWithdrawPopup?: boolean; 
      openTopupPopup?: boolean;
      showWithdrawSuccess?: boolean;
      withdrawAmount?: number;
      withdrawWallet?: string;
    } | null;
    
    if (state?.openWithdrawPopup) {
      setShowWithdrawPopup(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.openTopupPopup) {
      setShowTopupPopup(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.showWithdrawSuccess) {
      setShowWithdrawSuccess(true);
      setWithdrawSuccessData({
        amount: state.withdrawAmount,
        wallet: state.withdrawWallet
      });
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Fetch available tier upgrades and pending requests
  useEffect(() => {
    const fetchTierOptions = async () => {
      if (!token) return;
      setLoadingTiers(true);
      try {
        const res = await apiFetch('/tier/my-tier', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success) {
          setUpgradeOptions(json.data.upgradeOptions || []);
        }
      } catch (e) {
        console.error('Failed to fetch tier options', e);
      } finally {
        setLoadingTiers(false);
      }
    };

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
          // Find the first pending request
          const pending = json.data.requests?.find((req: any) => req.status === 'pending');
          if (pending) {
            // Get tier name from tier config
            const tierNames: { [key: number]: string } = {
              1: 'Basic',
              2: 'Standard',
              3: 'Professional',
              4: 'Enterprise',
              5: 'Premium'
            };
            setPendingTierRequest({
              tier: pending.requestedTier,
              name: tierNames[pending.requestedTier] || `Tier ${pending.requestedTier}`
            });
          } else {
            setPendingTierRequest(null);
          }
        }
      } catch (e) {
        console.error('Failed to fetch pending requests', e);
      }
    };

    fetchTierOptions();
    fetchPendingRequests();
  }, [token, user?.tier]); // Refetch when tier changes

  // Fetch wallets and verification status
  useEffect(() => {
    if (token) {
      fetchWallets();
      fetchVerificationStatus();
    }
  }, [token]);

  // Submit wallet verification request
  const handleVerifyWallet = async () => {
    if (!wallets?.btc) {
      toast.error('No wallet address found');
      return;
    }

    setSubmittingVerification(true);
    try {
      const res = await apiFetch('/wallet-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletAddress: wallets.btc,
          walletType: 'btc'
        })
      });

      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Verification request submitted! Admin will review your wallet shortly.');
        fetchVerificationStatus();
      } else {
        toast.error(json.message || 'Failed to submit verification request');
      }
    } catch (e) {
      console.error('Failed to submit verification request', e);
      toast.error('An error occurred while submitting verification request');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Fetch wallet verification status
  const fetchVerificationStatus = async () => {
    if (!token) return;
    try {
      setLoadingVerification(true);
      const res = await apiFetch('/wallet-verification/my-requests', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        // Find the latest verification request for BTC wallet
        const btcRequest = json.data.requests?.find((req: WalletVerificationRequest) => 
          req.walletType === 'btc'
        );
        setVerificationRequest(btcRequest || null);
      }
    } catch (e) {
      console.error('Failed to fetch verification status', e);
    } finally {
      setLoadingVerification(false);
    }
  };

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
      // Silent fail
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [token]);

  const handleTierUpgrade = async (targetTier: number, tierName?: string): Promise<void> => {
    if (!token || !user) return;

    setUpgradingToTier(targetTier);
    try {
      const res = await apiFetch('/tier-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestedTier: targetTier })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        // Show success popup
        setSubmittedTierRequest({
          tier: targetTier,
          name: tierName || `Tier ${targetTier}`
        });
        setShowTierRequestSuccess(true);
        // Update pending request status
        setPendingTierRequest({
          tier: targetTier,
          name: tierName || `Tier ${targetTier}`
        });
      } else {
        toast.error(json?.message || 'Failed to submit tier upgrade request');
      }
    } catch (e) {
      console.error('Tier upgrade request error:', e);
      toast.error('Failed to submit tier upgrade request');
    } finally {
      setUpgradingToTier(null);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = (): void => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div id="profile" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Welcome back, <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    {user.name}
                  </span>
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.isAdmin && (
                  <Link to='/admin' className=" text-white flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50"
                  >
                    <Users size={16} />
                    Admin Panel
                  </Link>
                )}
                <Link to='/dashboard' >
                  <Button className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>

            {/* Tier Upgrade Pending Banner - Prominent at top */}
            {pendingTierRequest && (
              <div className="mt-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-5 shadow-lg">
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold text-yellow-300">Upgrade Request Pending</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-3 py-1">
                    Awaiting Approval
                  </Badge>
                </div>
              </div>
            )}

            {/* User Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {/* Current Balance */}
              <div className="group h-full">
                <Card className="h-full flex flex-col border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Current Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-3xl font-bold mb-4 text-foreground">${user.balance.toFixed(0)}</p>
                    <div className="space-y-2 mt-auto">
                      <Button 
                        onClick={() => setShowTopupPopup(true)}
                        className="w-full bg-purple-600/50 hover:bg-purple-700 flex items-center justify-center gap-2 border border-purple-600 text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Request Top-Up
                      </Button>
                      <Button
                        onClick={() => setShowWithdrawPopup(true)}
                        className="w-full bg-transparent text-white border-[0.5px] border-white/35 hover:bg-white/10 flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Withdraw Funds
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Tier */}
              <div className="group h-full">
                <Card className="h-full flex flex-col border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <ArrowBigUpIcon className="w-6 h-6" />
                      <span>Current Level</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <LevelProgressBar level={user.tier} />
                    
                    {upgradeOptions.length > 0 && upgradeOptions[0] && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Next Level:</span>
                          <span className="text-foreground font-semibold">
                            {upgradeOptions[0].tier}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Est. Reward:</span>
                          <span className="text-green-500 font-bold">
                            ${(user[`lvl${upgradeOptions[0].tier}reward` as keyof typeof user] as number)?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    )}
                    {upgradeOptions.length === 0 && user.tier === 5 && (
                      <div className="mt-4 text-center">
                        <CrownIcon className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                        <p className="text-sm text-foreground font-semibold">Max Tier!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* User Details */}
              <div className="group h-full">
                <Card className="h-full flex flex-col border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2"> <UserIcon className="w-6 h-6" /> Details</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-2">
                    <p className="text-sm text-foreground w-full border border-border rounded-md p-2"><strong className="me-4">Email:</strong> {user.email}</p>
                    <p className="text-sm text-foreground w-full border border-border rounded-md p-2"><strong className="me-4">Phone:</strong> {user.phone || 'Not provided'}</p>
                    
                    
                    {/* Wallet Verification Status */}
                    {wallets?.btc && (
                      <div className="mt-2 space-y-2">
                        {verificationRequest ? (
                          <div className="w-full border border-border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Wallet Verification</span>
                              {verificationRequest.status === 'pending' && (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              {verificationRequest.status === 'approved' && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              {verificationRequest.status === 'rejected' && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </div>
                            {verificationRequest.status === 'rejected' && verificationRequest.rejectionReason && (
                              <p className="text-xs text-red-400 mt-1">
                                Reason: {verificationRequest.rejectionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button 
                            onClick={handleVerifyWallet}
                            disabled={submittingVerification}
                            className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 flex items-center justify-center gap-2"
                          >
                            {submittingVerification ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Request Verification
                              </>
                            )}
                          </Button>
                        )}
                        <Button 
                          onClick={() => setShowChangeWalletPopup(true)}
                          className="w-full bg-[#F7931A]/20 hover:bg-[#F7931A]/30 text-white border border-[#F7931A]/50 flex items-center justify-center gap-2"
                        >
                          <Wallet className="w-4 h-4" />
                          Change Wallet
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Wallets Section - Only show if no BTC wallet has been added */}
            {wallets && !wallets.btc && (
              <>
                <MagicBadge title="Wallet Management" className="mt-24 mb-6"/>
                <AddWalletPopup 
                  isPopup={false}
                  onSuccess={() => {
                    fetchWallets();
                    refreshUser();
                  }}
                />
              </>
            )}

            {/* User Transactions */}
            <MagicBadge title="Transaction History" className="mt-24 mb-6"/>

            <UserTransactions />

          </div>
        </MaxWidthWrapper>

        <WithdrawPopup
          isOpen={showWithdrawPopup}
          onClose={() => setShowWithdrawPopup(false)}
          currentBalance={user.balance}
          onSuccess={refreshUser}
        />

        {/* Top-up Request Popup */}
        <TopupRequestPopup 
          isOpen={showTopupPopup}
          onClose={() => setShowTopupPopup(false)}
        />

        {/* Change Wallet Popup */}
        <ChangeWallet
          isOpen={showChangeWalletPopup}
          onClose={() => setShowChangeWalletPopup(false)}
          token={token || ''}
          onWalletsSaved={() => {
            fetchWallets();
            refreshUser();
          }}
        />

        {/* Withdraw Success Popup */}
        <WithdrawSuccessPopup
          isOpen={showWithdrawSuccess}
          onClose={() => {
            setShowWithdrawSuccess(false);
            setWithdrawSuccessData({});
          }}
          amount={withdrawSuccessData.amount}
          walletAddress={withdrawSuccessData.wallet}
        />

      </div>
    </>
  );
};

export default UserProfile;
