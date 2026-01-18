import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Save, 
  DollarSign,
  Loader2,
  AlertCircle,
  Coins,
  Zap,
  Trophy
} from 'lucide-react';
import MagicBadge from '../../components/ui/magic-badge';
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
  { key: 'BTC', name: 'Bitcoin', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', logo: '/assets/crypto-logos/tron-trx-logo.svg', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', logo: '/assets/crypto-logos/tether-usdt-logo.svg', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', logo: '/assets/crypto-logos/bnb-bnb-logo.svg', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', logo: '/assets/crypto-logos/solana-sol-logo.svg', color: 'text-purple-500' }
];

const TIER_NAMES: { [key: number]: string } = {
  1: 'Basic',
  2: 'Standard',
  3: 'Professional',
  4: 'Enterprise',
  5: 'Premium'
};

const NetworkRewardsTab: React.FC = () => {
  const { token } = useAuth();
  const { ratesMap, loading: ratesLoading } = useConversionRates();
  
  const [rewards, setRewards] = useState<LevelRewards>({});
  const [commissions, setCommissions] = useState<{ [level: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [inputMode, setInputMode] = useState<'crypto' | 'usdt'>('crypto');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [previousInputMode, setPreviousInputMode] = useState<'crypto' | 'usdt'>('crypto');
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/network-reward/summary');
      const data = await response.json();

      if (response.ok && data.success) {
        const fetchedRewards = data.data.summary.byLevel || {};
        setRewards(fetchedRewards);
        
        // Initialize input values for display
        const initialInputValues: { [key: string]: string } = {};
        Object.entries(fetchedRewards).forEach(([levelStr, levelRewards]) => {
          const level = parseInt(levelStr);
          const rewards = levelRewards as NetworkRewards;
          Object.entries(rewards).forEach(([network, value]) => {
            const numValue = typeof value === 'number' ? value : 0;
            const inputKey = `${level}-${network}`;
            initialInputValues[inputKey] = numValue > 0 ? numValue.toString() : '';
          });
        });
        setInputValues(initialInputValues);
        
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
      // Always save as crypto amounts (backend stores crypto)
      const rewardsToSave: NetworkRewards = {};
      Object.entries(levelRewards).forEach(([network, value]) => {
        const numValue = typeof value === 'number' ? value : 0;
        if (inputMode === 'usdt') {
          // Convert USDT to crypto before saving
          rewardsToSave[network] = convertUSDTToCrypto(numValue, network, ratesMap);
        } else {
          // Already in crypto mode, save directly
          rewardsToSave[network] = numValue;
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
    const inputKey = `${level}-${network}`;
    
    // Store the raw string value for display
    setInputValues(prev => ({
      ...prev,
      [inputKey]: value
    }));
    
    // Convert to number for state (empty string becomes 0)
    const numValue = value === '' ? 0 : (parseFloat(value) || 0);
    setRewards(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [network]: numValue
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
      Object.entries(levelRewards).forEach(([network, amount]) => {
        const numAmount = typeof amount === 'number' ? amount : 0;
        if (numAmount > 0) {
          // Convert based on input mode
          if (inputMode === 'usdt') {
            // Amount is already in USDT
            totalUSDT += numAmount;
          } else {
            // Amount is in crypto, convert to USDT
            totalUSDT += convertCryptoToUSDT(numAmount, network, ratesMap);
          }
        }
      });
    });
    return totalUSDT;
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  // Convert values when input mode changes
  useEffect(() => {
    if (previousInputMode === inputMode || Object.keys(rewards).length === 0 || Object.keys(ratesMap).length === 0) {
      setPreviousInputMode(inputMode);
      return;
    }

    // Convert all reward values based on mode switch
    const convertedRewards: LevelRewards = {};
    const convertedInputValues: { [key: string]: string } = {};
    
    Object.entries(rewards).forEach(([levelStr, levelRewardsData]) => {
      const level = parseInt(levelStr);
      const levelRewards = levelRewardsData as NetworkRewards;
      convertedRewards[level] = {};
      
      Object.entries(levelRewards).forEach(([network, value]) => {
        const numValue = typeof value === 'number' ? value : 0;
        const inputKey = `${level}-${network}`;
        
        if (numValue > 0) {
          let convertedValue = numValue;
          
          if (previousInputMode === 'crypto' && inputMode === 'usdt') {
            // Converting from crypto to USDT
            convertedValue = convertCryptoToUSDT(numValue, network, ratesMap);
          } else if (previousInputMode === 'usdt' && inputMode === 'crypto') {
            // Converting from USDT to crypto
            convertedValue = convertUSDTToCrypto(numValue, network, ratesMap);
          }
          
          convertedRewards[level][network] = convertedValue;
          convertedInputValues[inputKey] = convertedValue > 0 ? convertedValue.toString() : '';
        } else {
          convertedRewards[level][network] = numValue;
          convertedInputValues[inputKey] = '';
        }
      });
    });

    setRewards(convertedRewards);
    setInputValues(prev => ({ ...prev, ...convertedInputValues }));
    setPreviousInputMode(inputMode);
  }, [inputMode, ratesMap]);

  return (
    <div className="space-y-6">

      {ratesLoading && (
        <div className="flex items-center gap-2 text-sm text-yellow-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading conversion rates...
        </div>
      )}

      {/* Rewards by Level */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <Tabs defaultValue="1" className="w-full" onValueChange={(value) => setSelectedLevel(parseInt(value))}>
          <div className="flex flex-row justify-between items-center">
            <TabsList className="bg-white/5 border border-white/10 max-w-fit">
              {[1, 2, 3, 4, 5].map(level => (
                <TabsTrigger key={level} value={String(level)} className="flex items-center gap-2">
                  Level {level}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Input Mode Toggle */}
            <div className="flex items-center justify-between p-4 gap-4 bg-white/5 border border-white/10 rounded-lg">
              <h4 className="font-semibold text-sm">Input Mode</h4>
              <div className="flex gap-2">
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
                  USDT
                </Button>
              </div>
            </div>
          </div>

          {[1, 2, 3, 4, 5].map(level => {
            const levelKey = `level-${level}`;
            const isSaving = saving[levelKey];
            
            return (
              <TabsContent key={level} value={String(level)} className="space-y-6">

                {/* Network Rewards Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {NETWORKS.map(network => {
                    const inputKey = `${level}-${network.key}`;
                    const storedInputValue = inputValues[inputKey];
                    const currentValue = rewards[level]?.[network.key] || 0;
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
                          min="0"
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
                      max="100"
                      value={commissions[level] ?? 0}
                      onChange={(e) => updateCommission(level, e.target.value)}
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
                          Object.entries(rewards[level] || {}).forEach(([network, amount]) => {
                            const numAmount = typeof amount === 'number' ? amount : 0;
                            if (numAmount > 0) {
                              // Convert based on input mode
                              if (inputMode === 'usdt') {
                                // Amount is already in USDT
                                total += numAmount;
                              } else {
                                // Amount is in crypto, convert to USDT
                                total += convertCryptoToUSDT(numAmount, network, ratesMap);
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
                    onClick={() => saveLevelRewards(level)}
                    disabled={isSaving}
                    className="bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
                  >
                    {isSaving ? (
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
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default NetworkRewardsTab;
