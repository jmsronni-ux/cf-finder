import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Search, X, User, Mail, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';
import { toast } from 'sonner';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";

interface UserData {
    _id: string;
    name: string;
    email: string;
    createdAt?: string;
}

const PAGE_SIZE = 20;

const AdminUserList: React.FC = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const totalResults = totalCount || users.length;
    const isInitialLoading = loading && users.length === 0;

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
            // Using the admin endpoint to ensure we get all users and it's robust
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

    // Check if user is admin
    if (!user?.isAdmin) {
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
            <div id="admin-user-list" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
            <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
                <MaxWidthWrapper>
                    <div className="pt-20 pb-20">
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                            <div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                                    Manage <br /> <span className="text-transparent bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text">
                                        Users
                                    </span>
                                </h1>
                                <p className="text-muted-foreground mt-4">View and delete users (Admin Only)</p>
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
                                        className="w-full pl-10 pr-10 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    <User className="w-4 h-4 text-red-400" />
                                    <span className="text-sm text-muted-foreground">
                                        Total Users: <span className="text-foreground font-semibold">{totalResults}</span>
                                    </span>
                                </div>
                                {users.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Search className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm text-muted-foreground">
                                            Loaded: <span className="text-foreground font-semibold">{users.length}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-10 mb-6">
                            <MagicBadge title="All Users" />
                        </div>

                        {/* Users Table */}
                        {isInitialLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
                            <div className="overflow-auto rounded-xl border border-border">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    Name
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" />
                                                    Email
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Date
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user._id} className="border-b border-border hover:bg-background/50 transition-colors">
                                                <td className="px-6 py-3 font-semibold text-foreground">{user.name}</td>
                                                <td className="px-6 py-3 text-muted-foreground">{user.email}</td>
                                                <td className="px-6 py-3 text-muted-foreground text-sm">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <Button
                                                        onClick={() => setUserToDelete(user)}
                                                        size="sm"
                                                        variant="destructive"
                                                        className="bg-red-600/20 hover:bg-red-600/40 text-red-500 hover:text-red-400 border border-red-600/50"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div ref={loadMoreRef} />
                                {isFetchingMore && (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </MaxWidthWrapper>
            </div>

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

export default AdminUserList;
