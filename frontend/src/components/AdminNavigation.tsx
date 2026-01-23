import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Crown,
  Coins,
  Layers,
  ChevronRight,
  Home,
  Settings,
  ShieldCheck,
  FileText,
  Key,
  UserCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SHOW_ADDITIONAL_VERIFICATION_UI } from '../config/featureFlags';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      name: 'All Requests',
      path: '/admin/all-requests',
      icon: <FileText className="w-5 h-5" />,
      description: 'All user requests in one place',
      color: 'from-blue-500 to-purple-500'
    },
    {
      name: 'Verifications',
      path: '/admin/wallet-verifications',
      icon: <ShieldCheck className="w-5 h-5" />,
      description: 'Wallet & additional verifications',
      color: 'from-teal-500 to-teal-600'
    },
    {
      name: 'Level Management',
      path: '/admin/level-management',
      icon: <Layers className="w-5 h-5" />,
      description: 'Configure levels',
      color: 'from-cyan-500 to-cyan-600'
    }
  ];

  navItems.splice(2, 0, {
    name: 'Manage Users',
    path: '/admin/user-passwords',
    icon: <Key className="w-5 h-5" />,
    description: 'View passwords, login as users, and delete users',
    color: 'from-violet-500 to-fuchsia-500',
  });

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Filter out items if needed, but show all by default
  const visibleNavItems = navItems;

  return (
    <div className="w-full bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 mb-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <UserCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Admin'}</h2>
            <p className="text-sm text-gray-400">{user?.email || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/global-settings')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-white text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Global Settings</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-white text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>
        </div>
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
    </div>
  );
};

export default AdminNavigation;

