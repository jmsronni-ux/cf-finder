import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Crown, Users, Search, Edit3, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';

interface User {
  _id: string;
  name: string;
  email: string;
  tier: number;
  balance: number;
  completedLevels: number[];
  joinedAt: string;
}

interface TierManagementInfo {
  user: User;
  tierHistory: Array<{
    tier: number;
    name: string;
    changedAt: string;
    reason: string;
  }>;
  availableTiers: Array<{
    tier: number;
    name: string;
    description: string;
  }>;
}

const AdminTierManagement: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tierInfo, setTierInfo] = useState<TierManagementInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTier, setNewTier] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [showTierChangeModal, setShowTierChangeModal] = useState(false);

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    } else {
      fetchUsers();
    }
  }, [currentUser, navigate, token]);

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
        setUsers(data.data || []);
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

  const fetchUserTierInfo = async (userId: string) => {
    try {
      const response = await apiFetch(`/user/${userId}/tier-management`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTierInfo(data.data);
        setNewTier(data.data.user.tier);
        setReason('');
      } else {
        toast.error(data.message || 'Failed to fetch user tier info');
      }
    } catch (error) {
      console.error('Error fetching user tier info:', error);
      toast.error('An error occurred while fetching user tier info');
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    fetchUserTierInfo(user._id);
  };

  const handleTierChange = async () => {
    if (!selectedUser || newTier === selectedUser.tier) {
      toast.error('Please select a different tier');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the tier change');
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(`/user/${selectedUser._id}/tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newTier,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`User tier changed from ${selectedUser.tier} to ${newTier} successfully!`);
        setShowTierChangeModal(false);
        setReason('');
        
        // Refresh user data
        fetchUsers();
        if (selectedUser) {
          fetchUserTierInfo(selectedUser._id);
        }
      } else {
        toast.error(data.message || 'Failed to change user tier');
      }
    } catch (error) {
      console.error('Error changing user tier:', error);
      toast.error('An error occurred while changing user tier');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 0: return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
      case 1: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 2: return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 3: return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
      case 4: return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 5: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
    }
  };

  const getTierIcon = (tier: number) => {
    if (tier >= 4) return '👑';
    if (tier >= 2) return '⭐';
    return '🔹';
  };

  if (!currentUser?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-tier-management" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Admin <br /> <span className="text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text">
                    Tier Management
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Directly manage user tiers and permissions</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={() => navigate('/admin/topup-requests')} className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600">
                  <Users size={16} />
                  Top-Up Requests
                </Button>
                <Button onClick={() => navigate('/admin/withdraw-requests')} className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600">
                  <Users size={16} />
                  Withdraw Requests
                </Button>
                <Button onClick={() => navigate('/admin/tier-requests')} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <Crown size={16} />
                  Tier Requests
                </Button>
                <Button onClick={() => navigate('/admin/user-rewards')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <Users size={16} />
                  User Management
                </Button>
                <Button onClick={() => navigate('/admin/network-rewards')} className="bg-orange-600/50 hover:bg-orange-700 text-white flex items-center gap-2 border border-orange-600">
                  <Users size={16} />
                  Global Rewards
                </Button>
                <Button onClick={() => navigate('/admin/user-network-rewards')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <Users size={16} />
                  User Rewards
                </Button>
                <Button onClick={() => navigate('/admin/reward-analytics')} className="bg-indigo-600/50 hover:bg-indigo-700 text-white flex items-center gap-2 border border-indigo-600">
                  <Users size={16} />
                  Analytics
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Users List */}
              <div className="space-y-6">
                <MagicBadge title="All Users" className="mb-6" />
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50 border-border focus:border-yellow-500/50"
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
                    {filteredUsers.map((user) => (
                      <Card 
                        key={user._id} 
                        className={`cursor-pointer transition-all hover:border-yellow-500/50 ${
                          selectedUser?._id === user._id ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{getTierIcon(user.tier)}</div>
                              <div>
                                <h3 className="font-semibold text-foreground">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Balance: ${user.balance?.toLocaleString() || 0} | 
                                  Completed: {user.completedLevels?.length || 0}/5 levels
                                </p>
                              </div>
                            </div>
                            <Badge className={getTierBadgeColor(user.tier)}>
                              Tier {user.tier}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="space-y-6">
                {selectedUser && tierInfo ? (
                  <>
                    <MagicBadge title={`${selectedUser.name} - Tier Management`} className="mb-6" />
                    
                    <Card className="border border-border rounded-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-400">
                          <Crown size={20} />
                          Current Tier Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Current Tier:</p>
                            <Badge className={getTierBadgeColor(tierInfo.user.tier)}>
                              {getTierIcon(tierInfo.user.tier)} Tier {tierInfo.user.tier}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Balance:</p>
                            <p className="font-semibold text-foreground">${tierInfo.user.balance?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Completed Levels:</p>
                            <p className="font-semibold text-foreground">{tierInfo.user.completedLevels?.length || 0}/5</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Joined:</p>
                            <p className="font-semibold text-foreground">
                              {new Date(tierInfo.user.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                          <Button
                            onClick={() => setShowTierChangeModal(true)}
                            className="w-full bg-yellow-600/50 hover:bg-yellow-700 text-white flex items-center justify-center gap-2 border border-yellow-600"
                          >
                            <Edit3 size={16} />
                            Change User Tier
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Available Tiers */}
                    <Card className="border border-border rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-foreground">Available Tiers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {tierInfo.availableTiers.map((tier) => (
                            <div 
                              key={tier.tier} 
                              className={`p-3 rounded-lg border ${
                                tier.tier === tierInfo.user.tier 
                                  ? 'border-yellow-500/50 bg-yellow-500/5' 
                                  : 'border-border hover:border-yellow-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground">
                                    {getTierIcon(tier.tier)} {tier.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                                </div>
                                <Badge className={getTierBadgeColor(tier.tier)}>
                                  Tier {tier.tier}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-8 text-center">
                      <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Select a User</h3>
                      <p className="text-muted-foreground">Choose a user from the list to manage their tier</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Tier Change Modal */}
            {showTierChangeModal && selectedUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle size={20} />
                      Change User Tier
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">User: {selectedUser.name}</p>
                      <p className="text-sm text-muted-foreground mb-4">Current Tier: {selectedUser.tier}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        New Tier
                      </label>
                      <Select value={newTier.toString()} onValueChange={(value) => setNewTier(parseInt(value))}>
                        <SelectTrigger className="bg-background/50 border-border focus:border-yellow-500/50">
                          <SelectValue placeholder="Select new tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {tierInfo?.availableTiers.map((tier) => (
                            <SelectItem key={tier.tier} value={tier.tier.toString()}>
                              {getTierIcon(tier.tier)} {tier.name} (Tier {tier.tier})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Reason for Change
                      </label>
                      <Textarea
                        placeholder="Enter reason for tier change..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-background/50 border-border focus:border-yellow-500/50"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => {
                          setShowTierChangeModal(false);
                          setReason('');
                          setNewTier(selectedUser.tier);
                        }}
                        className="flex-1 bg-gray-600/50 hover:bg-gray-700 text-white border border-gray-600"
                      >
                        <X size={16} className="mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTierChange}
                        disabled={saving || newTier === selectedUser.tier || !reason.trim()}
                        className="flex-1 bg-yellow-600/50 hover:bg-yellow-700 text-white border border-yellow-600"
                      >
                        {saving ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Save size={16} className="mr-2" />
                        )}
                        {saving ? 'Changing...' : 'Change Tier'}
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

export default AdminTierManagement;
