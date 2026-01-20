import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import AdminNavigation from '../../components/AdminNavigation';
import { Tabs, TabsContent } from '../../components/ui/tabs';
import NetworkRewardsTab from '../../components/admin/NetworkRewardsTab';
import ConversionRatesTab from '../../components/admin/ConversionRatesTab';
import WalletSettingsTab from '../../components/admin/WalletSettingsTab';
import MagicBadge from '../../components/ui/magic-badge';
import { Coins, DollarSign, Wallet } from 'lucide-react';

const AdminGlobalSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'network-rewards' | 'conversion-rates' | 'wallet-settings'>('network-rewards');

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-global-settings" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Global <br /> <span className="text-transparent bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text">
                    Settings
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Configure global settings for all users</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Settings Menu" className="mb-6" />

            {/* Settings Tabs */}
            <div className="flex gap-2 border-b border-border pb-2 mb-6">
              <button
                onClick={() => setActiveTab('network-rewards')}
                className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'network-rewards'
                    ? 'bg-purple-500/20 text-purple-500 border-b-2 border-purple-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Coins className="w-4 h-4" />
                Network Rewards
              </button>
              <button
                onClick={() => setActiveTab('conversion-rates')}
                className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'conversion-rates'
                    ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Conversion Rates
              </button>
              <button
                onClick={() => setActiveTab('wallet-settings')}
                className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'wallet-settings'
                    ? 'bg-blue-500/20 text-blue-500 border-b-2 border-blue-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Wallet Settings
              </button>
            </div>

            {/* Tab Content */}
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="network-rewards">
                <NetworkRewardsTab />
              </TabsContent>

              <TabsContent value="conversion-rates">
                <ConversionRatesTab />
              </TabsContent>

              <TabsContent value="wallet-settings">
                <WalletSettingsTab />
              </TabsContent>
            </Tabs>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminGlobalSettings;
