import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Save, KeyRound, RefreshCw } from 'lucide-react';

const WithdrawalSystemTab: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawalSystem, setWithdrawalSystem] = useState<'current' | 'direct_access_keys'>('current');
  const [directAccessKeyPrice, setDirectAccessKeyPrice] = useState(20);

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
        body: JSON.stringify({ withdrawalSystem, directAccessKeyPrice })
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
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  withdrawalSystem === 'current'
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
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  withdrawalSystem === 'direct_access_keys'
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

          {/* Key Price (only relevant for direct keys) */}
          <div className={`transition-opacity ${withdrawalSystem === 'direct_access_keys' ? 'opacity-100' : 'opacity-40'}`}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Direct Access Key Price (USD)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={directAccessKeyPrice}
              onChange={(e) => setDirectAccessKeyPrice(Number(e.target.value))}
              className="w-full md:w-48 bg-white/5 border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={withdrawalSystem !== 'direct_access_keys'}
            />
            <p className="text-xs text-gray-500 mt-1">Cost per key for users generating Direct Access Keys.</p>
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
