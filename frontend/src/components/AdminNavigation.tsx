import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Crown,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  UserCog,
  UserPlus,
  Layers,
  DollarSign,
  Network,
  ChevronRight,
  Home,
  Settings,
  ShieldCheck,
  FileText,
  Key
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SHOW_ADDITIONAL_VERIFICATION_UI } from '../config/featureFlags';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const AdminNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      name: 'User Rewards',
      path: '/admin',
      icon: <Users className="w-5 h-5" />,
      description: 'Manage user rewards',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Tier Management',
      path: '/admin/tier-management',
      icon: <Crown className="w-5 h-5" />,
      description: 'Configure tiers',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      name: 'Topup Requests',
      path: '/admin/topup-requests',
      icon: <ArrowDownToLine className="w-5 h-5" />,
      description: 'Pending top-ups',
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Withdraw Requests',
      path: '/admin/withdraw-requests',
      icon: <ArrowUpFromLine className="w-5 h-5" />,
      description: 'Pending withdrawals',
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'Tier Requests',
      path: '/admin/tier-requests',
      icon: <UserCog className="w-5 h-5" />,
      description: 'Tier upgrade requests',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      name: 'Registration Requests',
      path: '/admin/registration-requests',
      icon: <UserPlus className="w-5 h-5" />,
      description: 'New user registrations',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Wallet Verifications',
      path: '/admin/wallet-verifications',
      icon: <ShieldCheck className="w-5 h-5" />,
      description: 'Verify user wallets',
      color: 'from-teal-500 to-teal-600'
    },
    {
      name: 'Level Management',
      path: '/admin/level-management',
      icon: <Layers className="w-5 h-5" />,
      description: 'Configure levels',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      name: 'Conversion Rates',
      path: '/admin/conversion-rates',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Crypto conversion rates',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      name: 'Network Rewards',
      path: '/admin/network-rewards',
      icon: <Network className="w-5 h-5" />,
      description: 'Network reward settings',
      color: 'from-orange-500 to-orange-600'
    },
    {
      name: 'Global Settings',
      path: '/admin/global-settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'System-wide settings',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  if (SHOW_ADDITIONAL_VERIFICATION_UI) {
    navItems.splice(8, 0, {
      name: 'Additional Verification',
      path: '/admin/additional-verification',
      icon: <FileText className="w-5 h-5" />,
      description: 'Review documents & questionnaires',
      color: 'from-pink-500 to-pink-600'
    });
  }

  navItems.splice(2, 0, {
    name: 'Manage Users',
    path: '/admin/user-passwords',
    icon: <Key className="w-5 h-5" />,
    description: 'View passwords, login as users, and delete users',
    color: 'from-violet-500 to-fuchsia-500',
  });

  const isActive = (path: string) => {
    // Special handling for /admin (User Rewards) - match both /admin and /admin/user-rewards
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/user-rewards';
    }
    return location.pathname.startsWith(path);
  };

  // Filter out Level Management from navigation (hidden but not deleted)
  const visibleNavItems = navItems.filter(item =>
    !item.name.toLowerCase().includes('level management')
  );

  return (
    <div className="w-full bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 mb-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="text-sm text-gray-400">System Management</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-white text-sm"
        >
          <Home className="w-4 h-4" />
          <span>Back to Profile</span>
        </button>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "group relative overflow-hidden rounded-xl p-4 transition-all duration-300",
                "border backdrop-blur-sm",
                active
                  ? "bg-gradient-to-br border-white/20 shadow-lg scale-[1.02]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
              )}
              style={active ? { backgroundImage: `linear-gradient(135deg, ${item.color.split(' ')[0].replace('from-', 'var(--color-')}20, ${item.color.split(' ')[1].replace('to-', 'var(--color-')}20)` } : {}}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              )}

              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  active
                    ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                    : "bg-white/10 text-gray-400 group-hover:bg-white/20"
                )}>
                  {item.icon}
                </div>

                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-semibold text-sm transition-colors",
                      active ? "text-white" : "text-gray-300 group-hover:text-white"
                    )}>
                      {item.name}
                    </h3>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-all",
                      active
                        ? "text-white translate-x-0 opacity-100"
                        : "text-gray-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    )} />
                  </div>
                  <p className={cn(
                    "text-xs mt-1 transition-colors",
                    active ? "text-gray-300" : "text-gray-500 group-hover:text-gray-400"
                  )}>
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bottom shine effect for active item */}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Stats Bar (Optional) */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Navigate between admin sections quickly</span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
            Admin Access
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminNavigation;

