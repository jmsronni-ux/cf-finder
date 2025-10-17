import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Coins, 
  ArrowLeft, 
  RefreshCw,
  Loader2,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';

interface RewardStats {
  totalUsers: number;
  usersWithCustomRewards: number;
  totalRewardValue: number;
  averageRewardPerUser: number;
  rewardDistribution: {
    [userType: string]: {
      count: number;
      totalValue: number;
      averageValue: number;
    };
  };
  networkBreakdown: {
    [network: string]: {
      totalValue: number;
      userCount: number;
    };
  };
}

const AdminRewardAnalytics: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

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

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/user-network-reward/users?level=${selectedLevel}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const users = data.data.users || [];
        
        // Calculate analytics
        const analytics: RewardStats = {
          totalUsers: users.length,
          usersWithCustomRewards: users.filter((u: any) => u.customRewardsCount > 0).length,
          totalRewardValue: 0,
          averageRewardPerUser: 0,
          rewardDistribution: {},
          networkBreakdown: {}
        };

        // Calculate reward distribution by user type
        users.forEach((user: any) => {
          const userType = getUserType(user);
          if (!analytics.rewardDistribution[userType]) {
            analytics.rewardDistribution[userType] = {
              count: 0,
              totalValue: 0,
              averageValue: 0
            };
          }
          analytics.rewardDistribution[userType].count++;
          analytics.rewardDistribution[userType].totalValue += user.balance || 0;
        });

        // Calculate averages
        Object.keys(analytics.rewardDistribution).forEach(type => {
          const dist = analytics.rewardDistribution[type];
          dist.averageValue = dist.count > 0 ? dist.totalValue / dist.count : 0;
        });

        // Calculate total reward value (sum of all user balances)
        analytics.totalRewardValue = users.reduce((sum: number, user: any) => sum + (user.balance || 0), 0);
        analytics.averageRewardPerUser = analytics.totalUsers > 0 ? analytics.totalRewardValue / analytics.totalUsers : 0;

        setStats(analytics);
      } else {
        toast.error(data.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('An error occurred while fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  const getUserType = (user: any) => {
    if (user.tier >= 5 || user.balance >= 10000) return 'VIP';
    if (user.tier >= 4 || user.balance >= 5000) return 'Premium';
    if (user.tier <= 1 || user.balance < 100) return 'Basic';
    return 'Standard';
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'VIP': return 'text-purple-500';
      case 'Premium': return 'text-blue-500';
      case 'Standard': return 'text-green-500';
      case 'Basic': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getUserTypeMultiplier = (type: string) => {
    switch (type) {
      case 'VIP': return '2x';
      case 'Premium': return '1.5x';
      case 'Standard': return '1x';
      case 'Basic': return '0.5x';
      default: return '1x';
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedLevel]);

  return (
    <>
      <div id="admin-reward-analytics" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Reward <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Analytics
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Track reward distributions and user engagement</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={fetchAnalytics} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-8">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-48 bg-background/50 border-border">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <MagicBadge title="Overview Statistics" className="mb-6"/>

            {/* Overview Stats */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Users</p>
                          <p className="text-2xl font-bold text-blue-400">{stats.totalUsers}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Target className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Custom Rewards</p>
                          <p className="text-2xl font-bold text-green-400">{stats.usersWithCustomRewards}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold text-purple-400">${stats.totalRewardValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Average/User</p>
                          <p className="text-2xl font-bold text-orange-400">${stats.averageRewardPerUser.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* User Type Distribution */}
                <Card className="border border-border rounded-xl mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      User Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Object.entries(stats.rewardDistribution).map(([type, data]) => (
                        <div key={type} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className={`${getUserTypeColor(type)} bg-transparent border`}>
                              {type} {getUserTypeMultiplier(type)}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Users:</span>
                              <span className="font-semibold">{data.count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Value:</span>
                              <span className="font-semibold">${data.totalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Average:</span>
                              <span className="font-semibold">${data.averageValue.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border border-border rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button 
                        onClick={() => navigate('/admin/user-network-rewards')}
                        className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Manage User Rewards
                      </Button>
                      <Button 
                        onClick={() => navigate('/admin/network-rewards')}
                        className="bg-orange-600/50 hover:bg-orange-700 text-white flex items-center gap-2"
                      >
                        <Coins className="w-4 h-4" />
                        Global Rewards
                      </Button>
                      <Button 
                        onClick={() => navigate('/admin/user-rewards')}
                        className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        User Management
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border border-border rounded-xl">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No analytics data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminRewardAnalytics;
