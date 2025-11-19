import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import MagicBadge from '../components/ui/magic-badge';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';
import { toast } from 'sonner';
import { ShieldAlert, Users, Mail, Search, User, Loader2, LogIn } from 'lucide-react';

interface UserSummary {
  _id: string;
  name: string;
  email: string;
  tier?: number;
  isAdmin?: boolean;
  createdAt?: string;
}

const AdminUserImpersonation: React.FC = () => {
  const { user, token, impersonateUserAccount } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await apiFetch('/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.data || []);
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users for impersonation:', error);
      toast.error('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleImpersonate = async (target: UserSummary) => {
    if (!target?._id) return;
    setImpersonatingId(target._id);
    const success = await impersonateUserAccount(target._id);
    if (!success) {
      setImpersonatingId(null);
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <div
        id="admin-user-impersonation"
        className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20"
      />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  User <br />
                  <span className="text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text">
                    Impersonation
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">
                  Quickly access any user account to reproduce issues or provide support.
                </p>
              </div>
            </div>

            <AdminNavigation />

            <MagicBadge title="Security Notice" className="mb-4" />
            <Card className="border border-amber-500/40 bg-amber-500/5 mb-8">
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="mt-1">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-amber-100 font-semibold">
                    Only use impersonation for troubleshooting or support. All actions are performed
                    as the selected user.
                  </p>
                  <p className="text-xs text-amber-200/80">
                    You will immediately switch into the user’s account. Keep a separate browser or
                    token if you need to return to the admin view afterwards.
                  </p>
                </div>
              </CardContent>
            </Card>

            <MagicBadge title="Search Users" className="mb-4" />
            <Card className="border border-border mb-6">
              <CardContent className="p-4">
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-border"
                  />
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center text-muted-foreground">
                <p>No users match your search.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((u) => (
                  <Card
                    key={u._id}
                    className="border border-border rounded-xl bg-background/60 hover:border-purple-500/50 transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-white/5">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-lg font-semibold text-foreground">{u.name}</p>
                              {typeof u.tier === 'number' && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                                  Tier {u.tier}
                                </Badge>
                              )}
                              {u.isAdmin && (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/40">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail size={14} />
                              <span>{u.email}</span>
                            </div>
                            {u.createdAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Joined {new Date(u.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleImpersonate(u)}
                          disabled={impersonatingId === u._id}
                          className="bg-indigo-600/60 hover:bg-indigo-700 text-white border border-indigo-600 flex items-center gap-2"
                        >
                          {impersonatingId === u._id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Switching...
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4" />
                              Log in as user
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};

export default AdminUserImpersonation;



