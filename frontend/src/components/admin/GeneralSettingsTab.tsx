import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, LayoutPanelTop } from 'lucide-react';
import { apiFetch } from '../../utils/api';

const GeneralSettingsTab: React.FC = () => {
  const { token } = useAuth();
  const [dashboardPanelVisible, setDashboardPanelVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/global-settings', { method: 'GET' });
        const data = await res.json();
        if (res.ok && data.success) {
          setDashboardPanelVisible(data.data.dashboardPanelVisible ?? true);
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
      const res = await apiFetch('/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dashboardPanelVisible }),
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

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutPanelTop className="w-5 h-5 text-slate-400" />
            Dashboard Layout
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
