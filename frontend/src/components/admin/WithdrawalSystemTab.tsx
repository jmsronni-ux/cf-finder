import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Save, KeyRound, RefreshCw, Percent, DollarSign } from 'lucide-react';

interface LevelPricing {
  mode: 'static' | 'percent';
  staticPrice: number;
  percentPrice: number;
}

const DEFAULT_PRICING: LevelPricing = { mode: 'static', staticPrice: 20, percentPrice: 5 };

const WithdrawalSystemTab: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawalSystem, setWithdrawalSystem] = useState<'current' | 'direct_access_keys'>('current');

  // Per-level pricing (levels 1-5)
  const [levelKeyPricing, setLevelKeyPricing] = useState<{ [level: string]: LevelPricing }>({});

  // Keep flat defaults for backward compat / fallback
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

        const parsed: { [level: string]: LevelPricing } = {};
        if (json.data.levelKeyPricing) {
          const raw = json.data.levelKeyPricing;
          for (const [k, v] of Object.entries(raw)) {
            const entry = v as any;
            parsed[k] = {
              mode: entry.mode || 'static',
              staticPrice: entry.staticPrice ?? 20,
              percentPrice: entry.percentPrice ?? 5
            };
          }
        }
        // Ensure all 5 levels exist — fill missing ones with flat defaults
        for (let l = 1; l <= 5; l++) {
          if (!parsed[String(l)]) {
            parsed[String(l)] = {
              mode: json.data.keyPriceMode || 'static',
              staticPrice: json.data.directAccessKeyPrice ?? 20,
              percentPrice: json.data.directAccessKeyPricePercent ?? 5
            };
          }
        }
        setLevelKeyPricing(parsed);
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
          directAccessKeyPricePercent,
          levelKeyPricing
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

  const updateLevelPricing = (level: string, field: keyof LevelPricing, value: any) => {
    setLevelKeyPricing(prev => ({
      ...prev,
      [level]: { ...(prev[level] || { ...DEFAULT_PRICING }), [field]: value }
    }));
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

          {/* Key Pricing by Level — clean table */}
          <div className={`transition-opacity ${isDAK ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="text-sm font-medium text-foreground mb-3 block">Key Price per Level</label>
            <div className="border border-white/10 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[60px_1fr_1fr] gap-0 px-4 py-2.5 bg-white/[0.04] border-b border-white/10">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Level</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Mode</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Price</span>
              </div>
              {/* Table rows */}
              {[1, 2, 3, 4, 5].map((l, i) => {
                const lvl = String(l);
                const p = levelKeyPricing[lvl] || { ...DEFAULT_PRICING };
                return (
                  <div
                    key={l}
                    className={`grid grid-cols-[60px_1fr_1fr] gap-0 items-center px-4 py-3 ${
                      i < 4 ? 'border-b border-white/[0.06]' : ''
                    } hover:bg-white/[0.02] transition-colors`}
                  >
                    <span className="text-sm font-bold text-orange-400">L{l}</span>
                    {/* Mode pill toggle */}
                    <div className="flex">
                      <div className="inline-flex bg-white/[0.06] rounded-lg p-0.5">
                        <button
                          onClick={() => updateLevelPricing(lvl, 'mode', 'static')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            p.mode === 'static'
                              ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                              : 'text-gray-500 hover:text-gray-400'
                          }`}
                        >
                          $ Fixed
                        </button>
                        <button
                          onClick={() => updateLevelPricing(lvl, 'mode', 'percent')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            p.mode === 'percent'
                              ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                              : 'text-gray-500 hover:text-gray-400'
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    {/* Value input */}
                    <div className="relative max-w-[140px]">
                      {p.mode === 'static' && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                      )}
                      <input
                        type="number"
                        min={p.mode === 'static' ? 1 : 0.1}
                        max={p.mode === 'percent' ? 100 : undefined}
                        step={p.mode === 'static' ? 1 : 0.1}
                        value={p.mode === 'static' ? p.staticPrice : p.percentPrice}
                        onChange={(e) => updateLevelPricing(lvl, p.mode === 'static' ? 'staticPrice' : 'percentPrice', Number(e.target.value))}
                        className={`w-full bg-white/[0.04] border border-white/10 rounded-lg py-1.5 text-white text-sm font-medium focus:outline-none focus:ring-1 transition-all ${
                          p.mode === 'static'
                            ? 'pl-7 pr-3 focus:ring-emerald-500/50'
                            : 'pl-3 pr-7 focus:ring-amber-500/50'
                        }`}
                      />
                      {p.mode === 'percent' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
