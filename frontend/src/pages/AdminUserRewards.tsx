import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { User, Mail, Wallet, Trophy, DollarSign, Calendar, Loader2, ArrowLeft, Save, Edit2, X, Search, Copy, ExternalLink, UserRoundSearch, Coins } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';

interface WalletBalances {
  btc?: number;
  eth?: number;
  tron?: number;
  usdtErc20?: number;
}

interface Wallets {
  btc?: string;
  eth?: string;
  tron?: string;
  usdtErc20?: string;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  balance: number;
  tier: number;
  lvl1reward: number;
  lvl2reward: number;
  lvl3reward: number;
  lvl4reward: number;
  lvl5reward: number;
  lvl1anim: number;
  lvl2anim: number;
  lvl3anim: number;
  lvl4anim: number;
  lvl5anim: number;
  wallets?: Wallets;
  walletBalances?: WalletBalances;
  createdAt: string;
}

interface EditingState {
  [userId: string]: {
    lvl1reward: number;
    lvl2reward: number;
    lvl3reward: number;
    lvl4reward: number;
    lvl5reward: number;
  };
}


const AdminUserRewards: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingUsers, setEditingUsers] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<EditingState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'tier' | 'balance' | 'date'>('date');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/user/admin/rewards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (userData: UserData) => {
    setEditingUsers(prev => new Set(prev).add(userData._id));
    setEditValues(prev => ({
      ...prev,
      [userData._id]: {
        lvl1reward: userData.lvl1reward,
        lvl2reward: userData.lvl2reward,
        lvl3reward: userData.lvl3reward,
        lvl4reward: userData.lvl4reward,
        lvl5reward: userData.lvl5reward,
      }
    }));
  };

  const cancelEditing = (userId: string) => {
    setEditingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    setEditValues(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  };

  const handleRewardChange = (userId: string, level: keyof EditingState[string], value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditValues(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [level]: numValue
      }
    }));
  };

  const saveRewards = async (userId: string) => {
    setSavingId(userId);
    try {
      const response = await apiFetch(`/user/admin/rewards/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editValues[userId]),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Level rewards updated successfully!');
        fetchUsers();
        cancelEditing(userId);
      } else {
        toast.error(data.message || 'Failed to update rewards');
      }
    } catch (error) {
      console.error('Error updating rewards:', error);
      toast.error('An error occurred while updating rewards');
    } finally {
      setSavingId(null);
    }
  };


  // Filter and sort users based on search query
  const filteredUsers = users
    .filter((userData) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        userData.name.toLowerCase().includes(query) ||
        userData.email.toLowerCase().includes(query) ||
        userData._id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'tier':
          return b.tier - a.tier;
        case 'balance':
          return b.balance - a.balance;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
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

  return (
    <>
      <div id="admin-rewards" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  User <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Management
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Configure level rewards for each user</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={() => navigate('/admin/topup-requests')} className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600">
                  <DollarSign size={16} />
                  Top-Up Requests
                </Button>
                <Button onClick={() => navigate('/admin/withdraw-requests')} className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600">
                  <Wallet size={16} />
                  Withdraw Requests
                </Button>
                <Button onClick={() => navigate('/admin/tier-requests')} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <Trophy size={16} />
                  Tier Requests
                </Button>
                <Button onClick={() => navigate('/admin/user-rewards')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <UserRoundSearch size={16} />
                  User Management
                </Button>
                <Button onClick={() => navigate('/admin/network-rewards')} className="bg-orange-600/50 hover:bg-orange-700 text-white flex items-center gap-2 border border-orange-600">
                  <Coins size={16} />
                  Network Rewards
                </Button>
              </div>
            </div>

            <MagicBadge title="Search & Filter" className="mb-6"/>

            {/* Search and Filter Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or user ID..."
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

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-background/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="date">Sort by Date (Newest)</option>
                  <option value="name">Sort by Name (A-Z)</option>
                  <option value="email">Sort by Email (A-Z)</option>
                  <option value="tier">Sort by Tier (Highest)</option>
                  <option value="balance">Sort by Balance (Highest)</option>
                </select>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Users: <span className="text-foreground font-semibold">{users.length}</span>
                  </span>
                </div>
                {searchQuery && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Filtered: <span className="text-foreground font-semibold">{filteredUsers.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <MagicBadge title="User Management" className="mt-10 mb-6"/>

            {/* Users List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No users match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No users found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredUsers.map((userData) => {
                  const isEditing = editingUsers.has(userData._id);
                  const editData = editValues[userData._id];

                  return (
                    <Card key={userData._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                      <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* User Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{userData.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Mail size={14} />
                              {userData.email}
                            </div>
                          </div>
                        </div>
                        {!isEditing ? (
                          <Button
                            onClick={() => startEditing(userData)}
                            className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Rewards
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveRewards(userData._id)}
                              disabled={savingId === userData._id}
                              className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600"
                            >
                              {savingId === userData._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save
                            </Button>
                            <Button
                              onClick={() => cancelEditing(userData._id)}
                              disabled={savingId === userData._id}
                              className="bg-transparent text-white flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* User Stats */}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-400">Balance</p>
                            <p className="font-bold">${userData.balance}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-400">Tier Level</p>
                            <p className="font-bold">Tier {userData.tier}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-400">Joined</p>
                            <p className="font-bold text-sm">{new Date(userData.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Level Rewards */}
                      <div className="pt-3 border-t border-border">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Level Rewards
                        </h4>
                        <div className="grid grid-cols-5 gap-3">
                          {[1, 2, 3, 4, 5].map((level) => {
                            const rewardKey = `lvl${level}reward` as keyof UserData;
                            const animKey = `lvl${level}anim` as keyof UserData;
                            const isCompleted = userData[animKey] === 1;
                            const currentReward = userData[rewardKey] as number;
                            const editRewardKey = `lvl${level}reward` as keyof EditingState[string];

                            return (
                              <div key={level} className="relative">
                                <div className={`p-3 rounded-lg border-2 ${
                                  isCompleted 
                                    ? 'bg-green-500/10 border-green-500/50' 
                                    : 'bg-background/50 border-border'
                                }`}>
                                  <div className="flex items-center justify-between mb-1 h-full">
                                    <p className="text-xs font-medium text-muted-foreground">Level {level}</p>
                                    {isCompleted && (
                                      <Badge className="bg-green-500/20 text-green-500 text-xs px-1 py-0">
                                        ✓
                                      </Badge>
                                    )}
                                  </div>
                                  {isEditing ? (
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                      <Input
                                        type="number"
                                        value={editData?.[editRewardKey] || 0}
                                        onChange={(e) => handleRewardChange(userData._id, editRewardKey, e.target.value)}
                                        className="pl-6 bg-background/50 border-border text-foreground h-8 text-sm"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-lg font-bold text-green-400">
                                      ${currentReward.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>


                      {/* Wallets & Balances */}
                      {userData.wallets && (
                        <div className="pt-3 border-t border-border">
                          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            User Wallets & Balances
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Bitcoin Wallet */}
                            {userData.wallets.btc && (
                              <div className="p-4 rounded-lg border-2 bg-orange-500/5 border-orange-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                      <span className="text-orange-500 font-bold text-xs">₿</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400">Bitcoin</p>
                                      <p className="text-sm font-semibold text-orange-400">
                                        {userData.walletBalances?.btc !== undefined 
                                          ? `${userData.walletBalances.btc.toFixed(8)} BTC`
                                          : 'Loading...'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(userData.wallets?.btc || '');
                                      toast.success('Bitcoin address copied!');
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500 font-mono truncate flex-1">
                                    {userData.wallets.btc}
                                  </p>
                                  <a
                                    href={`https://www.blockchain.com/btc/address/${userData.wallets.btc}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-400 hover:text-orange-300"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Ethereum Wallet */}
                            {userData.wallets.eth && (
                              <div className="p-4 rounded-lg border-2 bg-blue-500/5 border-blue-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                      <span className="text-blue-400 font-bold text-xs">Ξ</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400">Ethereum</p>
                                      <p className="text-sm font-semibold text-blue-400">
                                        {userData.walletBalances?.eth !== undefined 
                                          ? `${userData.walletBalances.eth.toFixed(6)} ETH`
                                          : 'Loading...'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(userData.wallets?.eth || '');
                                      toast.success('Ethereum address copied!');
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500 font-mono truncate flex-1">
                                    {userData.wallets.eth}
                                  </p>
                                  <a
                                    href={`https://etherscan.io/address/${userData.wallets.eth}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Tron Wallet */}
                            {userData.wallets.tron && (
                              <div className="p-4 rounded-lg border-2 bg-red-500/5 border-red-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                      <span className="text-red-400 font-bold text-xs">T</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400">Tron</p>
                                      <p className="text-sm font-semibold text-red-400">
                                        {userData.walletBalances?.tron !== undefined 
                                          ? `${userData.walletBalances.tron.toFixed(6)} TRX`
                                          : 'Loading...'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(userData.wallets?.tron || '');
                                      toast.success('Tron address copied!');
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500 font-mono truncate flex-1">
                                    {userData.wallets.tron}
                                  </p>
                                  <a
                                    href={`https://tronscan.org/#/address/${userData.wallets.tron}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* USDT ERC-20 Wallet */}
                            {userData.wallets.usdtErc20 && (
                              <div className="p-4 rounded-lg border-2 bg-green-500/5 border-green-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                      <span className="text-green-400 font-bold text-xs">₮</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400">USDT (ERC-20)</p>
                                      <p className="text-sm font-semibold text-green-400">
                                        {userData.walletBalances?.usdtErc20 !== undefined 
                                          ? `${userData.walletBalances.usdtErc20.toFixed(2)} USDT`
                                          : 'Loading...'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(userData.wallets?.usdtErc20 || '');
                                      toast.success('USDT address copied!');
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500 font-mono truncate flex-1">
                                    {userData.wallets.usdtErc20}
                                  </p>
                                  <a
                                    href={`https://etherscan.io/address/${userData.wallets.usdtErc20}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                          {!userData.wallets.btc && !userData.wallets.eth && !userData.wallets.tron && !userData.wallets.usdtErc20 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No wallets added yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminUserRewards;
