import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, User as UserIcon, Lock, Wallet, Mail, BadgeCheck, ArrowUpRight, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { validateWalletAddress } from '../utils/walletValidation';
import { SHOW_ADDITIONAL_VERIFICATION_UI } from '../config/featureFlags';

interface UserLike {
  name: string;
  email: string;
  phone?: string;
}

interface WalletAddresses {
  btc?: string;
  eth?: string;
  tron?: string;
  usdtErc20?: string;
}

interface CompanyDetails {
  companyName?: string;
  companyRegistrationNumber?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyCountry?: string;
  companyPostalCode?: string;
  companyTaxId?: string;
}

interface BankingDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  bankAddress?: string;
  bankCity?: string;
  bankCountry?: string;
}

interface EditSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  user: UserLike;
  onSuccess?: () => void; // call to refresh user + wallets in parent
}

type TabValue = 'wallet' | 'password' | 'name' | 'company' | 'banking';

const EditSettingsPopup: React.FC<EditSettingsPopupProps> = ({ isOpen, onClose, token, user, onSuccess }) => {
  // Name and Phone
  const [nameInput, setNameInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState<boolean>(false);

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
  
  // Company Details
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({});
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState<boolean>(false);
  const [savingCompanyDetails, setSavingCompanyDetails] = useState<boolean>(false);
  
  // Banking Details
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>({});
  const [loadingBankingDetails, setLoadingBankingDetails] = useState<boolean>(false);
  const [savingBankingDetails, setSavingBankingDetails] = useState<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<TabValue>('wallet');

  useEffect(() => {
    if (!isOpen) return;
    setNameInput(user?.name || '');
    setPhoneInput(user?.phone || '');
  }, [isOpen, user?.name, user?.phone]);

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

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!token || !isOpen) return;
      try {
        setLoadingCompanyDetails(true);
        const res = await apiFetch('/user/me/company-details', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setCompanyDetails(json?.data || {});
        }
      } catch (e) {
        // silent
      } finally {
        setLoadingCompanyDetails(false);
      }
    };
    fetchCompanyDetails();
  }, [token, isOpen]);

  useEffect(() => {
    const fetchBankingDetails = async () => {
      if (!token || !isOpen) return;
      try {
        setLoadingBankingDetails(true);
        const res = await apiFetch('/user/me/banking-details', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json?.success !== false) {
          setBankingDetails(json?.data || {});
        }
      } catch (e) {
        // silent
      } finally {
        setLoadingBankingDetails(false);
      }
    };
    fetchBankingDetails();
  }, [token, isOpen]);

  const savePersonalInfo = async () => {
    if (!token) return;
    const nextName = nameInput.trim();
    const nextPhone = phoneInput.trim();
    
    // Check if anything changed
    if ((!nextName || nextName === user.name) && (!nextPhone || nextPhone === (user.phone || ''))) {
      return;
    }
    
    if (!nextName) {
      toast.error('Name is required');
      return;
    }
    
    if (!nextPhone) {
      toast.error('Phone is required');
      return;
    }
    
    setSavingPersonalInfo(true);
    try {
      const res = await apiFetch('/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: nextName, phone: nextPhone })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Personal information updated');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to update personal information');
      }
    } catch (e) {
      toast.error('Error updating personal information');
    } finally {
      setSavingPersonalInfo(false);
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

  const saveCompanyDetails = async () => {
    if (!token) return;
    setSavingCompanyDetails(true);
    try {
      const res = await apiFetch('/user/me/company-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ companyDetails })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Company details updated');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to update company details');
      }
    } catch (e) {
      toast.error('Error updating company details');
    } finally {
      setSavingCompanyDetails(false);
    }
  };

  const saveBankingDetails = async () => {
    if (!token) return;
    setSavingBankingDetails(true);
    try {
      const res = await apiFetch('/user/me/banking-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bankingDetails })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Banking details updated');
        onSuccess && onSuccess();
      } else {
        toast.error(json?.message || 'Failed to update banking details');
      }
    } catch (e) {
      toast.error('Error updating banking details');
    } finally {
      setSavingBankingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('wallet');
    }
  }, [isOpen]);

  const handleTabChange = (value: string) => {
    if (value === 'additionalVerification') {
      window.open('/profile?openAdditionalVerification=true', '_blank', 'noopener,noreferrer');
      return;
    }
    setActiveTab(value as TabValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-15 rounded-2xl" />

          <div className="relative z-10 flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <BadgeCheck className="text-purple-400" size={24} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                <p className="text-gray-400 text-sm">Update your profile, security and wallet</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="bg-white/5 border border-white/10 max-w-fit flex-shrink-0 mb-4">
                <TabsTrigger value="wallet" className="min-w-[110px] flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Wallet
                </TabsTrigger>
                <TabsTrigger value="password" className="min-w-[110px] flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password
                </TabsTrigger>
                <TabsTrigger value="name" className="min-w-[160px] flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Personal information
                </TabsTrigger>
                <TabsTrigger value="company" className="min-w-[140px] flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Company
                </TabsTrigger>
                <TabsTrigger value="banking" className="min-w-[140px] flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Banking
                </TabsTrigger>
                {SHOW_ADDITIONAL_VERIFICATION_UI && (
                  <TabsTrigger value="additionalVerification" className="min-w-[190px] flex items-center gap-2">
                    Additional verification
                    <ArrowUpRight className="w-3 h-3" />
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="name" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <UserIcon className="w-5 h-5" /> Personal Information
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm text-foreground">Name</label>
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-foreground">Phone Number</label>
                      <input
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={
                          savingPersonalInfo || 
                          !token || 
                          !nameInput.trim() || 
                          !phoneInput.trim() ||
                          (nameInput.trim() === user.name && phoneInput.trim() === (user.phone || ''))
                        }
                        onClick={savePersonalInfo}
                        className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                      >
                        {savingPersonalInfo ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Personal Information'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="company" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-6">
                  {/* Company Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Company Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Company Name</label>
                        <input
                          value={companyDetails.companyName || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyName: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Company Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Registration Number</label>
                        <input
                          value={companyDetails.companyRegistrationNumber || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyRegistrationNumber: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Registration Number"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-foreground">Address</label>
                        <input
                          value={companyDetails.companyAddress || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyAddress: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Company Address"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">City</label>
                        <input
                          value={companyDetails.companyCity || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyCity: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">State/Province</label>
                        <input
                          value={companyDetails.companyState || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyState: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="State/Province"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Country</label>
                        <input
                          value={companyDetails.companyCountry || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyCountry: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Country"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Postal Code</label>
                        <input
                          value={companyDetails.companyPostalCode || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyPostalCode: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Postal Code"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Tax ID</label>
                        <input
                          value={companyDetails.companyTaxId || ''}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, companyTaxId: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Tax ID"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={savingCompanyDetails || !token || loadingCompanyDetails}
                        onClick={saveCompanyDetails}
                        className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                      >
                        {savingCompanyDetails ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Company Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="banking" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-6">
                  {/* Banking Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Banking Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Bank Name</label>
                        <input
                          value={bankingDetails.bankName || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, bankName: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Bank Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Account Holder Name</label>
                        <input
                          value={bankingDetails.accountHolderName || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, accountHolderName: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Account Holder Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Account Number</label>
                        <input
                          value={bankingDetails.accountNumber || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Account Number"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Routing Number</label>
                        <input
                          value={bankingDetails.routingNumber || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, routingNumber: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Routing Number"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">SWIFT Code</label>
                        <input
                          value={bankingDetails.swiftCode || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, swiftCode: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="SWIFT Code"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">IBAN</label>
                        <input
                          value={bankingDetails.iban || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, iban: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="IBAN"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-foreground">Bank Address</label>
                        <input
                          value={bankingDetails.bankAddress || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, bankAddress: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Bank Address"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Bank City</label>
                        <input
                          value={bankingDetails.bankCity || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, bankCity: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Bank City"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Bank Country</label>
                        <input
                          value={bankingDetails.bankCountry || ''}
                          onChange={(e) => setBankingDetails({ ...bankingDetails, bankCountry: e.target.value })}
                          className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                          placeholder="Bank Country"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={savingBankingDetails || !token || loadingBankingDetails}
                        onClick={saveBankingDetails}
                        className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                      >
                        {savingBankingDetails ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Banking Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="password" className="flex-1 min-h-0 overflow-y-auto pr-2">
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

              <TabsContent value="wallet" className="flex-1 min-h-0 overflow-y-auto pr-2">
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


