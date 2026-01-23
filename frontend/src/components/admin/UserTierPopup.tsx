import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Crown, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
  currentTier: number;
  tierName: string;
  balance: number;
  levelTemplate: string;
  completedLevels: number[];
  joinedAt: string;
}

interface TierManagementInfo {
  user: User;
  tierHistory: Array<{
    tier: number;
    name: string;
    changedAt: string;
    reason: string;
  }>;
  availableTiers: Array<{
    tier: number;
    name: string;
    description: string;
  }>;
}

interface UserTierPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const UserTierPopup: React.FC<UserTierPopupProps> = ({ isOpen, onClose, userId, userName }) => {
  const { token } = useAuth();

  const [tierInfo, setTierInfo] = useState<TierManagementInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTier, setNewTier] = useState<number>(0);
  const [newTemplate, setNewTemplate] = useState<string>('A');
  const [templates, setTemplates] = useState<string[]>(['A']);
  const [reason, setReason] = useState('');

  // Fetch tier info when popup opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserTierInfo();
    }
  }, [isOpen, userId]);

  const fetchUserTierInfo = async () => {
    if (!token || !userId) return;

    setLoading(true);
    try {
      const response = await apiFetch(`/user/${userId}/tier-management`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTierInfo(data.data);
        setNewTier(data.data.user.currentTier);
        setNewTemplate(data.data.user.levelTemplate || 'A');
        setReason('');
      } else {
        toast.error(data.message || 'Failed to fetch user tier info');
      }
    } catch (error) {
      console.error('Error fetching user tier info:', error);
      toast.error('An error occurred while fetching user tier info');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const response = await apiFetch('/level/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const handleTierChange = async () => {
    if (!tierInfo || newTier === tierInfo.user.currentTier) {
      toast.error('Please select a different level');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the level change');
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(`/user/${userId}/tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier: newTier,
          levelTemplate: newTemplate,
          tierReason: reason.trim() // Backend might expect tierReason or just use req.body
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`User level changed from ${tierInfo.user.currentTier} to ${newTier} successfully!`);
        setReason('');
        await fetchUserTierInfo();
      } else {
        toast.error(data.message || 'Failed to change user level');
      }
    } catch (error) {
      console.error('Error changing user level:', error);
      toast.error('An error occurred while changing user level');
    } finally {
      setSaving(false);
    }
  };

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 0: return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
      case 1: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 2: return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 3: return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
      case 4: return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 5: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
    }
  };

  const getTierFilledColor = (tier: number) => {
    switch (tier) {
      case 0: return 'bg-gray-500 text-white border-gray-500';
      case 1: return 'bg-blue-500 text-white border-blue-500';
      case 2: return 'bg-green-500 text-white border-green-500';
      case 3: return 'bg-purple-500 text-white border-purple-500';
      case 4: return 'bg-orange-500 text-white border-orange-500';
      case 5: return 'bg-yellow-500 text-white border-yellow-500';
      default: return 'bg-gray-500 text-white border-gray-500';
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl">
        <div className="relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-15 rounded-2xl" />

          <div className="relative z-10">
            {/* Header */}
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Crown className="w-6 h-6" />
                Change User Level: {userName}
              </DialogTitle>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : tierInfo ? (
              <div className="space-y-6">

                {/* Level Change Form */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      New Level
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {tierInfo.availableTiers.map((tier) => {
                        const isSelected = newTier === tier.tier;
                        const isCurrent = tierInfo.user.currentTier === tier.tier;
                        return (
                          <button
                            key={tier.tier}
                            onClick={() => setNewTier(tier.tier)}
                            className={`
                              ${isSelected ? getTierFilledColor(tier.tier) : getTierBadgeColor(tier.tier)}
                              px-3 py-1.5 rounded-lg border transition-all text-sm
                              ${isSelected
                                ? 'scale-105 shadow-lg'
                                : 'hover:opacity-80 hover:scale-105'
                              }
                              ${isCurrent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                            disabled={isCurrent}
                            title={isCurrent ? 'Current level' : `Select Level ${tier.tier}`}
                          >
                            <span className="font-semibold">Level {tier.tier}</span>
                            {isCurrent && (
                              <span className="ml-1.5 text-xs opacity-75">(Current)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      Level Template (Configuration)
                    </Label>
                    <select
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-sm"
                    >
                      {templates.map(t => (
                        <option key={t} value={t}>Template {t}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assign a specific level configuration template to this user.
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Reason for Change
                    </Label>
                    <Textarea
                      placeholder="Enter reason for level change..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-background/50 border-border focus:border-yellow-500/50"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="flex-1 border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTierChange}
                      disabled={saving || (newTier === tierInfo.user.currentTier && newTemplate === tierInfo.user.levelTemplate) || !reason.trim()}
                      className="flex-1 bg-yellow-600/50 hover:bg-yellow-700 text-white border border-yellow-600"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="mr-2" />
                          Change Level
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserTierPopup;
