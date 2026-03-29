import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Save, Loader2, LayoutPanelTop, ArrowRightLeft, DollarSign, Percent } from 'lucide-react';
import { apiFetch } from '../../utils/api';

const GeneralSettingsTab: React.FC = () => {
  const { token } = useAuth();
  const [dashboardPanelVisible, setDashboardPanelVisible] = useState(true);
  const [transferFeeMode, setTransferFeeMode] = useState<'percent' | 'fixed'>('fixed');
  const [transferFeeValue, setTransferFeeValue] = useState<string>('0');
  const [defaultLevelTemplate, setDefaultLevelTemplate] = useState<string>('A');
  const [availableTemplates, setAvailableTemplates] = useState<string[]>(['A']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [settingsRes, templatesRes] = await Promise.all([
          apiFetch('/global-settings', { method: 'GET' }),
          apiFetch('/level/templates', { method: 'GET' })
        ]);
        
        const settingsData = await settingsRes.json();
        if (settingsRes.ok && settingsData.success) {
          setDashboardPanelVisible(settingsData.data.dashboardPanelVisible ?? true);
          setTransferFeeMode(settingsData.data.transferFeeMode ?? 'fixed');
          setTransferFeeValue(String(settingsData.data.transferFeeValue ?? 0));
          setDefaultLevelTemplate(settingsData.data.defaultLevelTemplate ?? 'A');
        }

        const templatesData = await templatesRes.json();
        if (templatesRes.ok && templatesData.success) {
          setAvailableTemplates(templatesData.data);
        }
      } catch (error) {
        console.error('Error fetching global settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const feeVal = parseFloat(transferFeeValue) || 0;
      if (feeVal < 0) {
        toast.error('Fee value cannot be negative');
        setSaving(false);
        return;
      }
      if (transferFeeMode === 'percent' && feeVal > 100) {
        toast.error('Percentage fee cannot exceed 100%');
        setSaving(false);
        return;
      }

      const res = await apiFetch('/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dashboardPanelVisible,
          transferFeeMode,
          transferFeeValue: feeVal,
          defaultLevelTemplate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('General settings updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const feeVal = parseFloat(transferFeeValue) || 0;
  const exampleAmount = 100;
  const exampleFee = transferFeeMode === 'percent'
    ? Math.round((exampleAmount * feeVal / 100) * 100) / 100
    : Math.min(feeVal, exampleAmount);
  const exampleNet = Math.round((exampleAmount - exampleFee) * 100) / 100;

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutPanelTop className="w-5 h-5 text-slate-400" />
            General Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Show Dashboard Panel</Label>
              <p className="text-xs text-muted-foreground">
                Toggle the bottom panel visibility on the Dashboard page. When hidden, the canvas takes full height.
              </p>
            </div>
            <Switch
              checked={dashboardPanelVisible}
              onCheckedChange={setDashboardPanelVisible}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Default Level Template</Label>
              <p className="text-xs text-muted-foreground">
                The default template assigned to newly registered users (e.g., A, B, C).
              </p>
            </div>
            <div className="w-32">
              <Select value={defaultLevelTemplate} onValueChange={setDefaultLevelTemplate}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background border-border">
                  {availableTemplates.map(template => (
                    <SelectItem key={template} value={template}>
                      Template {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Fee Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            Transfer Fee Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure the fee charged when users transfer funds from Onchain to Available balance. Set to 0 for no fee.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fee Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fee Mode</Label>
              <Select value={transferFeeMode} onValueChange={(v: 'percent' | 'fixed') => setTransferFeeMode(v)}>
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background border-border">
                  <SelectItem value="fixed">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      Fixed Amount
                    </span>
                  </SelectItem>
                  <SelectItem value="percent">
                    <span className="flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5" />
                      Percentage
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Value */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Fee Value {transferFeeMode === 'percent' ? '(%)' : '($)'}
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {transferFeeMode === 'percent' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                </div>
                <Input
                  type="number"
                  min="0"
                  max={transferFeeMode === 'percent' ? 100 : undefined}
                  step="0.01"
                  value={transferFeeValue}
                  onChange={(e) => setTransferFeeValue(e.target.value)}
                  className="pl-9 bg-background/50 border-border"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {feeVal > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-xs text-purple-300">
                <span className="font-medium">Example:</span> A ${exampleAmount} transfer → Fee: <span className="text-red-400">${exampleFee.toFixed(2)}</span> → User receives: <span className="text-green-400">${exampleNet.toFixed(2)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600/50 hover:bg-purple-700 text-white border border-purple-600"
        >
          {saving ? (
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
  );
};

export default GeneralSettingsTab;
