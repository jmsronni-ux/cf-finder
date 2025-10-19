import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConversionRates } from '../hooks/useConversionRates';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'TRON', name: 'TRON', icon: 'T', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { key: 'USDT', name: 'Tether', icon: '$', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { key: 'BNB', name: 'Binance Coin', icon: 'B', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' }
];

const AdminConversionRates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rates, ratesMap, loading, error, refetch, updateRates } = useConversionRates();
  
  const [editedRates, setEditedRates] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

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

  const handleRateChange = (network: string, value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [network]: value
    }));
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

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-conversion-rates" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Conversion <br /> <span className="text-transparent bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text">
                    Rates
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage cryptocurrency to USD conversion rates</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate('/admin')} 
                  className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50"
                >
                  <ArrowLeft size={16} />
                  Back to Admin
                </Button>
                <Button 
                  onClick={refetch} 
                  disabled={loading}
                  className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh Rates
                </Button>
              </div>
            </div>

            <MagicBadge title="Cryptocurrency Conversion Rates" className="mb-6" />

            {/* Info Box */}
            <Card className="border border-blue-500/30 bg-blue-500/10 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-400 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm text-blue-400 font-medium mb-1">Important</p>
                    <p className="text-xs text-blue-300/80">
                      These conversion rates are used to convert network rewards to USD for display in animations. 
                      Changes affect all future animations immediately. Current rates are cached for 5 minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <div className="mb-6 text-sm text-muted-foreground">
              Last Updated: <span className="text-foreground">{getLastUpdated()}</span>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="border border-red-500/30 bg-red-500/10 mb-6">
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
                {/* Conversion Rates Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {NETWORKS.map(network => {
                    const currentRate = ratesMap[network.key] || 0;
                    const editedRate = editedRates[network.key] || '0';
                    
                    return (
                      <Card 
                        key={network.key} 
                        className={`border ${network.borderColor} ${network.bgColor} hover:scale-[1.02] transition-transform`}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <span className={`text-3xl ${network.color}`}>{network.icon}</span>
                            <div>
                              <div className="text-lg font-semibold text-foreground">{network.name}</div>
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
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Current Rate</div>
                              <div className="text-2xl font-bold text-foreground font-mono">
                                ${currentRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                1 {network.key} = ${currentRate.toLocaleString()} USD
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

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
                      className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600"
                    >
                      <TrendingUp size={16} />
                      Edit Conversion Rates
                    </Button>
                  )}
                </div>

                {/* Success Message */}
                {!isEditing && !loading && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm">All conversion rates are active and up to date</span>
                  </div>
                )}
              </>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminConversionRates;

