import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, Search, X, User, LogIn, Download, Trash2, AlertTriangle, Info, Trophy, Crown, Building2, Users, ShieldCheck } from 'lucide-react';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';
import { toast } from 'sonner';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import UserDetailsPopup, { FullUserData } from "../../components/admin/UserDetailsPopup";
import UserRewardsPopup from "../../components/admin/UserRewardsPopup";
import UserTierPopup from "../../components/admin/UserTierPopup";
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface UserData {
  _id: string;
  name: string;
  email: string;
  password: string;
  tier?: number;
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  managedBy?: string | null;
  levelTemplate?: string;
  createdAt?: string;
}


const PAGE_SIZE = 20;

const AdminUserPasswords: React.FC = () => {
  const { user, token, impersonateUserAccount } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FullUserData | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [selectedUserForRewards, setSelectedUserForRewards] = useState<string | null>(null);
  const [showRewardsPopup, setShowRewardsPopup] = useState(false);
  const [selectedUserForTier, setSelectedUserForTier] = useState<string | null>(null);
  const [showTierPopup, setShowTierPopup] = useState(false);
  const [subadmins, setSubadmins] = useState<UserData[]>([]);
  const [loadingSubadmins, setLoadingSubadmins] = useState(false);
  const [templates, setTemplates] = useState<string[]>(['A']);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const totalResults = totalCount || users.length;
  const isInitialLoading = loading && users.length === 0;

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

  const getTierIcon = (tier: number) => {
    if (tier >= 4) return '👑';
    if (tier >= 2) return '⭐';
    return '🔹';
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchUsers = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (append) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
      setHasMore(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      const response = await apiFetch(`/user/admin/users-with-passwords?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const incomingUsers: UserData[] = data.data || [];
        const pagination = data.pagination || {};
        setUsers(prev => append ? [...prev, ...incomingUsers] : incomingUsers);
        setTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingUsers.length;
        });
        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingUsers.length === PAGE_SIZE;
        setHasMore(hasMoreResults);
        setPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('An error occurred while fetching users');
    } finally {
      if (append) {
        setIsFetchingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [token, debouncedSearch]);

  useEffect(() => {
    fetchUsers(1, false);
  }, [debouncedSearch, fetchUsers]);

  // Fetch Subadmins for assignment
  useEffect(() => {
    const fetchSubadmins = async () => {
      if (!token || !user?.isAdmin) return;
      setLoadingSubadmins(true);
      try {
        const res = await apiFetch('/user/admin/users-with-passwords?role=subadmin', {
          headers: { Authorization: `Bearer ${token}` }
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

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await apiFetch('/level/templates');
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data || ['A']);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchSubadmins();
    fetchTemplates();
  }, [token, user?.isAdmin]);

  const handleUpdateRole = async (userId: string, isSubAdmin: boolean) => {
    if (!token || !user?.isAdmin) return;
    setUpdatingId(userId);
    try {
      const response = await apiFetch(`/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isSubAdmin }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`User role updated to ${isSubAdmin ? 'Sub-Admin' : 'Normal User'}`);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isSubAdmin } : u));
        // Refresh subadmins list if we promoted/demoted someone
        if (isSubAdmin) {
          const promotedUser = users.find(u => u._id === userId);
          if (promotedUser) setSubadmins(prev => [...prev, { ...promotedUser, isSubAdmin: true }]);
        } else {
          setSubadmins(prev => prev.filter(sa => sa._id !== userId));
        }
      } else {
        toast.error(data.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('An error occurred while updating role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateTemplate = async (userId: string, levelTemplate: string) => {
    if (!token || !user?.isAdmin) return;
    setUpdatingId(userId);
    try {
      const response = await apiFetch(`/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ levelTemplate }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`User template updated to ${levelTemplate}`);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, levelTemplate } : u));
      } else {
        toast.error(data.message || 'Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('An error occurred while updating template');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateAssignment = async (userId: string, managedBy: string | null) => {
    if (!token || !user?.isAdmin) return;
    setUpdatingId(userId);
    try {
      const response = await apiFetch(`/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ managedBy: managedBy || null }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('User assignment updated successfully');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, managedBy } : u));
      } else {
        toast.error(data.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('An error occurred while updating assignment');
    } finally {
      setUpdatingId(null);
    }
  };

  // Infinite scroll for pagination
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || loading || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry?.isIntersecting && !isFetchingMore) {
        fetchUsers(page + 1, true);
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, isFetchingMore, fetchUsers, page]);

  const handleImpersonate = async (targetUser: UserData) => {
    if (!targetUser?._id) return;
    setImpersonatingId(targetUser._id);
    const success = await impersonateUserAccount(targetUser._id);
    if (!success) {
      setImpersonatingId(null);
    }
  };

  const convertToCSV = (data: UserData[]): string => {
    // CSV header
    const headers = ['Name', 'Email', 'Password', 'Registration Date'];
    const csvRows = [headers.join(',')];

    // CSV rows
    data.forEach((user) => {
      const registrationDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : '';
      const row = [
        `"${user.name.replace(/"/g, '""')}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        `"${user.password.replace(/"/g, '""')}"`,
        `"${registrationDate.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setIsDownloading(true);
    try {
      // Fetch all users without pagination
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000'); // Large limit to get all users
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/user/admin/users-with-passwords?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const allUsers: UserData[] = data.data || [];

        if (allUsers.length === 0) {
          toast.error('No users to download');
          return;
        }

        // Convert to CSV
        const csvContent = convertToCSV(allUsers);

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `user-passwords-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Downloaded ${allUsers.length} users as CSV`);
      } else {
        toast.error(data.message || 'Failed to fetch users for download');
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('An error occurred while downloading CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !token) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/user/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`User ${userToDelete.name} deleted successfully`);
        // Remove from list
        setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
        setTotalCount(prev => Math.max(0, prev - 1));
        setUserToDelete(null);
      } else {
        toast.error(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('An error occurred while deleting user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewUserDetails = async (userId: string) => {
    if (!token) return;

    // Find user from the current list to get password
    const userFromList = users.find(u => u._id === userId);

    setLoadingUserDetails(true);
    try {
      const response = await apiFetch(`/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Merge password from the list if available
        const userData = {
          ...data.data,
          password: userFromList?.password
        };
        setSelectedUser(userData);
      } else {
        toast.error(data.message || 'Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('An error occurred while fetching user details');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Check if user is admin or sub-admin
  if (!user?.isAdmin && !user?.isSubAdmin) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center">
        <Card className="border-red-500/50 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page. Admin privileges required.</p>
            <Button onClick={() => navigate('/profile')} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div id="admin-user-passwords" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Manage <br /> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Users
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">View passwords, login as users, and delete users (Admin Only)</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Filter & Search" className="mb-6" />

            {/* Filter Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Users: <span className="text-foreground font-semibold">{totalResults}</span>
                  </span>
                </div>
                {users.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Loaded: <span className="text-foreground font-semibold">{users.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-10 mb-6">
              <MagicBadge title="All Users" />
              {users.length > 0 && (
                <Button
                  onClick={downloadCSV}
                  disabled={isDownloading}
                  className="bg-green-600/60 hover:bg-green-700 text-white border border-green-600 flex items-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download CSV
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Users Table */}
            {isInitialLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchTerm ? (
                  <>
                    <p className="text-muted-foreground mb-2">No users match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No users found</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-[10%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <ShieldCheck className="w-4 h-4" />
                          Sub-Admin
                        </div>
                      </th>
                      <th className="w-[24%] px-3 py-3 text-left text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Name / Role
                        </div>
                      </th>
                      <th className="w-[10%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <Building2 className="w-4 h-4" />
                          Template
                        </div>
                      </th>
                      <th className="w-[16%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <Users className="w-4 h-4" />
                          Managed By
                        </div>
                      </th>
                      <th className="w-[10%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <Crown className="w-4 h-4" />
                          Level
                        </div>
                      </th>
                      <th className="w-[10%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <Trophy className="w-4 h-4" />
                          Rewards
                        </div>
                      </th>
                      <th className="w-[12%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2 justify-center">
                          <LogIn className="w-4 h-4" />
                          Login
                        </div>
                      </th>
                      <th className="w-[8%] px-3 py-3 text-center text-sm font-semibold text-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-border hover:bg-background/50 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              onClick={() => handleViewUserDetails(user._id)}
                              size="icon"
                              variant="ghost"
                              className="hover:bg-blue-600/20 text-blue-500 hover:text-blue-400 h-8 w-8"
                              title="View details"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            {user.isAdmin ? (
                              <div className="w-8 h-4" /> // Placeholder
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Switch
                                  checked={user.isSubAdmin}
                                  disabled={updatingId === user._id}
                                  onCheckedChange={(val) => handleUpdateRole(user._id, val)}
                                  className="scale-75 data-[state=checked]:bg-blue-600"
                                />
                                <span className="text-[9px] text-gray-500 font-medium">
                                  {user.isSubAdmin ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-foreground truncate" title={`${user.name} (${user.email})`}>
                          <div className="flex flex-col">
                            <span className="truncate">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate opacity-70 italic">{user.email}</span>
                            <div className="flex gap-1 mt-0.5">
                              {user.isAdmin && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded font-bold border border-purple-500/30">MASTER ADMIN</span>}
                              {user.isSubAdmin && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded font-bold border border-blue-500/30">SUB-ADMIN</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <Select
                              value={user.levelTemplate || "A"}
                              onValueChange={(val) => handleUpdateTemplate(user._id, val)}
                              disabled={updatingId === user._id}
                            >
                              <SelectTrigger className="w-[80px] h-8 bg-white/5 border-white/10 text-[10px] focus:ring-1 focus:ring-blue-500">
                                <SelectValue placeholder="Temp" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0f0f0f] border-white/10 text-white min-w-[120px]">
                                {templates.map((t) => (
                                  <SelectItem key={t} value={t} className="focus:bg-blue-600/20">
                                    <span className="text-xs font-semibold">Template {t}</span>
                                  </SelectItem>
                                ))}
                                {loadingTemplates && (
                                  <div className="flex items-center justify-center p-2">
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {user.isAdmin || user.isSubAdmin ? (
                            <span className="text-[10px] text-muted-foreground italic opacity-50">N/A</span>
                          ) : (
                            <div className="flex justify-center">
                              <Select
                                value={user.managedBy || "none"}
                                onValueChange={(val) => handleUpdateAssignment(user._id, val === "none" ? null : val)}
                                disabled={updatingId === user._id}
                              >
                                <SelectTrigger className="w-[170px] h-8 bg-white/5 border-white/10 text-[10px] focus:ring-1 focus:ring-blue-500">
                                  <SelectValue placeholder="Assign Sub-Admin" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0f0f0f] border-white/10 text-white min-w-[200px]">
                                  <SelectItem value="none">
                                    <span className="text-gray-500 italic">No Sub-Admin (Main)</span>
                                  </SelectItem>
                                  {subadmins.map((sa) => (
                                    <SelectItem key={sa._id} value={sa._id} className="focus:bg-blue-600/20">
                                      <div className="flex flex-col items-start py-0.5">
                                        <span className="text-xs font-semibold">{sa.name}</span>
                                        <span className="text-[9px] text-gray-500">{sa.email}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                  {loadingSubadmins && (
                                    <div className="flex items-center justify-center p-2">
                                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {user.tier !== undefined ? (
                            <Badge
                              className={`${getTierBadgeColor(user.tier)} cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={() => {
                                setSelectedUserForTier(user._id);
                                setShowTierPopup(true);
                              }}
                              title="Click to manage user level"
                            >
                              Level {user.tier}
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => {
                                setSelectedUserForTier(user._id);
                                setShowTierPopup(true);
                              }}
                              size="icon"
                              variant="ghost"
                              className="hover:bg-yellow-600/20 text-yellow-500 hover:text-yellow-400"
                              title="Manage user level"
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            onClick={() => {
                              setSelectedUserForRewards(user._id);
                              setShowRewardsPopup(true);
                            }}
                            size="icon"
                            variant="ghost"
                            className="hover:bg-purple-600/20 text-purple-500 hover:text-purple-400"
                            title="Manage user rewards"
                          >
                            <Trophy className="w-4 h-4" />
                          </Button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            onClick={() => handleImpersonate(user)}
                            disabled={impersonatingId === user._id}
                            size="sm"
                            className="bg-indigo-600/60 hover:bg-indigo-700 text-white border border-indigo-600 inline-flex items-center gap-1.5 text-xs px-2 py-1"
                          >
                            {impersonatingId === user._id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="hidden sm:inline">Switching...</span>
                              </>
                            ) : (
                              <>
                                <LogIn className="w-3 h-3" />
                                <span className="hidden sm:inline">Login</span>
                              </>
                            )}
                          </Button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <Button
                              onClick={() => setUserToDelete(user)}
                              disabled={!user?.isAdmin} // Only main admins can delete users
                              size="icon"
                              variant="destructive"
                              className="bg-red-600/20 hover:bg-red-600/40 text-red-500 hover:text-red-400 border border-red-600/50 h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div ref={loadMoreRef} />
                {isFetchingMore && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>

      <UserDetailsPopup
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        loading={loadingUserDetails}
      />

      <UserRewardsPopup
        isOpen={showRewardsPopup}
        onClose={() => {
          setShowRewardsPopup(false);
          setSelectedUserForRewards(null);
        }}
        userId={selectedUserForRewards || ''}
        userName={users.find(u => u._id === selectedUserForRewards)?.name || ''}
      />

      <UserTierPopup
        isOpen={showTierPopup}
        onClose={() => {
          setShowTierPopup(false);
          setSelectedUserForTier(null);
        }}
        userId={selectedUserForTier || ''}
        userName={users.find(u => u._id === selectedUserForTier)?.name || ''}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
              <br /><br />
              <span className="text-red-500 font-semibold">This action cannot be undone.</span> The user and all their data will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUser();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminUserPasswords;




