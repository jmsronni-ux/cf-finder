import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
  Zap
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';
import { useConversionRates } from '../../hooks/useConversionRates';
import { convertUSDTToCrypto, convertCryptoToUSDT, formatCryptoAmount, formatUSDTAmount } from '../../utils/cryptoConversion';

interface NetworkRewards {
  [network: string]: number;
}

interface LevelRewards {
  [level: number]: NetworkRewards;
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

const AdminNetworkRewards: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { ratesMap, loading: ratesLoading } = useConversionRates();
  
  const [rewards, setRewards] = useState<LevelRewards>({});
  const [commissions, setCommissions] = useState<{ [level: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [summary, setSummary] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'crypto' | 'usdt'>('crypto');

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

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/network-reward/summary');
      const data = await response.json();

      if (response.ok && data.success) {
        setRewards(data.data.summary.byLevel || {});
        setSummary(data.data.summary);

        // Build commissions map from rawRewards (use first network's commission for each level)
        const raw: any[] = data.data.rawRewards || [];
        const levelToCommissions: { [level: number]: number } = {};
        raw.forEach((r: any) => {
          if (!levelToCommissions[r.level] && typeof r.commissionPercent === 'number') {
            levelToCommissions[r.level] = r.commissionPercent;
          }
        });
        setCommissions(levelToCommissions);
      } else {
        toast.error(data.message || 'Failed to fetch rewards');
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast.error('An error occurred while fetching rewards');
    } finally {
      setLoading(false);
    }
  };

  const saveLevelRewards = async (level: number) => {
    const levelKey = `level-${level}`;
    setSaving(prev => ({ ...prev, [levelKey]: true }));
    
    try {
      const levelRewards = rewards[level] || {};
      
      // Convert USDT to crypto if in USDT mode
      const rewardsToSave: NetworkRewards = {};
      Object.entries(levelRewards).forEach(([network, value]) => {
        if (inputMode === 'usdt') {
          // Convert USDT to crypto
          rewardsToSave[network] = convertUSDTToCrypto(value, network, ratesMap);
        } else {
          // Already in crypto mode
          rewardsToSave[network] = value;
        }
      });

      // Prepare commissions payload (one percentage per level, applied to all networks)
      const levelCommission = typeof commissions[level] === 'number' ? commissions[level] : 0;
      const commissionsToSave: { [network: string]: number } = {};
      NETWORKS.forEach(network => {
        commissionsToSave[network.key] = levelCommission;
      });
      
      console.log('[Global Network Rewards] Saving level rewards:', { level, rewardsToSave, commissionsToSave, inputMode });

      const response = await apiFetch(`/network-reward/level/${level}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ level, rewards: rewardsToSave, commissions: commissionsToSave })
      });

      const data = await response.json();
      
      console.log('[Global Network Rewards] API response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (response.ok && data.success) {
        toast.success(`Level ${level} rewards updated successfully!`);
        fetchRewards(); // Refresh data
      } else {
        console.error('[Global Network Rewards] Error response:', data);
        toast.error(data.message || 'Failed to update rewards');
      }
    } catch (error) {
      console.error('Error updating rewards:', error);
      toast.error('An error occurred while updating rewards');
    } finally {
      setSaving(prev => ({ ...prev, [levelKey]: false }));
    }
  };

  const updateReward = (level: number, network: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRewards(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [network]: numValue
      }
    }));
  };

  const updateCommission = (level: number, value: string) => {
    // Accept percent 0..100
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;
    setCommissions(prev => ({
      ...prev,
      [level]: numValue
    }));
  };

  const calculateTotalRewards = () => {
    let totalUSDT = 0;
    Object.values(rewards).forEach((levelRewards: NetworkRewards) => {
      Object.entries(levelRewards).forEach(([network, cryptoAmount]) => {
        // Convert crypto amount to USDT for proper summation
        const usdtValue = convertCryptoToUSDT(cryptoAmount, network, ratesMap);
        totalUSDT += usdtValue;
      });
    });
    return totalUSDT;
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  return (
    <>
      <div id="admin-network-rewards" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Network <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Rewards
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage reward amounts for each network per level</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border border-border rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rewards (USDT)</p>
                        <p className="text-2xl font-bold text-green-400">${calculateTotalRewards().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active Levels</p>
                        <p className="text-2xl font-bold text-blue-400">{Object.keys(rewards).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Coins className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Networks</p>
                        <p className="text-2xl font-bold text-purple-400">{NETWORKS.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Input Mode Toggle */}
            <Card className="border border-border rounded-xl mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Input Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose how you want to enter reward amounts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setInputMode('crypto')}
                      variant={inputMode === 'crypto' ? 'primary' : 'outline'}
                      className={`flex items-center gap-2 ${
                        inputMode === 'crypto'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      Crypto Mode
                    </Button>
                    <Button
                      onClick={() => setInputMode('usdt')}
                      variant={inputMode === 'usdt' ? 'primary' : 'outline'}
                      className={`flex items-center gap-2 ${
                        inputMode === 'usdt'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      USDT Mode
                    </Button>
                  </div>
                </div>
                {ratesLoading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-yellow-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading conversion rates...
                  </div>
                )}
              </CardContent>
            </Card>

            <MagicBadge title="Network Rewards by Level" className="mb-6"/>

            {/* Rewards by Level */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid gap-8">
                {[1, 2, 3, 4, 5].map(level => {
                  const levelKey = `level-${level}`;
                  const isSaving = saving[levelKey];
                  
                  return (
                    <Card key={level} className="border border-border rounded-xl">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                              <span className="font-bold text-white">{level}</span>
                            </div>
                            <div>
                              <h3 className="text-xl">Level {level} - {TIER_NAMES[level]}</h3>
                              <p className="text-sm text-muted-foreground">Set rewards for each network</p>
                            </div>
                          </CardTitle>
                          <Button
                            onClick={() => saveLevelRewards(level)}
                            disabled={isSaving}
                            className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {NETWORKS.map(network => {
                            const currentValue = rewards[level]?.[network.key] || 0;
                            const rate = ratesMap[network.key] || 0;
                            
                            // Calculate conversion preview
                            let conversionPreview = '';
                            if (rate > 0 && currentValue > 0) {
                              if (inputMode === 'usdt') {
                                const cryptoAmount = convertUSDTToCrypto(currentValue, network.key, ratesMap);
                                conversionPreview = `≈ ${formatCryptoAmount(cryptoAmount, network.key)} ${network.key}`;
                              } else {
                                const usdtAmount = convertCryptoToUSDT(currentValue, network.key, ratesMap);
                                conversionPreview = `≈ ${formatUSDTAmount(usdtAmount)} USDT`;
                              }
                            }
                            
                            return (
                              <div key={network.key} className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                  <span className={`text-lg ${network.color}`}>{network.icon}</span>
                                  <span>{network.name}</span>
                                  {inputMode === 'usdt' && <span className="text-xs text-muted-foreground">(USDT)</span>}
                                  {inputMode === 'crypto' && <span className="text-xs text-muted-foreground">({network.key})</span>}
                                </Label>
                                <Input
                                  type="number"
                                  step={inputMode === 'usdt' ? '1' : '0.00000001'}
                                  min="0"
                                  value={currentValue}
                                  onChange={(e) => updateReward(level, network.key, e.target.value)}
                                  className="bg-background/50 border-border text-foreground"
                                  placeholder="0.00"
                                />
                                {conversionPreview && (
                                  <p className="text-xs text-muted-foreground">
                                    {conversionPreview}
                                  </p>
                                )}
                                {rate === 0 && (
                                  <p className="text-xs text-yellow-500">Rate missing</p>
                                )}

                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Commission Input */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-muted-foreground">Commission for Level {level}:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={commissions[level] ?? 0}
                                onChange={(e) => updateCommission(level, e.target.value)}
                                className="w-20 bg-background/50 border-border text-foreground"
                                placeholder="0"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Level Summary */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Total for Level {level} (USDT):</span>
                            <span className="font-bold text-yellow-400">
                              ${(() => {
                                let total = 0;
                                Object.entries(rewards[level] || {}).forEach(([network, cryptoAmount]) => {
                                  total += convertCryptoToUSDT(cryptoAmount, network, ratesMap);
                                });
                                return total.toFixed(2);
                              })()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Instructions */}
            <Card className="border border-blue-500/50 rounded-xl mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <AlertCircle className="w-5 h-5" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Choose between <strong>Crypto Mode</strong> (enter amounts in cryptocurrency) or <strong>USDT Mode</strong> (enter amounts in USDT)</p>
                <p>• In USDT Mode: Enter amounts in USDT, they'll be converted to crypto automatically using current rates</p>
                <p>• In Crypto Mode: Enter amounts directly in cryptocurrency (e.g., 0.001 for BTC, 50 for USDT)</p>
                <p>• Conversion previews show what will be saved to the database</p>
                <p>• Click "Save Changes" for each level to update the rewards</p>
                <p>• All values are stored as cryptocurrency amounts in the database</p>
              </CardContent>
            </Card>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminNetworkRewards;
