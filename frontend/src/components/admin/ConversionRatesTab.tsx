import React, { useState, useEffect, useCallback } from 'react';
import { useConversionRates } from '../../hooks/useConversionRates';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Save,
  RefreshCw,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import MagicBadge from '../../components/ui/magic-badge';

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'ETH', name: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'TRON', name: 'TRON', logo: '/assets/crypto-logos/tron-trx-logo.svg', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { key: 'USDT', name: 'Tether', logo: '/assets/crypto-logos/tether-usdt-logo.svg', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { key: 'BNB', name: 'Binance Coin', logo: '/assets/crypto-logos/bnb-bnb-logo.svg', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'SOL', name: 'Solana', logo: '/assets/crypto-logos/solana-sol-logo.svg', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' }
];

// CoinGecko ID mapping for real-time rates
const COINGECKO_IDS: { [key: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  TRON: 'tron',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana'
};

const ConversionRatesTab: React.FC = () => {
  const { rates, ratesMap, isAuto, loading, error, refetch, updateRates } = useConversionRates();

  const [editedRates, setEditedRates] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [realTimeRates, setRealTimeRates] = useState<{ [key: string]: number } | null>(null);
  const [fetchingRealTime, setFetchingRealTime] = useState(false);
  const [realTimeError, setRealTimeError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize edited rates from fetched rates
    if (rates.length > 0) {
      const initialRates: { [key: string]: string } = {};
      rates.forEach(rate => {
        initialRates[rate.network] = rate.rateToUSD.toString();
      });
      setEditedRates(initialRates);
    }
  }, [rates]);

  // Fetch real-time rates when auto mode is enabled
  const fetchRealTimeRates = useCallback(async (updateDatabase: boolean = false) => {
    if (!isAuto) {
      setRealTimeRates(null);
      return;
    }

    try {
      setFetchingRealTime(true);
      setRealTimeError(null);

      const ids = Object.values(COINGECKO_IDS).join(',');
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rates: { [key: string]: number } = {};

      // Map back to our network keys
      Object.entries(COINGECKO_IDS).forEach(([network, geckoId]) => {
        if (data[geckoId] && data[geckoId].usd) {
          rates[network] = data[geckoId].usd;
        }
      });

      setRealTimeRates(rates);

      // If updateDatabase is true (manual refresh), update the backend database
      if (updateDatabase && Object.keys(rates).length > 0) {
        const success = await updateRates(rates, true);
        if (success) {
          toast.success('Rates refreshed and updated successfully!');
        } else {
          toast.error('Rates fetched but failed to update database');
        }
      }
    } catch (err) {
      console.error('[AdminConversionRates] Error fetching real-time rates:', err);
      setRealTimeError(err instanceof Error ? err.message : 'Failed to fetch real-time rates');
      setRealTimeRates(null);
      if (updateDatabase) {
        toast.error('Failed to fetch real-time rates');
      }
    } finally {
      setFetchingRealTime(false);
    }
  }, [isAuto, updateRates]);

  // Fetch real-time rates when auto mode is enabled
  useEffect(() => {
    if (isAuto && !loading) {
      fetchRealTimeRates();
    } else {
      setRealTimeRates(null);
      setRealTimeError(null);
    }
  }, [isAuto, loading, fetchRealTimeRates]);

  // Auto-refresh real-time rates every 30 seconds when auto mode is on
  useEffect(() => {
    if (!isAuto || loading) return;

    const interval = setInterval(() => {
      fetchRealTimeRates();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAuto, loading, fetchRealTimeRates]);

  const handleRateChange = (network: string, value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [network]: value
    }));
  };

  const handleAutoToggle = async (checked: boolean) => {
    try {
      setIsSaving(true);
      const success = await updateRates({}, checked);
      if (success) {
        toast.success(`Switched to ${checked ? 'Real-time' : 'Manual'} rates`);
        // If switching to manual, we might want to refresh editedRates with current values
        if (!checked) {
          const resetRates: { [key: string]: string } = {};
          rates.forEach(rate => {
            resetRates[rate.network] = rate.rateToUSD.toString();
          });
          setEditedRates(resetRates);
        }
      } else {
        toast.error('Failed to update rate mode');
      }
    } catch (error) {
      console.error('Error toggling auto mode:', error);
      toast.error('Failed to update rate mode');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate all rates
      const ratesToUpdate: { [key: string]: number } = {};
      for (const [network, rateStr] of Object.entries(editedRates)) {
        const rate = parseFloat(rateStr);
        if (isNaN(rate) || rate < 0) {
          toast.error(`Invalid rate for ${network}. Must be a non-negative number.`);
          setIsSaving(false);
          return;
        }
        ratesToUpdate[network] = rate;
      }

      const success = await updateRates(ratesToUpdate);

      if (success) {
        toast.success('Conversion rates updated successfully!');
        setIsEditing(false);
      } else {
        toast.error('Failed to update conversion rates');
      }
    } catch (error) {
      console.error('Error saving rates:', error);
      toast.error('Failed to update conversion rates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset edited rates to current rates
    const resetRates: { [key: string]: string } = {};
    rates.forEach(rate => {
      resetRates[rate.network] = rate.rateToUSD.toString();
    });
    setEditedRates(resetRates);
    setIsEditing(false);
  };

  const getLastUpdated = () => {
    if (rates.length === 0) return 'Never';

    const mostRecent = rates.reduce((latest, rate) => {
      const rateDate = new Date(rate.metadata.updatedAt);
      const latestDate = new Date(latest.metadata.updatedAt);
      return rateDate > latestDate ? rate : latest;
    });

    const date = new Date(mostRecent.metadata.updatedAt);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">

      {/* Last Updated */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          {isEditing ? (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-border"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className={`bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600 ${isAuto ? 'hidden' : ''}`}
              disabled={isAuto}
            >
              {isAuto ? 'Switch to Manual to Edit' : 'Edit Conversion Rates'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuto && (
            <Button
              onClick={() => fetchRealTimeRates(true)}
              disabled={fetchingRealTime}
              variant="outline"
              className="flex items-center py-6"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingRealTime ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-lg">
            <Switch
              id="auto-mode"
              checked={isAuto}
              onCheckedChange={handleAutoToggle}
              disabled={isSaving}
            />
            <div className="flex flex-col">
              <Label htmlFor="auto-mode" className="font-medium cursor-pointer">Real-time Rates</Label>
              <span className="text-xs text-muted-foreground">
                {isAuto ? 'Rates update automatically via CoinGecko' : 'Manually set fixed rates'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border border-red-500/30 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && rates.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Real-time Error Display */}
          {isAuto && realTimeError && (
            <Card className="border border-amber-500/30 bg-amber-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">Using fallback rates: {realTimeError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversion Rates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NETWORKS.map(network => {
              // Use real-time rate if available and auto mode is on, otherwise use database rate
              const displayRate = isAuto && realTimeRates?.[network.key] 
                ? realTimeRates[network.key] 
                : (ratesMap[network.key] || 0);
              const fallbackRate = ratesMap[network.key] || 0;
              const editedRate = editedRates[network.key] || '0';
              const isUsingRealTime = isAuto && realTimeRates?.[network.key] !== undefined;
              const isUsingFallback = isAuto && !realTimeRates?.[network.key] && fallbackRate > 0;

              return (
                <Card
                  key={network.key}
                  className={`border ${network.borderColor} ${network.bgColor} hover:scale-[1.02] transition-transform`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center">
                        <img 
                          src={network.logo} 
                          alt={network.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold text-foreground">{network.name}</div>
                          {isUsingRealTime && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              Live
                            </span>
                          )}
                          {isUsingFallback && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                              Fallback
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{network.key}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div>
                        <Label htmlFor={`rate-${network.key}`} className="text-sm mb-2 block">
                          Rate to USD
                        </Label>
                        <Input
                          id={`rate-${network.key}`}
                          type="number"
                          step="any"
                          min="0"
                          value={editedRate}
                          onChange={(e) => handleRateChange(network.key, e.target.value)}
                          className="bg-background/50 border-border text-foreground"
                          placeholder="0.00"
                          disabled={isAuto}
                        />
                        {isAuto && (
                          <p className="text-xs text-amber-500 mt-1">
                            Managed automatically
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-muted-foreground">Current Rate</div>
                          {fetchingRealTime && isAuto && (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-2xl font-bold text-foreground font-mono">
                          ${displayRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          1 {network.key} = ${displayRate.toLocaleString()} USD
                        </div>
                        {isUsingFallback && fallbackRate > 0 && (
                          <div className="text-xs text-amber-500/80 mt-1">
                            Using cached rate (real-time unavailable)
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="flex flex-row items-center justify-between">
            {/* Success Message */}
            {!isEditing && !loading && (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle size={16} />
                <span className="text-sm">All conversion rates are active and up to date</span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Last Updated: <span className="text-foreground">{getLastUpdated()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConversionRatesTab;
