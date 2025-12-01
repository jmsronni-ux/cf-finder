import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';
import { toast } from 'sonner';

interface UserData {
  _id: string;
  name: string;
  email: string;
  password: string;
}

const PAGE_SIZE = 20;

const AdminUserPasswords: React.FC = () => {
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

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

  // Infinite scroll for pagination
  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const observer = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
        fetchUsers(page + 1, true);
      }
    });
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [fetchUsers, hasMore, isFetchingMore, page]);

  return (
    <div className="flex gap-8">
      <div className="w-72"><AdminNavigation /></div>
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>User Passwords (Admin Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-72"
              />
              <span className="text-sm text-gray-400">{totalCount} users</span>
            </div>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="min-w-full bg-black/90">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user._id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-semibold">{user.name}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-break-spaces">{user.password}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} style={{ height: 1 }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUserPasswords;

