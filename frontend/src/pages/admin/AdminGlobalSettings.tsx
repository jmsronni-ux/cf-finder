import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import AdminNavigation from '../../components/AdminNavigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import NetworkRewardsTab from '../../components/admin/NetworkRewardsTab';
import ConversionRatesTab from '../../components/admin/ConversionRatesTab';
import WalletSettingsTab from '../../components/admin/WalletSettingsTab';
import { Coins, DollarSign, Wallet } from 'lucide-react';

const AdminGlobalSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

            {/* Tabs */}
            <Tabs defaultValue="network-rewards" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 w-full mb-6 py-8">
                <TabsTrigger value="network-rewards" className="flex items-center gap-2 py-4 px-8">
                  <Coins className="w-4 h-4" />
                  Network Rewards
                </TabsTrigger>
                <TabsTrigger value="conversion-rates" className="flex items-center gap-2 py-4 px-8">
                  <DollarSign className="w-4 h-4" />
                  Conversion Rates
                </TabsTrigger>
                <TabsTrigger value="wallet-settings" className="flex items-center gap-2 py-4 px-8">
                  <Wallet className="w-4 h-4" />
                  Wallet Settings
                </TabsTrigger>
              </TabsList>

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
