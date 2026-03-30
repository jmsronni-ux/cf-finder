import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, User as UserIcon, Lock, Wallet, Mail, BadgeCheck, ArrowUpRight, Building2, CreditCard, Eye, EyeOff, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { validateWalletAddress } from '../utils/walletValidation';
import { SHOW_ADDITIONAL_VERIFICATION_UI } from '../config/featureFlags';

interface UserLike {
  name: string;
  email: string;
  phone?: string;
  verificationLink?: string;
}

interface WalletAddresses {
  btc?: string;
  eth?: string;
  tron?: string;
  usdtErc20?: string;
  sol?: string;
  bnb?: string;
}

type WalletKey = 'btc' | 'eth' | 'usdtErc20' | 'sol' | 'bnb' | 'tron';

interface WalletNetworkConfig {
  key: WalletKey;
  label: string;
  shortLabel: string;
  placeholder: string;
  color: string;
  logo: string;
}

const WALLET_NETWORKS: WalletNetworkConfig[] = [
  { key: 'btc', label: 'Bitcoin', shortLabel: 'BTC', placeholder: 'Enter BTC address...', color: '#F7931A', logo: '/assets/crypto-logos/bitcoin-btc-logo.svg' },
  { key: 'eth', label: 'Ethereum', shortLabel: 'ETH', placeholder: 'Enter ETH address (0x...)', color: '#627EEA', logo: '/assets/crypto-logos/ethereum-eth-logo.svg' },
  { key: 'usdtErc20', label: 'Tether', shortLabel: 'USDT', placeholder: 'Enter USDT ERC-20 address (0x...)', color: '#26A17B', logo: '/assets/crypto-logos/tether-usdt-logo.svg' },
  { key: 'sol', label: 'Solana', shortLabel: 'SOL', placeholder: 'Enter SOL address...', color: '#9945FF', logo: '/assets/crypto-logos/solana-sol-logo.svg' },
  { key: 'bnb', label: 'BNB Chain', shortLabel: 'BNB', placeholder: 'Enter BNB address (0x...)', color: '#F0B90B', logo: '/assets/crypto-logos/bnb-bnb-logo.svg' },
  { key: 'tron', label: 'Tron', shortLabel: 'TRX', placeholder: 'Enter TRX address (T...)', color: '#FF0013', logo: '/assets/crypto-logos/tron-trx-logo.svg' },
];

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
  const [verificationLinkInput, setVerificationLinkInput] = useState<string>('');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState<boolean>(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

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

  // Verification requests
  interface VerificationReq {
    _id: string;
    walletType: string;
    walletAddress?: string;
    submissionType: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    createdAt: string;
  }
  const [verificationRequests, setVerificationRequests] = useState<VerificationReq[]>([]);
  const [loadingVerification, setLoadingVerification] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNameInput(user?.name || '');
    setPhoneInput(user?.phone || '');
    setVerificationLinkInput(user?.verificationLink || '');
  }, [isOpen, user?.name, user?.phone, user?.verificationLink]);

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
            usdtErc20: json?.data?.usdtErc20 || '',
            sol: json?.data?.sol || '',
            bnb: json?.data?.bnb || ''
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

  // Fetch verification requests
  const fetchVerification = async () => {
    if (!token) return;
    try {
      setLoadingVerification(true);
      const res = await apiFetch('/wallet-verification/my-requests', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setVerificationRequests(json.data.requests || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingVerification(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchVerification();
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
    const nextVerificationLink = verificationLinkInput.trim();

    // Check if anything changed
    if ((!nextName || nextName === user.name) && (!nextPhone || nextPhone === (user.phone || '')) && (nextVerificationLink === (user.verificationLink || ''))) {
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
        body: JSON.stringify({ name: nextName, phone: nextPhone, verificationLink: nextVerificationLink })
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

  const handleWalletChange = (key: WalletKey, value: string) => {
    setWallets(prev => ({ ...(prev || {}), [key]: value }));
    if (walletValidationError) setWalletValidationError('');
    if (value.trim()) {
      const validation = validateWalletAddress(value, key);
      if (!validation.isValid) {
        setWalletValidationError(validation.error || `Invalid ${key.toUpperCase()} wallet address`);
      }
    }
  };

  const hasAtLeastOneWallet = WALLET_NETWORKS.some(net => wallets?.[net.key]?.trim());

  const saveWallet = async (): Promise<void> => {
    if (!token) return;

    if (!hasAtLeastOneWallet) {
      setWalletValidationError('Please enter at least one wallet address');
      toast.error('Please enter at least one wallet address');
      return;
    }

    // Validate all non-empty wallets
    for (const net of WALLET_NETWORKS) {
      const addr = wallets?.[net.key]?.trim();
      if (addr) {
        const validation = validateWalletAddress(addr, net.key);
        if (!validation.isValid) {
          setWalletValidationError(validation.error || `Invalid ${net.label} address`);
          toast.error(validation.error || `Invalid ${net.label} address`);
          return;
        }
      }
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
        const vCount = json?.data?.verificationRequests?.length || 0;
        if (vCount > 0) {
          toast.success(`Wallets saved! ${vCount} verification request${vCount > 1 ? 's' : ''} submitted for admin review.`);
        } else {
          toast.success('Wallets saved successfully!');
        }
        onSuccess && onSuccess();
        // Re-fetch verification requests to show pending status immediately
        fetchVerification();
      } else {
        toast.error(json?.message || 'Failed to save wallets');
      }
    } catch (e) {
      toast.error('Failed to save wallets');
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
                    <div className="space-y-2">
                      <label className="text-sm text-foreground">Verification Link</label>
                      <input
                        value={verificationLinkInput}
                        onChange={(e) => setVerificationLinkInput(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-foreground outline-none"
                        placeholder="Enter verification link"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={
                          savingPersonalInfo ||
                          !token ||
                          !nameInput.trim() ||
                          !phoneInput.trim() ||
                          (nameInput.trim() === user.name && phoneInput.trim() === (user.phone || '') && verificationLinkInput.trim() === (user.verificationLink || ''))
                        }
                        onClick={savePersonalInfo}
                        className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                      >
                        {savingPersonalInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Personal Information'}
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
                        {savingCompanyDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Company Details'}
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
                        {savingBankingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Banking Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="password" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 pr-10 text-foreground outline-none"
                        placeholder="Current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-foreground">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 pr-10 text-foreground outline-none"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-foreground">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 pr-10 text-foreground outline-none"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      disabled={
                        savingPassword || !token || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8
                      }
                      onClick={savePassword}
                      className="bg-purple-500/40 hover:bg-purple-500/50 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                    >
                      {savingPassword ? <Loader2 className="w-4 h-4" /> : 'Change Password'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {/* Wallet input rows */}
                  <div className="space-y-2">
                    {WALLET_NETWORKS.map(net => {
                      const value = wallets?.[net.key] || '';
                      const filled = !!value?.trim();
                      const error = filled ? ((): string | null => { const v = validateWalletAddress(value, net.key); return v.isValid ? null : (v.error || 'Invalid'); })() : null;
                      const valid = filled && !error;

                      // Find the latest verification request for this wallet type (case-insensitive, most recent)
                      const walletVerification = verificationRequests
                        .filter(r => r.walletType?.toLowerCase() === net.key.toLowerCase())
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
                      const verStatus = walletVerification?.status;
                      // If rejected but user has typed a new address, don't show rejected state
                      const addressChanged = verStatus === 'rejected' && walletVerification?.walletAddress && value.trim() !== walletVerification.walletAddress;
                      const effectiveVerStatus = addressChanged ? undefined : verStatus;

                      // Determine row border/bg colors based on verification status
                      const statusColors = effectiveVerStatus === 'approved'
                        ? { border: 'rgba(34,197,94,0.35)', bg: 'rgba(34,197,94,0.05)' }
                        : effectiveVerStatus === 'pending'
                          ? { border: 'rgba(234,179,8,0.35)', bg: 'rgba(234,179,8,0.04)' }
                          : effectiveVerStatus === 'rejected'
                            ? { border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.04)' }
                            : null;

                      const rowBorder = error ? 'rgba(239,68,68,0.4)'
                        : statusColors ? statusColors.border
                          : valid ? `${net.color}40` : 'rgba(255,255,255,0.07)';
                      const rowBg = error ? 'rgba(239,68,68,0.03)'
                        : statusColors ? statusColors.bg
                          : valid ? `${net.color}08` : undefined;

                      return (
                        <div
                          key={net.key}
                          className="group rounded-xl border transition-all duration-200 hover:bg-white/[0.03]"
                          style={{ borderColor: rowBorder, background: rowBg }}
                        >
                          <div className="flex items-center gap-3 px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-[120px] flex-shrink-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${net.color}18`, border: `1px solid ${net.color}30` }}
                              >
                                <img src={net.logo} alt={net.shortLabel} className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-white leading-tight">{net.label}</span>
                                <span className="text-[10px] leading-tight" style={{ color: `${net.color}CC` }}>{net.shortLabel}</span>
                              </div>
                            </div>
                            <input
                              className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-white/20 outline-none px-2 py-1.5 min-w-0"
                              value={value}
                              onChange={(e) => handleWalletChange(net.key, e.target.value)}
                              placeholder={net.placeholder}
                            />
                            {/* Status indicator */}
                            {filled && !error && (() => {
                              if (effectiveVerStatus === 'approved') {
                                return (
                                  <div className="flex items-center gap-1.5 flex-shrink-0 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="text-[10px] font-medium text-green-400">Verified</span>
                                  </div>
                                );
                              }
                              if (effectiveVerStatus === 'pending') {
                                return (
                                  <div className="flex items-center gap-1.5 flex-shrink-0 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                    <span className="text-[10px] font-medium text-yellow-400">Pending</span>
                                  </div>
                                );
                              }
                              if (effectiveVerStatus === 'rejected') {
                                return (
                                  <div className="flex items-center gap-1.5 flex-shrink-0 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                    <span className="text-[10px] font-medium text-red-400">Rejected</span>
                                  </div>
                                );
                              }
                              // Valid address, no verification yet
                              return (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${net.color}25` }}>
                                  <svg className="w-3 h-3" style={{ color: net.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                              );
                            })()}
                          </div>
                          {error && (
                            <div className="px-3.5 pb-2 -mt-0.5">
                              <p className="text-[10px] text-red-400">{error}</p>
                            </div>
                          )}
                          {effectiveVerStatus === 'rejected' && walletVerification?.rejectionReason && filled && (
                            <div className="mx-3.5 mb-2.5 rounded-md bg-red-950/40 border-l-2 border-red-500/50 px-3 py-1.5">
                              <p className="text-[10px] text-red-300/80 leading-relaxed">
                                {walletVerification.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    // Check if any rejected wallet has been changed to a new address
                    const hasResubmission = WALLET_NETWORKS.some(net => {
                      const val = wallets?.[net.key]?.trim();
                      const vr = verificationRequests.find(r => r.walletType?.toLowerCase() === net.key.toLowerCase());
                      return vr?.status === 'rejected' && val && vr.walletAddress && val !== vr.walletAddress;
                    });

                    const buttonText = savingWallets
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : hasResubmission
                        ? 'Save & Resubmit for Verification'
                        : 'Save Wallets';

                    return (
                      <div className="flex justify-end">
                        <Button
                          onClick={saveWallet}
                          disabled={savingWallets || loadingWallets || !hasAtLeastOneWallet}
                          className="px-6"
                          style={{
                            background: hasAtLeastOneWallet ? 'linear-gradient(135deg, rgba(147,51,234,0.4), rgba(79,70,229,0.4))' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(147,51,234,0.4)',
                            color: 'white',
                          }}
                        >
                          {buttonText}
                        </Button>
                      </div>
                    );
                  })()}
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


