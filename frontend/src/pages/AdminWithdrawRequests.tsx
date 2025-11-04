import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { CheckCircle, XCircle, DollarSign, User, Mail, Wallet, Trophy, Calendar, Loader2, ArrowLeft, Search, X, UserRoundSearch, Coins } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';

interface WithdrawRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
    phone?: string;
  };
  amount: number;
  walletAddress: string;
  confirmedWallet?: string;
  confirmedAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  notes?: string;
  // Network-specific withdrawal details
  networks?: string[];
  networkRewards?: { [network: string]: number };
  withdrawAll?: boolean;
  commissionPaid?: number;
  isDirectBalanceWithdraw?: boolean;
  addToBalance?: boolean;
  networkRewardsAddedToBalance?: number;
}

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', icon: 'T', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', icon: '$', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', icon: 'B', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500' }
];

const AdminWithdrawRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<WithdrawRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmedWallet, setConfirmedWallet] = useState<{ [key: string]: string }>({});
  const [confirmedAmount, setConfirmedAmount] = useState<{ [key: string]: string }>({});
  const [globalWalletAddress, setGlobalWalletAddress] = useState<string>('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Fetch global settings to pre-fill wallet address
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const response = await apiFetch('/global-settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        
        if (response.ok && data.success && data.data.topupWalletAddress) {
          setGlobalWalletAddress(data.data.topupWalletAddress);
        }
      } catch (error) {
        console.error('[Admin Panel] Error fetching global settings:', error);
      }
    };
    
    fetchGlobalSettings();
  }, []);

  // Initialize pending requests with global wallet address if not manually set
  useEffect(() => {
    if (globalWalletAddress && requests.length > 0) {
      setConfirmedWallet(prev => {
        const updated = { ...prev };
        requests.forEach(request => {
          if (request.status === 'pending' && !updated[request._id]) {
            updated[request._id] = globalWalletAddress;
          }
        });
        return updated;
      });
    }
  }, [globalWalletAddress, requests]);

  // Debug: Also fetch all requests on component mount to see if any exist
  useEffect(() => {
    const debugFetchAll = async () => {
      try {
        const response = await apiFetch('/withdraw-request/all', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log('[Admin Panel] Debug - All requests:', data);
      } catch (error) {
        console.error('[Admin Panel] Debug - Error fetching all requests:', error);
      }
    };
    
    if (token) {
      debugFetchAll();
    }
  }, [token]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all' 
        ? '/withdraw-request/all' 
        : `/withdraw-request/all?status=${filter}`;
      
      console.log('[Admin Panel] Fetching requests from:', url);
      
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('[Admin Panel] Response:', { status: response.status, data });

      if (response.ok && data.success) {
        console.log('[Admin Panel] Setting requests:', data.data.length, 'requests');
        setRequests(data.data);
      } else {
        console.error('[Admin Panel] API Error:', data);
        toast.error(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('[Admin Panel] Error fetching requests:', error);
      toast.error('An error occurred while fetching requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const wallet = confirmedWallet[requestId] || globalWalletAddress;
    const amount = confirmedAmount[requestId];

    if (!wallet || !wallet.trim()) {
      toast.error('Please enter the confirmed wallet address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid confirmed amount');
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/withdraw-request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmedWallet: wallet.trim(),
          confirmedAmount: parseFloat(amount)
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Withdrawal request approved successfully!');
        // Clear inputs for this request
        setConfirmedWallet(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
        setConfirmedAmount(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
        fetchRequests(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('An error occurred while approving the request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = prompt('Enter rejection reason (optional):');
    
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/withdraw-request/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Withdrawal request rejected');
        fetchRequests(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('An error occurred while rejecting the request');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter requests based on search query
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      request.userId.name.toLowerCase().includes(query) ||
      request.userId.email.toLowerCase().includes(query) ||
      request.walletAddress.toLowerCase().includes(query) ||
      request._id.toLowerCase().includes(query)
    );
  });

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center">
        <Card className="border-red-500/50 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page. Admin privileges required.</p>
            <Button onClick={() => navigate('/profile')} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div id="admin-withdraw" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Withdrawal <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Management
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and process user withdrawal requests</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Filter & Search" className="mb-6"/>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-border pb-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-500/20 text-blue-500 border-b-2 border-blue-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'pending' 
                    ? 'bg-yellow-500/20 text-yellow-500 border-b-2 border-yellow-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'approved' 
                    ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'rejected' 
                    ? 'bg-red-500/20 text-red-500 border-b-2 border-red-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rejected
              </button>
            </div>

            {/* Search Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, wallet address, or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Requests: <span className="text-foreground font-semibold">{requests.length}</span>
                  </span>
                </div>
                {searchQuery && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Filtered: <span className="text-foreground font-semibold">{filteredRequests.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <MagicBadge title="Requests" className="mt-10 mb-6"/>

            {/* Requests List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No requests match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredRequests.map((request) => (
                  <Card key={request._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                    <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-transparent border border-border flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{request.userId.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Mail size={14} />
                              {request.userId.email}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* User Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-xs text-gray-400">Withdraw Amount</p>
                            <p className="font-bold text-red-400">${request.amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-400">Current Balance</p>
                            <p className="font-bold">${request.userId.balance}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-400">Tier Level</p>
                            <p className="font-bold">Tier {request.userId.tier}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-400">Requested</p>
                            <p className="font-bold text-sm">{new Date(request.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Withdrawal Type */}
                      {request.isDirectBalanceWithdraw && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-blue-400" />
                            <p className="text-sm font-medium text-blue-400">Direct Balance Withdrawal</p>
                          </div>
                          <p className="text-xs text-gray-400">User wants to withdraw directly from their balance (no commission)</p>
                        </div>
                      )}

                      {request.addToBalance && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-4 h-4 text-purple-400" />
                            <p className="text-sm font-medium text-purple-400">Network Rewards to Balance</p>
                          </div>
                          <p className="text-xs text-gray-400">Network rewards will be added to user's balance after commission payment</p>
                          {request.networkRewardsAddedToBalance && request.networkRewardsAddedToBalance > 0 && (
                            <p className="text-sm text-purple-300 mt-1">
                              Amount added to balance: ${request.networkRewardsAddedToBalance.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Wallet Address - only show if not addToBalance */}
                      {!request.addToBalance && request.walletAddress && (
                        <div className="bg-background/50 border border-border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Wallet Address:</p>
                          <p className="text-sm font-mono text-foreground break-all">{request.walletAddress}</p>
                        </div>
                      )}

                      {/* Network Information */}
                      {(request.networks && request.networks.length > 0) || request.withdrawAll ? (
                        <div className="bg-background/50 border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Coins className="w-4 h-4 text-purple-400" />
                            <p className="text-xs text-muted-foreground font-medium">Network Withdrawal Details:</p>
                          </div>
                          
                          {request.withdrawAll ? (
                            <div className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                              <Coins className="w-4 h-4 text-purple-400" />
                              <span className="text-sm text-purple-400 font-medium">Withdraw All Networks</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {request.networks?.map(networkKey => {
                                const network = NETWORKS.find(n => n.key === networkKey);
                                const amount = request.networkRewards?.[networkKey] || 0;
                                
                                if (!network || amount === 0) return null;
                                
                                return (
                                  <div key={networkKey} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm ${network.color}`}>{network.icon}</span>
                                      <span className="text-xs text-gray-300">{network.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-white">
                                      {amount.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {request.networkRewards && Object.keys(request.networkRewards).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs text-gray-400 mb-2">Network Rewards Breakdown:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(request.networkRewards).map(([networkKey, amount]) => {
                                  const network = NETWORKS.find(n => n.key === networkKey);
                                  if (!network || amount === 0) return null;
                                  
                                  return (
                                    <div key={networkKey} className="flex items-center justify-between bg-black/20 rounded p-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs ${network.color}`}>{network.icon}</span>
                                        <span className="text-xs text-gray-300">{network.name}</span>
                                      </div>
                                      <span className="text-xs font-semibold text-white">
                                        {amount.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Commission Information */}
                      {request.commissionPaid && request.commissionPaid > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-orange-400" />
                            <p className="text-sm font-medium text-orange-400">Commission Paid</p>
                          </div>
                          <p className="text-lg font-bold text-orange-300">${request.commissionPaid.toLocaleString()}</p>
                          <p className="text-xs text-gray-400 mt-1">Commission deducted from user's balance</p>
                        </div>
                      )}

                      {request.processedAt && (
                        <div className="text-xs text-gray-500 pt-2">
                          Processed on {new Date(request.processedAt).toLocaleString()}
                          {request.processedBy && ` by ${request.processedBy.name}`}
                        </div>
                      )}

                      {/* Admin's Confirmed Payment Instructions (for approved requests) */}
                      {request.status === 'approved' && (request.confirmedWallet || request.confirmedAmount) && (
                        <div className="mt-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-green-400 mb-3">✅ Admin Payment Instructions Provided</h4>
                          <div className="space-y-2">
                            {request.confirmedWallet && (
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Admin's Receiving Wallet:</label>
                                <p className="text-sm font-mono text-green-300 bg-green-500/10 p-2 rounded border border-green-500/20 break-all">
                                  {request.confirmedWallet}
                                </p>
                              </div>
                            )}
                            {request.confirmedAmount && (
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Amount User Should Send:</label>
                                <p className="text-lg font-bold text-green-400">
                                  ${request.confirmedAmount}
                                </p>
                              </div>
                            )}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mt-2">
                              <p className="text-xs text-blue-300">
                                📋 User requested: ${request.amount} from wallet {request.walletAddress.substring(0, 15)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {request.notes && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                          <p className="text-sm text-red-400"><strong>Note:</strong> {request.notes}</p>
                        </div>
                      )}

                      {/* Admin Provides Payment Instructions (for pending requests) */}
                      {request.status === 'pending' && (
                        <div className="mt-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-3">
                          <h4 className="text-sm font-semibold text-purple-400 mb-2">📝 Provide Payment Instructions to User</h4>
                          <p className="text-xs text-gray-400 mb-3">Enter YOUR wallet address and amount that user should send TO</p>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Your Receiving Wallet Address *</label>
                              <Input
                                type="text"
                                placeholder="Your wallet where user will send funds"
                                value={confirmedWallet[request._id] || globalWalletAddress || ''}
                                onChange={(e) => setConfirmedWallet(prev => ({ ...prev, [request._id]: e.target.value }))}
                                className="bg-background/50 border-border text-foreground"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Amount User Should Send (USD) *</label>
                              <Input
                                type="number"
                                placeholder="Amount user should transfer"
                                value={confirmedAmount[request._id] || ''}
                                onChange={(e) => setConfirmedAmount(prev => ({ ...prev, [request._id]: e.target.value }))}
                                className="bg-background/50 border-border text-foreground"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                              <p className="text-xs text-blue-300">
                                📋 User requested: ${request.amount} from wallet {request.walletAddress.substring(0, 15)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show payment instructions for processed requests */}
                      {request.status !== 'pending' && request.confirmedWallet && (
                        <div className="mt-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2">
                          <h4 className="text-sm font-semibold text-green-400">Payment Instructions Sent to User</h4>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300">
                              <span className="text-gray-500">Receiving Wallet:</span> <span className="font-mono">{request.confirmedWallet}</span>
                            </p>
                            <p className="text-gray-300">
                              <span className="text-gray-500">Amount to Send:</span> <span className="font-bold text-green-400">${request.confirmedAmount}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(request._id)}
                          disabled={processingId === request._id}
                          className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600"
                        >
                          {processingId === request._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request._id)}
                          disabled={processingId === request._id}
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminWithdrawRequests;
