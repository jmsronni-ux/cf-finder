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
  Save, 
  RefreshCw, 
  ArrowLeft, 
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  Coins,
  Zap,
  Users,
  User,
  Search,
  Filter,
  Edit,
  Trash2,
  PlusCircle,
  Eye
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
  tier: number;
  balance: number;
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

const AdminUserNetworkRewards: React.FC = () => {
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/user-network-reward/users');
      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data.users || []);
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
      const response = await apiFetch(`/user-network-reward/user/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setUserRewards(data.data.rewards || {});
      } else {
        toast.error(data.message || 'Failed to fetch user rewards');
      }
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      toast.error('An error occurred while fetching user rewards');
    }
  };

  const saveLevelRewards = async (userId: string, level: number) => {
    const levelKey = `level-${level}`;
    setSaving(prev => ({ ...prev, [levelKey]: true }));
    
    try {
      const levelRewards = editingRewards;
      console.log('Saving level rewards:', { userId, level, levelRewards });
      
      // Convert to simple object for API
      const rewardsPayload: { [key: string]: number } = {};
      Object.entries(levelRewards).forEach(([network, rewardData]) => {
        rewardsPayload[network] = rewardData.amount;
      });
      
      console.log('Rewards payload:', rewardsPayload);
      
      const response = await apiFetch(`/user-network-reward/user/${userId}/level/${level}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rewards: rewardsPayload
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        toast.success(`Level ${level} rewards updated for ${selectedUser?.name}!`);
        fetchUserRewards(userId);
        setShowEditModal(false);
      } else {
        console.error('API Error:', data);
        toast.error(data.message || 'Failed to update rewards');
      }
    } catch (error) {
      console.error('Error updating rewards:', error);
      toast.error('An error occurred while updating rewards');
    } finally {
      setSaving(prev => ({ ...prev, [levelKey]: false }));
    }
  };

  const deleteUserReward = async (userId: string, level: number, network: string) => {
    if (!window.confirm(`Are you sure you want to delete the custom ${network} reward for Level ${level}?`)) {
      return;
    }
    
    try {
      const response = await apiFetch(`/user-network-reward/user/${userId}/level/${level}/network/${network}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Custom ${network} reward deleted for Level ${level}`);
        fetchUserRewards(userId);
      } else {
        toast.error(data.message || 'Failed to delete reward');
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('An error occurred while deleting reward');
    }
  };

  const openEditModal = (level: number) => {
    setSelectedLevel(level);
    setEditingRewards(userRewards[level] || {});
    setShowEditModal(true);
  };

  const updateEditingReward = (network: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingRewards(prev => ({
      ...prev,
      [network]: {
        amount: numValue,
        isCustom: true,
        source: 'user'
      }
    }));
  };

  const getUserType = (user: UserData) => {
    if (user.tier >= 5 || user.balance >= 10000) return { type: 'VIP', color: 'text-purple-500', multiplier: '2x' };
    if (user.tier >= 4 || user.balance >= 5000) return { type: 'Premium', color: 'text-blue-500', multiplier: '1.5x' };
    if (user.tier <= 1 || user.balance < 100) return { type: 'Basic', color: 'text-orange-500', multiplier: '0.5x' };
    return { type: 'Standard', color: 'text-green-500', multiplier: '1x' };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || user.tier.toString() === filterTier;
    return matchesSearch && matchesTier;
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserRewards(selectedUser._id);
    }
  }, [selectedUser]);

  return (
    <>
      <div id="admin-user-network-rewards" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  User <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Network Rewards
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage individual user network rewards</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={fetchUsers} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Users List */}
              <div className="lg:col-span-1">
                <Card className="border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users size={20} />
                      Users ({filteredUsers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filter */}
                    <div className="space-y-4 mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-background/50 border-border"
                        />
                      </div>
                      <Select value={filterTier} onValueChange={setFilterTier}>
                        <SelectTrigger className="bg-background/50 border-border">
                          <SelectValue placeholder="Filter by tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tiers</SelectItem>
                          <SelectItem value="1">Basic (1)</SelectItem>
                          <SelectItem value="2">Standard (2)</SelectItem>
                          <SelectItem value="3">Professional (3)</SelectItem>
                          <SelectItem value="4">Enterprise (4)</SelectItem>
                          <SelectItem value="5">Premium (5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Users List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredUsers.map((user) => {
                        const userType = getUserType(user);
                        return (
                          <div
                            key={user._id}
                            onClick={() => setSelectedUser(user)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUser?._id === user._id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-border/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              <div className="text-right">
                                <Badge className={`${userType.color} bg-transparent border`}>
                                  {userType.type} {userType.multiplier}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {user.customRewardsCount} custom
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Rewards */}
              <div className="lg:col-span-2">
                {selectedUser ? (
                  <Card className="border border-border rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User size={20} />
                        {selectedUser.name} - Network Rewards
                        <Badge className="ml-auto">
                          {getUserType(selectedUser).type} {getUserType(selectedUser).multiplier}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        {[1, 2, 3, 4, 5].map(level => {
                          const levelRewards = userRewards[level] || {};
                          const hasCustomRewards = Object.values(levelRewards).some(r => r.isCustom);
                          
                          return (
                            <div key={level} className="border border-border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                  Level {level} - {TIER_NAMES[level]}
                                </h3>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => openEditModal(level)}
                                    className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2"
                                    size="sm"
                                  >
                                    <Edit size={16} />
                                    Edit
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {NETWORKS.map(network => {
                                  const reward = levelRewards[network.key];
                                  const amount = reward?.amount || 0;
                                  const isCustom = reward?.isCustom || false;
                                  const source = reward?.source || 'none';
                                  
                                  return (
                                    <div key={network.key} className="space-y-2">
                                      <Label className="flex items-center gap-2 text-sm font-medium">
                                        <span className={`text-lg ${network.color}`}>{network.icon}</span>
                                        {network.name}
                                        {isCustom && <Badge className="bg-green-500/20 text-green-500 border border-green-500/50 text-xs">Custom</Badge>}
                                      </Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={amount}
                                          readOnly
                                          className="bg-background/50 border-border text-foreground"
                                          placeholder="0.00"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          {source === 'user' ? 'Custom' : source === 'global' ? 'Global' : 'None'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-12 text-center">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a user to view and edit their network rewards</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="border border-border rounded-xl max-w-2xl w-full mx-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit size={20} />
                      Edit Level {selectedLevel} Rewards - {selectedUser.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {NETWORKS.map(network => (
                        <div key={network.key} className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <span className={`text-lg ${network.color}`}>{network.icon}</span>
                            {network.name}
                          </Label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={editingRewards[network.key]?.amount || 0}
                            onChange={(e) => updateEditingReward(network.key, e.target.value)}
                            className="bg-background/50 border-border text-foreground"
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowEditModal(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('Save button clicked', { selectedUser: selectedUser?._id, selectedLevel });
                          saveLevelRewards(selectedUser._id, selectedLevel);
                        }}
                        disabled={saving[`level-${selectedLevel}`]}
                        className="bg-green-600/50 hover:bg-green-700 text-white"
                      >
                        {saving[`level-${selectedLevel}`] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Changes
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

export default AdminUserNetworkRewards;
