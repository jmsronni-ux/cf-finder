import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Save, KeyRound, RefreshCw, Percent, DollarSign } from 'lucide-react';

const WithdrawalSystemTab: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawalSystem, setWithdrawalSystem] = useState<'current' | 'direct_access_keys'>('current');
  const [directAccessKeyPrice, setDirectAccessKeyPrice] = useState(20);
  const [keyPriceMode, setKeyPriceMode] = useState<'static' | 'percent'>('static');
  const [directAccessKeyPricePercent, setDirectAccessKeyPricePercent] = useState(5);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/global-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setWithdrawalSystem(json.data.withdrawalSystem || 'current');
        setDirectAccessKeyPrice(json.data.directAccessKeyPrice ?? 20);
        setKeyPriceMode(json.data.keyPriceMode || 'static');
        setDirectAccessKeyPricePercent(json.data.directAccessKeyPricePercent ?? 5);
      }
    } catch (e) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          withdrawalSystem,
          directAccessKeyPrice,
          keyPriceMode,
          directAccessKeyPricePercent
        })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Withdrawal system settings saved');
      } else {
        toast.error(json?.message || 'Failed to save');
      }
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDAK = withdrawalSystem === 'direct_access_keys';

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Withdrawal System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Active Withdrawal System</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setWithdrawalSystem('current')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${withdrawalSystem === 'current'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-border hover:border-white/30 bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">Classic Re-Allocate</span>
                </div>
                <p className="text-xs text-gray-400">
                  Users see network-based withdrawal popup after completing a level scan.
                </p>
              </button>
              <button
                onClick={() => setWithdrawalSystem('direct_access_keys')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${withdrawalSystem === 'direct_access_keys'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-border hover:border-white/30 bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-white">Direct Access Keys</span>
                </div>
                <p className="text-xs text-gray-400">
                  Users purchase keys from available balance. Admin approves amount to credit.
                </p>
              </button>
            </div>
          </div>

          {/* Key Pricing Section (only relevant for direct keys) */}
          <div className={`transition-opacity space-y-4 ${isDAK ? 'opacity-100' : 'opacity-40'}`}>
            {/* Pricing Mode Toggle */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Key Pricing Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setKeyPriceMode('static')}
                  disabled={!isDAK}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${keyPriceMode === 'static'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:border-white/20 bg-white/5'
                    } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-white text-sm">Static Price (USD)</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Fixed dollar amount per key, regardless of node value.
                  </p>
                </button>
                <button
                  onClick={() => setKeyPriceMode('percent')}
                  disabled={!isDAK}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${keyPriceMode === 'percent'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:border-white/20 bg-white/5'
                    } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span className="font-medium text-white text-sm">Percentage of Node Amount</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Key cost scales with the node's transaction amount.
                  </p>
                </button>
              </div>
            </div>

            {/* Static Price Input */}
            {keyPriceMode === 'static' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Direct Access Key Price (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={directAccessKeyPrice}
                  onChange={(e) => setDirectAccessKeyPrice(Number(e.target.value))}
                  className="w-full md:w-48 bg-white/5 border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={!isDAK}
                />
                <p className="text-xs text-gray-500 mt-1">Fixed cost per key for users generating Direct Access Keys.</p>
              </div>
            )}

            {/* Percentage Input */}
            {keyPriceMode === 'percent' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Key Price Percentage (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={directAccessKeyPricePercent}
                    onChange={(e) => setDirectAccessKeyPricePercent(Number(e.target.value))}
                    className="w-full md:w-48 bg-white/5 border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={!isDAK}
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Key cost = {directAccessKeyPricePercent}% of each node's transaction amount. Minimum $1 per key.
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalSystemTab;
