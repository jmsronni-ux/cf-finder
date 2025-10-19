import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  DollarSign, 
  Wallet, 
  Trophy, 
  Crown, 
  Coins, 
  User, 
  BarChart3, 
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  UserCheck,
  Shield,
  Zap
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';

interface AdminStats {
  totalUsers: number;
  totalRequests: number;
  pendingTopups: number;
  pendingWithdrawals: number;
  pendingTierRequests: number;
  totalRewards: number;
  activeUsers: number;
}

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    } else {
      fetchAdminStats();
    }
  }, [user, navigate]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users first to debug
      console.log('Fetching users...');
      const usersRes = await apiFetch('/user', { headers: { 'Authorization': `Bearer ${token}` } });
      console.log('Users response status:', usersRes.status);
      const usersData = await usersRes.json();
      console.log('Users data:', usersData);
      
      // Fetch other statistics
      const [topupRes, withdrawRes, tierRes] = await Promise.all([
        apiFetch('/topup-request/all', { headers: { 'Authorization': `Bearer ${token}` } }),
        apiFetch('/withdraw-request/all', { headers: { 'Authorization': `Bearer ${token}` } }),
        apiFetch('/tier-request/admin/all', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [topupData, withdrawData, tierData] = await Promise.all([
        topupRes.json(),
        withdrawRes.json(),
        tierRes.json()
      ]);

      const adminStats: AdminStats = {
        totalUsers: usersData.success && Array.isArray(usersData.data) ? usersData.data.length : 0,
        totalRequests: 0,
        pendingTopups: topupData.success && Array.isArray(topupData.data) ? topupData.data.filter((r: any) => r.status === 'pending').length : 0,
        pendingWithdrawals: withdrawData.success && Array.isArray(withdrawData.data) ? withdrawData.data.filter((r: any) => r.status === 'pending').length : 0,
        pendingTierRequests: tierData.success && Array.isArray(tierData.data) ? tierData.data.filter((r: any) => r.status === 'pending').length : 0,
        totalRewards: 0,
        activeUsers: usersData.success && Array.isArray(usersData.data) ? usersData.data.filter((u: any) => u.tier > 0).length : 0
      };

      adminStats.totalRequests = adminStats.pendingTopups + adminStats.pendingWithdrawals + adminStats.pendingTierRequests;
      setStats(adminStats);

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Manage user accounts, rewards, and permissions',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-600/50 hover:bg-purple-700 border-purple-600',
      route: '/admin/user-rewards',
      stats: `${stats?.totalUsers || 0} Users`
    },
    {
      title: 'Tier Management',
      description: 'Directly change any user\'s tier level',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-yellow-600/50 hover:bg-yellow-700 border-yellow-600',
      route: '/admin/tier-management',
      stats: `${stats?.activeUsers || 0} Active`
    },
    {
      title: 'Top-Up Requests',
      description: 'Process user balance top-up requests',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-600/50 hover:bg-green-700 border-green-600',
      route: '/admin/topup-requests',
      stats: `${stats?.pendingTopups || 0} Pending`
    },
    {
      title: 'Withdrawal Requests',
      description: 'Process user reward withdrawal requests',
      icon: <Wallet className="w-6 h-6" />,
      color: 'bg-red-600/50 hover:bg-red-700 border-red-600',
      route: '/admin/withdraw-requests',
      stats: `${stats?.pendingWithdrawals || 0} Pending`
    },
    {
      title: 'Tier Requests',
      description: 'Approve or reject tier upgrade requests',
      icon: <Trophy className="w-6 h-6" />,
      color: 'bg-blue-600/50 hover:bg-blue-700 border-blue-600',
      route: '/admin/tier-requests',
      stats: `${stats?.pendingTierRequests || 0} Pending`
    },
    {
      title: 'Level Management',
      description: 'Manage animation levels and data',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-gray-600/50 hover:bg-gray-700 border-gray-600',
      route: '/admin/level-management',
      stats: 'Animation Data'
    },
    {
      title: 'Conversion Rates',
      description: 'Manage cryptocurrency to USD conversion rates',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-emerald-600/50 hover:bg-emerald-700 border-emerald-600',
      route: '/admin/conversion-rates',
      stats: 'USD Rates'
    }
  ];

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-dashboard" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Admin <br /> <span className="text-transparent bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text">
                    Dashboard
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Complete control over your platform</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowRight size={16} />
                  Back to Profile
                </Button>
                <Button onClick={() => navigate('/dashboard')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <Zap size={16} />
                  User Dashboard
                </Button>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="System Overview" className="mb-6" />

            {/* Stats Overview */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border rounded-xl hover:border-green-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                        <p className="text-2xl font-bold text-foreground">{stats?.activeUsers || 0}</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border rounded-xl hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Requests</p>
                        <p className="text-2xl font-bold text-foreground">{stats?.totalRequests || 0}</p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border rounded-xl hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">System Status</p>
                        <p className="text-2xl font-bold text-green-500">Online</p>
                      </div>
                      <Shield className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <MagicBadge title="Admin Features" className="mb-6" />

            {/* Admin Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminFeatures.map((feature, index) => (
                <Card 
                  key={index} 
                  className="border border-border rounded-xl hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(feature.route)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${feature.color.replace('hover:bg-', 'bg-').replace('/50', '/20')} group-hover:scale-110 transition-transform`}>
                        {feature.icon}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {feature.stats}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-purple-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-sm text-purple-400 group-hover:text-purple-300 transition-colors">
                      <span>Access Feature</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-10">
              <MagicBadge title="Quick Actions" className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => navigate('/admin/tier-management')}
                  className="bg-yellow-600/50 hover:bg-yellow-700 text-white flex items-center gap-2 border border-yellow-600 h-16"
                >
                  <Crown size={20} />
                  <div className="text-left">
                    <div className="font-semibold">Change User Tier</div>
                    <div className="text-xs opacity-80">Direct tier control</div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => navigate('/admin/level-management')}
                  className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600 h-16"
                >
                  <Settings size={20} />
                  <div className="text-left">
                    <div className="font-semibold">Level Management</div>
                    <div className="text-xs opacity-80">View & download levels</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminDashboard;
