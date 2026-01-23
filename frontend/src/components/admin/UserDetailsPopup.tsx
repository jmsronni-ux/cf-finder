import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, User as UserIcon, Key, Wallet, Building2, CreditCard, Mail, Calendar, Shield, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';

interface FullUserData {
  _id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  verificationLink?: string;
  balance?: number;
  tier?: number;
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  managedBy?: string | null;
  levelTemplate?: string;
  createdAt?: string;
  updatedAt?: string;
  wallets?: {
    btc?: string;
    eth?: string;
    tron?: string;
    usdtErc20?: string;
  };
  walletVerified?: boolean;
  companyDetails?: {
    companyName?: string;
    companyRegistrationNumber?: string;
    companyAddress?: string;
    companyCity?: string;
    companyState?: string;
    companyCountry?: string;
    companyPostalCode?: string;
    companyTaxId?: string;
  };
  bankingDetails?: {
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    bankAddress?: string;
    bankCity?: string;
    bankCountry?: string;
  };
}

interface UserDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  user: FullUserData | null;
  loading: boolean;
}

const UserDetailsPopup: React.FC<UserDetailsPopupProps> = ({ isOpen, onClose, user, loading }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [subadmins, setSubadmins] = useState<any[]>([]);
  const [loadingSubadmins, setLoadingSubadmins] = useState(false);
  const [selectedManagedBy, setSelectedManagedBy] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && !user?.isSubAdmin) {
      const fetchSubadmins = async () => {
        setLoadingSubadmins(true);
        try {
          const res = await apiFetch('/user?role=subadmin', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            setSubadmins(data.data || []);
          }
        } catch (err) {
          console.error('Error fetching subadmins:', err);
        } finally {
          setLoadingSubadmins(false);
        }
      };
      fetchSubadmins();
    }
    if (user) {
      setSelectedManagedBy(user.managedBy || null);
    }
  }, [isOpen, user]);

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('Failed to copy email');
    }
  };

  const handleCopyPassword = async () => {
    if (!user?.password) return;
    try {
      await navigator.clipboard.writeText(user.password);
      setCopiedPassword(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast.error('Failed to copy password');
    }
  };

  const updateAssignment = async (newManagedBy: string | null) => {
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await apiFetch(`/user/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ managedBy: newManagedBy })
      });

      const data = await response.json();
      if (data.success) {
        setSelectedManagedBy(newManagedBy);
        toast.success(`User assignment updated successfully`);
      } else {
        toast.error(data.message || 'Failed to update user assignment');
      }
    } catch (error) {
      console.error('Error updating user assignment:', error);
      toast.error('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSubAdmin = async () => {
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await apiFetch(`/user/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isSubAdmin: !user.isSubAdmin })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`User subadmin status updated to ${!user.isSubAdmin}`);
      } else {
        toast.error(data.message || 'Failed to update subadmin status');
      }
    } catch (error) {
      console.error('Error updating subadmin status:', error);
      toast.error('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-15 rounded-2xl" />

          <div className="relative z-10 flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <DialogHeader className="flex-shrink-0 mb-6">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <UserIcon className="w-6 h-6" />
                User Details: {user?.name || 'Loading...'}
              </DialogTitle>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-20 flex-1">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : user ? (
              <Tabs defaultValue="basic" className="flex-1 min-h-0 flex flex-col">
                <TabsList className="bg-white/5 border border-white/10 max-w-fit flex-shrink-0 mb-4">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="account" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Account
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Wallets
                  </TabsTrigger>
                  <TabsTrigger value="company" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Company
                  </TabsTrigger>
                  <TabsTrigger value="banking" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Banking
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <UserIcon className="w-5 h-5" /> Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Name</label>
                          <p className="text-foreground font-medium mt-1">{user.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-foreground font-medium flex-1 min-w-0 truncate">{user.email}</p>
                            <button
                              onClick={handleCopyEmail}
                              className="p-1.5 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                              title="Copy email"
                            >
                              {copiedEmail ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground flex items-center gap-1">
                            <Key className="w-3 h-3" /> Password
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-foreground font-mono text-xs flex-1 min-w-0 truncate">
                              {user.password ? (user.password.length > 20 ? `${user.password.substring(0, 20)}...` : user.password) : 'N/A'}
                            </p>
                            {user.password && (
                              <button
                                onClick={handleCopyPassword}
                                className="p-1.5 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                                title="Copy password"
                              >
                                {copiedPassword ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Registration Date
                          </label>
                          <p className="text-foreground font-medium mt-1">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Phone</label>
                          <p className="text-foreground font-medium mt-1">{user.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Verification Link</label>
                          <p className="text-foreground font-medium mt-1 break-all">{user.verificationLink || <span className="text-muted-foreground italic">Empty</span>}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">User ID</label>
                          <p className="text-foreground font-mono text-sm mt-1 break-all">{user._id}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Updated At
                          </label>
                          <p className="text-foreground font-medium mt-1">
                            {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Account Information Tab */}
                <TabsContent value="account" className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Account Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Balance</label>
                          <p className="text-foreground font-medium mt-1">${user.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Tier</label>
                          <p className="text-foreground font-medium mt-1">Tier {user.tier || 1}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Admin Status</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.isAdmin ? (
                              <span className="text-green-400">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Sub-Admin Role</label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-foreground font-medium">
                              {user.isSubAdmin ? (
                                <span className="text-blue-400 font-bold flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> YES
                                </span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </p>
                            <button
                              onClick={toggleSubAdmin}
                              disabled={isUpdating}
                              className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                            >
                              {isUpdating ? '...' : 'Toggle'}
                            </button>
                          </div>
                        </div>
                        {!user.isSubAdmin && (
                          <div>
                            <label className="text-sm text-muted-foreground">Managed By (Sub-Admin)</label>
                            <div className="flex items-center gap-2 mt-1">
                              <select
                                value={selectedManagedBy || "none"}
                                onChange={(e) => updateAssignment(e.target.value === "none" ? null : e.target.value)}
                                disabled={isUpdating || loadingSubadmins}
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                              >
                                <option value="none" className="bg-[#0f0f0f]">Main Admin</option>
                                {subadmins.map((sa) => (
                                  <option key={sa._id} value={sa._id} className="bg-[#0f0f0f]">
                                    {sa.name}
                                  </option>
                                ))}
                              </select>
                              {loadingSubadmins && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm text-muted-foreground">Assigned Template</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.levelTemplate || 'A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Wallet Verified</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.walletVerified ? (
                              <span className="text-green-400">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Wallet Information Tab */}
                <TabsContent value="wallet" className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Wallet Addresses
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Bitcoin (BTC)</label>
                          <p className="text-foreground font-mono text-sm break-all mt-1 bg-background/50 p-2 rounded border border-white/10">
                            {user.wallets?.btc || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Ethereum (ETH)</label>
                          <p className="text-foreground font-mono text-sm break-all mt-1 bg-background/50 p-2 rounded border border-white/10">
                            {user.wallets?.eth || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">TRON</label>
                          <p className="text-foreground font-mono text-sm break-all mt-1 bg-background/50 p-2 rounded border border-white/10">
                            {user.wallets?.tron || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">USDT (ERC20)</label>
                          <p className="text-foreground font-mono text-sm break-all mt-1 bg-background/50 p-2 rounded border border-white/10">
                            {user.wallets?.usdtErc20 || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Company Details Tab */}
                <TabsContent value="company" className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5" /> Company Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Company Name</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyName || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Registration Number</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyRegistrationNumber || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-muted-foreground">Address</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyAddress || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">City</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyCity || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">State/Province</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyState || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Country</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyCountry || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Postal Code</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyPostalCode || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Tax ID</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.companyDetails?.companyTaxId || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Banking Details Tab */}
                <TabsContent value="banking" className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Banking Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Bank Name</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.bankName || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Account Holder Name</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.accountHolderName || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Account Number</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.accountNumber || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Routing Number</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.routingNumber || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">SWIFT Code</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.swiftCode || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">IBAN</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.iban || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-muted-foreground">Bank Address</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.bankAddress || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Bank City</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.bankCity || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Bank Country</label>
                          <p className="text-foreground font-medium mt-1">
                            {user.bankingDetails?.bankCountry || <span className="text-muted-foreground italic">Empty</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsPopup;
export type { FullUserData };

