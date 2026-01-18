import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Trophy, Save, DollarSign, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConversionRates } from '../../hooks/useConversionRates';
import { convertUSDTToCrypto, convertCryptoToUSDT, formatCryptoAmount, formatUSDTAmount } from '../../utils/cryptoConversion';

interface NetworkRewards {
  [network: string]: {
    amount: number;
    isCustom: boolean;
    source: 'user' | 'global' | 'none';
  };
}

interface UserRewardsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', logo: '/assets/crypto-logos/tron-trx-logo.svg', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', logo: '/assets/crypto-logos/tether-usdt-logo.svg', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', logo: '/assets/crypto-logos/bnb-bnb-logo.svg', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', logo: '/assets/crypto-logos/solana-sol-logo.svg', color: 'text-purple-500' }
];

const UserRewardsPopup: React.FC<UserRewardsPopupProps> = ({ isOpen, onClose, userId, userName }) => {
  const { token } = useAuth();
  const { ratesMap, loading: ratesLoading } = useConversionRates();
  
  const [userRewards, setUserRewards] = useState<{ [level: number]: NetworkRewards }>({});
  const [userCommissions, setUserCommissions] = useState<{ [level: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [editingRewards, setEditingRewards] = useState<{ [level: number]: NetworkRewards }>({});
  const [editingCommissions, setEditingCommissions] = useState<{ [level: number]: number }>({});
  const [inputMode, setInputMode] = useState<'crypto' | 'usdt'>('crypto');
  const [saving, setSaving] = useState<{ [level: number]: boolean }>({});
  const [previousInputMode, setPreviousInputMode] = useState<'crypto' | 'usdt'>('crypto');
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  // Fetch user rewards when popup opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserRewards();
      fetchUserCommissions();
    }
  }, [isOpen, userId]);

  // Initialize editing state when level changes or rewards are loaded
  useEffect(() => {
    if (userRewards[selectedLevel] !== undefined) {
      const currentRewards = userRewards[selectedLevel] || {};
      const initializedRewards: NetworkRewards = {};
      const initializedInputValues: { [key: string]: string } = {};
      
      NETWORKS.forEach(network => {
        const inputKey = `${selectedLevel}-${network.key}`;
        if (currentRewards[network.key]) {
          initializedRewards[network.key] = currentRewards[network.key];
          const amount = currentRewards[network.key].amount || 0;
          initializedInputValues[inputKey] = amount > 0 ? amount.toString() : '';
        } else {
          initializedRewards[network.key] = {
            amount: 0,
            isCustom: false,
            source: 'none'
          };
          initializedInputValues[inputKey] = '';
        }
      });
      
      setEditingRewards(prev => ({
        ...prev,
        [selectedLevel]: initializedRewards
      }));
      setEditingCommissions(prev => ({
        ...prev,
        [selectedLevel]: userCommissions[selectedLevel] || 0
      }));
      setInputValues(prev => ({ ...prev, ...initializedInputValues }));
    }
  }, [selectedLevel, userRewards, userCommissions]);

  // Convert values when input mode changes
  useEffect(() => {
    if (previousInputMode === inputMode || Object.keys(editingRewards).length === 0 || Object.keys(ratesMap).length === 0 || ratesLoading) {
      if (previousInputMode !== inputMode) {
        setPreviousInputMode(inputMode);
      }
      return;
    }

    // Convert all reward values based on mode switch
    const convertedRewards: { [level: number]: NetworkRewards } = {};
    const convertedInputValues: { [key: string]: string } = {};
    
    Object.entries(editingRewards).forEach(([levelStr, levelRewards]) => {
      const level = parseInt(levelStr);
      convertedRewards[level] = {};
      
      Object.entries(levelRewards).forEach(([network, rewardData]) => {
        const value = rewardData?.amount || 0;
        const inputKey = `${level}-${network}`;
        
        if (value > 0) {
          let convertedAmount = value;
          
          if (previousInputMode === 'crypto' && inputMode === 'usdt') {
            // Converting from crypto to USDT
            convertedAmount = convertCryptoToUSDT(value, network, ratesMap);
          } else if (previousInputMode === 'usdt' && inputMode === 'crypto') {
            // Converting from USDT to crypto
            convertedAmount = convertUSDTToCrypto(value, network, ratesMap);
          }
          
          convertedRewards[level][network] = {
            amount: convertedAmount,
            isCustom: rewardData.isCustom,
            source: rewardData.source
          };
          convertedInputValues[inputKey] = convertedAmount > 0 ? convertedAmount.toString() : '';
        } else {
          convertedRewards[level][network] = rewardData;
          convertedInputValues[inputKey] = '';
        }
      });
    });

    setEditingRewards(convertedRewards);
    setInputValues(prev => ({ ...prev, ...convertedInputValues }));
    setPreviousInputMode(inputMode);
  }, [inputMode, ratesMap, ratesLoading]);

  const fetchUserRewards = async () => {
    if (!token || !userId) return;
    
    setLoading(true);
    try {
      const allLevels = [1, 2, 3, 4, 5];
      const rewardsData: { [level: number]: NetworkRewards } = {};
      
      for (const level of allLevels) {
        const response = await apiFetch(`/user-network-reward/user/${userId}/level/${level}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          const levelRewards: NetworkRewards = {};
          Object.entries(data.data.rewards || {}).forEach(([network, reward]: [string, any]) => {
            levelRewards[network] = {
              amount: reward.amount || 0,
              isCustom: reward.isCustom || false,
              source: reward.source || 'none'
            };
          });
          rewardsData[level] = levelRewards;
        } else {
          rewardsData[level] = {};
        }
      }
      
      setUserRewards(rewardsData);
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      toast.error('Failed to fetch user rewards');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCommissions = async () => {
    if (!token || !userId) return;
    
    try {
      const response = await apiFetch(`/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const commissions: { [level: number]: number } = {};
        for (let level = 1; level <= 5; level++) {
          const commissionField = `lvl${level}Commission` as keyof typeof data.data;
          commissions[level] = (data.data[commissionField] as number) || 0;
        }
        setUserCommissions(commissions);
      }
    } catch (error) {
      console.error('Error fetching user commissions:', error);
    }
  };

  const updateReward = (level: number, network: string, value: string) => {
    const inputKey = `${level}-${network}`;
    
    // Store the raw string value for display
    setInputValues(prev => ({
      ...prev,
      [inputKey]: value
    }));
    
    // Convert to number for state (empty string becomes 0)
    const numValue = value === '' ? 0 : (parseFloat(value) || 0);
    setEditingRewards(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [network]: {
          amount: numValue,
          isCustom: numValue > 0,
          source: numValue > 0 ? 'user' : 'none'
        }
      }
    }));
  };

  const handleInputBlur = (level: number, network: string) => {
    const inputKey = `${level}-${network}`;
    const currentInputValue = inputValues[inputKey];
    
    // If input is empty or invalid, set to empty string in inputValues but keep 0 in rewards
    if (!currentInputValue || currentInputValue === '' || isNaN(parseFloat(currentInputValue))) {
      setInputValues(prev => ({
        ...prev,
        [inputKey]: ''
      }));
    }
  };

  const updateCommission = (level: number, value: number) => {
    setEditingCommissions(prev => ({
      ...prev,
      [level]: value
    }));
  };

  const saveLevelRewards = async (level: number) => {
    if (!token || !userId) return;
    
    setSaving(prev => ({ ...prev, [level]: true }));

    try {
      const levelRewards = editingRewards[level] || {};
      
      // Convert to simple object for API
      const rewardsPayload: { [key: string]: number } = {};
      Object.entries(levelRewards).forEach(([network, rewardData]) => {
        const amount = rewardData.amount || 0;
        
        if (amount > 0) {
          // Convert USDT to crypto if in USDT mode
          if (inputMode === 'usdt') {
            rewardsPayload[network] = convertUSDTToCrypto(amount, network, ratesMap);
          } else {
            // In crypto mode, save the amount directly
            rewardsPayload[network] = amount;
          }
        }
      });
      
      // Validate that at least one network has a value
      if (Object.keys(rewardsPayload).length === 0) {
        toast.error('Please enter at least one network reward value');
        setSaving(prev => ({ ...prev, [level]: false }));
        return;
      }

      // First, save rewards
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update rewards');
      }

      // Then, save commission
      const commissionField = `lvl${level}Commission`;
      const commissionResponse = await apiFetch(`/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [commissionField]: editingCommissions[level] || 0
        })
      });

      const commissionData = await commissionResponse.json();

      if (response.ok && data.success) {
        if (commissionResponse.ok && commissionData.success) {
          toast.success(`Level ${level} rewards and commission updated for ${userName}!`);
        } else {
          toast.success(`Level ${level} rewards updated for ${userName}! (Commission update failed)`);
        }
        await fetchUserRewards();
        await fetchUserCommissions();
      } else {
        toast.error(data.message || 'Failed to update rewards');
      }
    } catch (error) {
      console.error('Error updating rewards:', error);
      toast.error('An error occurred while updating rewards');
    } finally {
      setSaving(prev => ({ ...prev, [level]: false }));
    }
  };

  const handleClose = () => {
    setSelectedLevel(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-15 rounded-2xl" />

          <div className="relative z-10 flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <DialogHeader className="flex-shrink-0 mb-6 flex flex-row justify-between">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="w-6 h-6" />
                Network Rewards: {userName}
              </DialogTitle>

              {/* Input Mode Toggle */}
              <div className="flex items-center justify-between p-4 gap-10 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-sm">Input Mode</h4>
                <div className="flex gap-2 text-white">
                  <Button
                    onClick={() => setInputMode('crypto')}
                    variant={inputMode === 'crypto' ? 'primary' : 'outline'}
                    size="sm"
                    className={`flex items-center gap-2 text-white ${
                      inputMode === 'crypto'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <Coins size={14} />
                    Crypto
                  </Button>
                  <Button
                    onClick={() => setInputMode('usdt')}
                    variant={inputMode === 'usdt' ? 'primary' : 'outline'}
                    size="sm"
                    className={`flex items-center gap-2 text-white ${
                      inputMode === 'usdt'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <DollarSign size={14} />
                    USD
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-20 flex-1">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <Tabs defaultValue="1" className="flex-1 min-h-0 flex flex-col" onValueChange={(value) => setSelectedLevel(parseInt(value))}>
                <TabsList className="bg-white/5 border border-white/10 max-w-fit flex-shrink-0 mb-4">
                  {[1, 2, 3, 4, 5].map(level => (
                    <TabsTrigger key={level} value={String(level)} className="flex items-center gap-2">
                      Level {level}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {[1, 2, 3, 4, 5].map(level => {
                  const levelRewards = editingRewards[level] || {};
                  const levelCommission = editingCommissions[level] ?? (userCommissions[level] || 0);
                  
                  return (
                    <TabsContent key={level} value={String(level)} className="flex-1 min-h-0 overflow-y-auto pr-2">
                      <div className="space-y-6">

                        {/* Network Rewards Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {NETWORKS.map(network => {
                            const inputKey = `${level}-${network.key}`;
                            const storedInputValue = inputValues[inputKey];
                            const currentValue = levelRewards[network.key]?.amount || 0;
                            const rate = ratesMap[network.key] || 0;
                            
                            // Use stored input value if it exists and is being edited, otherwise use the numeric value
                            const displayValue = storedInputValue !== undefined ? storedInputValue : (currentValue > 0 ? currentValue.toString() : '');
                            
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
                                <Label htmlFor={`${network.key}-${level}`} className={`text-sm font-medium ${network.color} flex items-center gap-2`}>
                                  <img 
                                    src={network.logo} 
                                    alt={network.name}
                                    className="w-5 h-5 object-contain"
                                  />
                                  {network.name}
                                  {inputMode === 'usdt' && <span className="text-xs text-muted-foreground">(USDT)</span>}
                                  {inputMode === 'crypto' && <span className="text-xs text-muted-foreground">({network.key})</span>}
                                </Label>
                                <Input
                                  id={`${network.key}-${level}`}
                                  type="number"
                                  step={inputMode === 'usdt' ? '1' : '0.00000001'}
                                  value={displayValue}
                                  onChange={(e) => updateReward(level, network.key, e.target.value)}
                                  onBlur={() => handleInputBlur(level, network.key)}
                                  className="bg-background/50 border-border focus:border-purple-500/50"
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
                        
                        <div className="flex flex-row gap-4 w-full">
                          {/* Commission Field */}
                          <div className="w-3/4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                              <DollarSign className="text-orange-400" size={16} />
                              <span className="text-orange-400">Commission Percentage (%)</span>
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={levelCommission}
                              onChange={(e) => updateCommission(level, parseFloat(e.target.value) || 0)}
                              className="bg-background/50 border-border text-foreground"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-orange-300/80 mt-2">
                              Commission percentage of withdrawal amount for Level {level} rewards (e.g., 10 = 10%)
                            </p>
                          </div>

                          {/* Level Summary */}
                          <div className="w-1/4 p-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/40 rounded-lg shadow-lg">
                            <div className="flex flex-col items-center justify-center gap-2 h-full">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-purple-300" />
                                <span className="text-xs text-purple-300/80 font-medium uppercase tracking-wide">Total (USDT)</span>
                              </div>
                              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-100">
                                ${(() => {
                                  let total = 0;
                                  Object.entries(levelRewards || {}).forEach(([network, rewardData]) => {
                                    const amount = rewardData?.amount || 0;
                                    if (amount > 0) {
                                      // Convert based on input mode
                                      if (inputMode === 'usdt') {
                                        // Amount is already in USDT
                                        total += amount;
                                      } else {
                                        // Amount is in crypto, convert to USDT
                                        total += convertCryptoToUSDT(amount, network, ratesMap);
                                      }
                                    }
                                  });
                                  return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </div>
                              <span className="text-xs text-purple-300/60">Level {level}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Save Button */}
                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              saveLevelRewards(level);
                            }}
                            disabled={saving[level] || false}
                            className="bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
                          >
                            {saving[level] ? (
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
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserRewardsPopup;
