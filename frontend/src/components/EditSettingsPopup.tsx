import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, User as UserIcon, Lock, Wallet, Mail, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { validateWalletAddress } from '../utils/walletValidation';

interface UserLike {
  name: string;
  email: string;
}

interface WalletAddresses {
  btc?: string;
  eth?: string;
  tron?: string;
  usdtErc20?: string;
}

interface EditSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  user: UserLike;
  onSuccess?: () => void; // call to refresh user + wallets in parent
}

const EditSettingsPopup: React.FC<EditSettingsPopupProps> = ({ isOpen, onClose, token, user, onSuccess }) => {
  // Name
  const [nameInput, setNameInput] = useState<string>('');
  const [savingName, setSavingName] = useState<boolean>(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  // Wallet
  const [wallets, setWallets] = useState<WalletAddresses>({});
  const [loadingWallets, setLoadingWallets] = useState<boolean>(false);
  const [savingWallets, setSavingWallets] = useState<boolean>(false);
  const [walletValidationError, setWalletValidationError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setNameInput(user?.name || '');
  }, [isOpen, user?.name]);

  useEffect(() => {
    const fetchWallets = async () => {
      if (!token || !isOpen) return;
      try {
        setLoadingWallets(true);
        const res = await apiFetch('/user/me/wallets', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setWallets({
            btc: json?.data?.btc || '',
            eth: json?.data?.eth || '',
            tron: json?.data?.tron || '',
            usdtErc20: json?.data?.usdtErc20 || ''
          });
        }
      } catch (e) {
        // silent
      } finally {
        setLoadingWallets(false);
      }
    };
    fetchWallets();
  }, [token, isOpen]);

  const saveName = async () => {
    if (!token) return;
    const nextName = nameInput.trim();
    if (!nextName || nextName === user.name) { return; }
    setSavingName(true);
    try {
      const res = await apiFetch('/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: nextName })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Name updated');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to update name');
      }
    } catch (e) {
      toast.error('Error updating name');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8) {
      toast.error('Check password fields');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiFetch('/user/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Password changed');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to change password');
      }
    } catch (e) {
      toast.error('Error changing password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleBtcChange = (value: string) => {
    setWallets(prev => ({ ...(prev || {}), btc: value }));
    if (walletValidationError) setWalletValidationError('');
    if (value.trim()) {
      const validation = validateWalletAddress(value, 'btc');
      if (!validation.isValid) {
        setWalletValidationError(validation.error || 'Invalid BTC wallet address');
      }
    }
  };

  const saveWallet = async (): Promise<void> => {
    if (!token) return;
    const btc = wallets?.btc?.trim();
    if (!btc) {
      setWalletValidationError('Please enter a BTC wallet address');
      toast.error('Please enter a BTC wallet address');
      return;
    }
    const validation = validateWalletAddress(btc, 'btc');
    if (!validation.isValid) {
      setWalletValidationError(validation.error || 'Invalid BTC wallet address');
      toast.error(validation.error || 'Invalid BTC wallet address');
      return;
    }
    setSavingWallets(true);
    try {
      const res = await apiFetch('/user/me/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ wallets })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Wallet saved successfully!');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to save wallet');
      }
    } catch (e) {
      toast.error('Failed to save wallet');
    } finally {
      setSavingWallets(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl h-[80vh] p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl">
        <div className="relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-15 rounded-2xl" />

          <div className="relative z-10 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <BadgeCheck className="text-purple-400" size={24} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                <p className="text-gray-400 text-sm">Update your profile, security and wallet</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="wallet" className="h-full flex flex-col">
              <TabsList className="bg-white/5 border border-white/10 max-w-fit">
                <TabsTrigger value="wallet" className="min-w-[110px]">Wallet</TabsTrigger>
                <TabsTrigger value="password" className="min-w-[110px]">Password</TabsTrigger>
                <TabsTrigger value="name" className="min-w-[160px]">Personal information</TabsTrigger>
              </TabsList>

              <TabsContent value="name" className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-foreground flex items-center gap-2"><UserIcon className="w-4 h-4" /> Name</label>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      disabled={savingName || !token || !nameInput.trim() || nameInput.trim() === user.name}
                      onClick={saveName}
                      className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                    >
                      {savingName ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Name'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="password" className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                      placeholder="Current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-foreground">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      disabled={
                        savingPassword || !token || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8
                      }
                      onClick={savePassword}
                      className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                    >
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Change Password'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="rounded-lg p-3 transition-all bg-[#F7931A]/10 border border-[#F7931A]/20">
                    <p className={`text-xs ${walletValidationError ? 'text-red-400' : 'text-[#F7931A]'}`}>
                      {walletValidationError || 'Ensure your wallet address is correct.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#F7931A] mb-2 flex items-center gap-2"><Wallet className="w-4 h-4"/> Bitcoin (BTC) Wallet Address</label>
                    <input
                      className={`w-full px-3 py-2 bg-background/50 border rounded text-foreground placeholder:text-muted-foreground focus:outline-none font-mono text-sm transition-all ${
                        walletValidationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#F7931A]'
                      }`}
                      value={wallets?.btc || ''}
                      onChange={(e) => handleBtcChange(e.target.value)}
                      placeholder="BTC Wallet Address"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveWallet} 
                      disabled={savingWallets || loadingWallets} 
                      className="bg-[#F7931A]/40 hover:bg-[#F7931A]/60 text-white flex items-center justify-center gap-2 border border-[#F7931A] shadow-lg shadow-amber-500/10"
                    >
                      {savingWallets ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Wallet'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSettingsPopup;


