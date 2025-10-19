import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Wallet, 
  Trophy, 
  DollarSign, 
  Calendar, 
  Loader2, 
  ArrowLeft, 
  Save, 
  Edit2, 
  X, 
  Search, 
  Copy, 
  ExternalLink, 
  UserRoundSearch, 
  Coins, 
  BarChart3,
  Crown,
  Users,
  Zap,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';

interface NetworkRewards {
  [network: string]: {
    amount: number;
    isCustom: boolean;
    source: 'user' | 'global' | 'none';
  };
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  balance: number;
  tier: number;
  wallets?: any;
  walletBalances?: any;
  createdAt: string;
  customRewardsCount: number;
  totalRewardsCount: number;
}

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', icon: 'T', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', icon: '$', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', icon: 'B', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500' }
];

const TIER_NAMES: { [key: number]: string } = {
  1: 'Basic',
  2: 'Standard', 
  3: 'Professional',
  4: 'Enterprise',
  5: 'Premium'
};

const AdminUserRewards: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userRewards, setUserRewards] = useState<{ [level: number]: NetworkRewards }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRewards, setEditingRewards] = useState<NetworkRewards>({});
  const [editingCommission, setEditingCommission] = useState<number>(0);
  const [inputMode, setInputMode] = useState<'coins' | 'usd'>('coins');
  const [usdInputs, setUsdInputs] = useState<{ [key: string]: number }>({});
  const [conversionRates, setConversionRates] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    } else {
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      setLoading(false);
    }
  };

  const fetchUserRewards = async (userId: string) => {
    try {
      const response = await apiFetch(`/user-network-reward/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('User rewards response:', data);
        setUserRewards(data.data.rewards || {});
      } else {
        console.error('Failed to fetch user rewards:', data.message);
        setUserRewards({});
      }
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      setUserRewards({});
    }
  };

  const handleUserSelect = (user: UserData) => {
    setSelectedUser(user);
    setSelectedLevel(1);
    fetchUserRewards(user._id);
  };

  const fetchConversionRates = async () => {
    try {
      const response = await apiFetch('/conversion-rate');
      const data = await response.json();
      
      if (response.ok && data.success) {
        const ratesMap: { [key: string]: number } = {};
        data.data.rates.forEach((rate: any) => {
          ratesMap[rate.network] = rate.rateToUSD;
        });
        setConversionRates(ratesMap);
        console.log('[Admin] Conversion rates loaded:', ratesMap);
      }
    } catch (error) {
      console.error('[Admin] Error fetching conversion rates:', error);
      toast.error('Failed to load conversion rates');
    }
  };

  const openEditModal = async (level: number) => {
    setSelectedLevel(level);
    setEditingRewards(userRewards[level] || {});
    
    // Load commission from selected user
    if (selectedUser) {
      const commissionField = `lvl${level}Commission`;
      const commission = (selectedUser as any)[commissionField] || 0;
      setEditingCommission(commission);
    }
    
    // Fetch conversion rates
    await fetchConversionRates();
    
    // Reset to coins mode by default
    setInputMode('coins');
    setUsdInputs({});
    
    setShowEditModal(true);
  };

  const updateReward = (network: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingRewards(prev => ({
      ...prev,
      [network]: {
        amount: numValue,
        isCustom: numValue > 0,
        source: numValue > 0 ? 'user' : 'none'
      }
    }));
  };

  const updateUsdInput = (network: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setUsdInputs(prev => ({
      ...prev,
      [network]: numValue
    }));
  };

  const convertUsdToCrypto = () => {
    const converted: NetworkRewards = {};
    NETWORKS.forEach(network => {
      const usdAmount = usdInputs[network.key] || 0;
      const rate = conversionRates[network.key] || 1;
      const cryptoAmount = rate > 0 ? usdAmount / rate : 0;
      
      converted[network.key] = {
        amount: cryptoAmount,
        isCustom: cryptoAmount > 0,
        source: cryptoAmount > 0 ? 'user' : 'none'
      };
    });
    return converted;
  };

  const saveLevelRewards = async () => {
    if (!selectedUser) return;
    
    const levelKey = `level-${selectedLevel}`;
    setSaving(prev => ({ ...prev, [levelKey]: true }));

    try {
      // Convert to simple object for API
      const rewardsPayload: { [key: string]: number } = {};
      
      let rewardsToSave = editingRewards;
      
      if (inputMode === 'usd') {
        // Convert USD inputs to crypto amounts
        rewardsToSave = convertUsdToCrypto();
        console.log('[Admin] Converted USD inputs to crypto:', {
          usdInputs,
          conversionRates,
          converted: rewardsToSave
        });
      }
      
      // Convert to simple object for API
      Object.entries(rewardsToSave).forEach(([network, rewardData]) => {
        rewardsPayload[network] = rewardData.amount;
      });

      console.log('[Admin] Saving rewards payload:', {
        userId: selectedUser._id,
        level: selectedLevel,
        inputMode,
        rewardsPayload
      });

      // First, save rewards
      const response = await apiFetch(`/user-network-reward/user/${selectedUser._id}/level/${selectedLevel}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rewards: rewardsPayload
        })
      });

      const data = await response.json();
      
      console.log('[Admin] Rewards API response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        console.error('[Admin] Rewards API error:', data);
        throw new Error(data.message || 'Failed to update rewards');
      }

      // Then, save commission
      const commissionField = `lvl${selectedLevel}Commission`;
      const commissionResponse = await apiFetch(`/user/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [commissionField]: editingCommission
        })
      });

      const commissionData = await commissionResponse.json();

      if (response.ok && data.success && commissionResponse.ok && commissionData.success) {
        toast.success(`Level ${selectedLevel} rewards and commission updated for ${selectedUser.name}!`);
        setShowEditModal(false);
        fetchUserRewards(selectedUser._id); // Refresh data
      } else {
        console.error('Rewards response:', data);
        console.error('Commission response:', commissionData);
        toast.error(data.message || commissionData.message || 'Failed to update rewards or commission');
      }
    } catch (error) {
      console.error('Error updating rewards:', error);
      toast.error('An error occurred while updating rewards');
    } finally {
      setSaving(prev => ({ ...prev, [levelKey]: false }));
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || u.tier.toString() === filterTier;
    return matchesSearch && matchesTier;
  });

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-user-rewards" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  User <br /> <span className="text-transparent bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text">
                    Network Rewards
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Set custom network rewards for each user per level</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/admin')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back to Admin
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
                <Button onClick={() => navigate('/admin/user-network-rewards')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <User size={16} />
                  User Rewards
                </Button>
                <Button onClick={() => navigate('/admin/reward-analytics')} className="bg-indigo-600/50 hover:bg-indigo-700 text-white flex items-center gap-2 border border-indigo-600">
                  <BarChart3 size={16} />
                  Analytics
                </Button>
                <Button onClick={() => navigate('/admin/tier-management')} className="bg-yellow-600/50 hover:bg-yellow-700 text-white flex items-center gap-2 border border-yellow-600">
                  <Crown size={16} />
                  Tier Management
                </Button>
                <Button onClick={() => navigate('/admin/conversion-rates')} className="bg-emerald-600/50 hover:bg-emerald-700 text-white flex items-center gap-2 border border-emerald-600">
                  <DollarSign size={16} />
                  Conversion Rates
                </Button>
              </div>
            </div>

            <MagicBadge title="User Network Rewards Management" className="mb-6" />

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Users List */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-background/50 border-border focus:border-purple-500/50"
                  />
                  <Select value={filterTier} onValueChange={setFilterTier}>
                    <SelectTrigger className="w-32 bg-background/50 border-border focus:border-purple-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                      <SelectItem value="4">Tier 4</SelectItem>
                      <SelectItem value="5">Tier 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="w-full border border-border rounded-xl p-5 text-center text-muted-foreground">
                    <p>No users found.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
                    {filteredUsers.map(u => (
                      <Card
                        key={u._id}
                        className={`cursor-pointer border ${selectedUser?._id === u._id ? 'border-purple-500/50 bg-purple-500/5' : 'border-border hover:border-purple-500/30'} transition-colors`}
                        onClick={() => handleUserSelect(u)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground">Balance: ${u.balance?.toLocaleString() || 0}</p>
                          </div>
                          <Badge className={`${u.tier === 1 ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' : 
                                            u.tier === 2 ? 'bg-green-500/20 text-green-500 border-green-500/50' :
                                            u.tier === 3 ? 'bg-purple-500/20 text-purple-500 border-purple-500/50' :
                                            u.tier === 4 ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50' :
                                            u.tier === 5 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' :
                                            'bg-gray-500/20 text-gray-500 border-gray-500/50'}`}>
                            Tier {u.tier}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* User Rewards Details */}
              <div className="space-y-6">
                {selectedUser ? (
                  <Card className="border border-border rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-purple-400">
                        Network Rewards for {selectedUser.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Set custom network rewards for each level. Leave empty to use global defaults.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className="border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-semibold text-foreground">Level {level}</h4>
                            <Button
                              onClick={() => openEditModal(level)}
                              size="sm"
                              className="bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
                            >
                              <Edit2 size={14} />
                              Edit
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {NETWORKS.map(network => {
                              const reward = userRewards[level]?.[network.key];
                              return (
                                <div key={network.key} className="flex items-center justify-between p-2 bg-background/30 rounded border">
                                  <span className={`${network.color} font-medium`}>
                                    {network.icon} {network.name}
                                  </span>
                                  <span className="text-foreground">
                                    {reward?.amount || 0}
                                    {reward?.isCustom && <span className="text-purple-400 ml-1">*</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <User size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Select a user to view and edit their network rewards</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl border border-border">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-purple-400">
                      Edit Level {selectedLevel} Rewards for {selectedUser?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Info box about animation impact */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Zap className="text-blue-400 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm text-blue-400 font-medium mb-1">Animation Impact (USD Conversion)</p>
                          <p className="text-xs text-blue-300/80">
                            These rewards are converted to USD using current conversion rates and displayed in the user's level animation. 
                            Only fingerprint nodes with "Success" status receive rewards. 
                            Each network's total USD amount is randomly distributed among its Success fingerprints. 
                            Changes take effect the next time the user views the animation.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex items-center justify-center gap-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <Button
                        type="button"
                        onClick={() => setInputMode('coins')}
                        className={`flex items-center gap-2 ${
                          inputMode === 'coins' 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                            : 'bg-background/50 hover:bg-accent text-muted-foreground border-border'
                        }`}
                        variant="outline"
                      >
                        <Coins size={16} />
                        Input in Coins
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setInputMode('usd')}
                        className={`flex items-center gap-2 ${
                          inputMode === 'usd' 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                            : 'bg-background/50 hover:bg-accent text-muted-foreground border-border'
                        }`}
                        variant="outline"
                      >
                        <DollarSign size={16} />
                        Input in USD
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {NETWORKS.map(network => {
                        const rate = conversionRates[network.key] || 1;
                        const coinAmount = editingRewards[network.key]?.amount || 0;
                        const usdAmount = usdInputs[network.key] || 0;
                        
                        return (
                          <div key={network.key} className="space-y-2">
                            <Label htmlFor={`${network.key}-${selectedLevel}`} className={`text-sm font-medium ${network.color}`}>
                              {network.icon} {network.name}
                            </Label>
                            <Input
                              id={`${network.key}-${selectedLevel}`}
                              type="number"
                              step="any"
                              value={inputMode === 'coins' ? (coinAmount || '') : (usdAmount || '')}
                              onChange={(e) => inputMode === 'coins' ? updateReward(network.key, e.target.value) : updateUsdInput(network.key, e.target.value)}
                              className="bg-background/50 border-border focus:border-purple-500/50"
                              placeholder="0.00"
                            />
                            {inputMode === 'usd' && usdAmount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ≈ {(usdAmount / rate).toFixed(8)} {network.key}
                              </p>
                            )}
                            {inputMode === 'coins' && coinAmount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ≈ ${(coinAmount * rate).toFixed(2)} USD
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Commission Field */}
                    <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <DollarSign className="text-orange-400" size={16} />
                        <span className="text-orange-400">Commission Percentage (%)</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingCommission}
                        onChange={(e) => setEditingCommission(parseFloat(e.target.value) || 0)}
                        className="bg-background/50 border-border text-foreground"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-orange-300/80 mt-2">
                        Commission percentage of withdrawal amount for Level {selectedLevel} rewards (e.g., 10 = 10%)
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        onClick={() => setShowEditModal(false)}
                        variant="outline"
                        className="border-border"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveLevelRewards}
                        disabled={saving[`level-${selectedLevel}`]}
                        className="bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
                      >
                        {saving[`level-${selectedLevel}`] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminUserRewards;