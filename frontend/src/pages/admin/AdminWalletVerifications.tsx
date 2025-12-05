import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { 
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  Wallet,
  RefreshCw,
  Trophy,
  X
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';
import { WalletVerificationRequest } from '../../types/wallet-verification';
import WalletVerificationModal from '../../components/WalletVerificationModal';

const AdminWalletVerifications: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const PAGE_SIZE = 20;
  const [requests, setRequests] = useState<WalletVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WalletVerificationRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

  const fetchRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token || !user?.isAdmin) return;

    if (append) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
      setHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (filter !== 'all') {
        params.set('status', filter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/wallet-verification?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const payload = data.data || {};
        const incomingRequests: WalletVerificationRequest[] = payload.requests || data.requests || [];
        const pagination = payload.pagination || data.pagination;

        setRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setTotalCount(prevTotal => {
          if (pagination && typeof pagination.totalItems === 'number') {
            return pagination.totalItems;
          }
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const totalPages = pagination?.totalPages ?? pagination?.pages;
        const hasMoreResults = totalPages
          ? requestedPage < Math.max(totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;

        setHasMore(hasMoreResults);
        setPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch verification requests');
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('An error occurred while fetching verification requests');
    } finally {
      if (append) {
        setIsFetchingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [PAGE_SIZE, token, filter, debouncedSearch, user?.isAdmin]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    setRequests([]);
    setPage(1);
    setHasMore(true);
    setTotalCount(0);
    fetchRequests(1, false);
  }, [user?.isAdmin, filter, debouncedSearch, fetchRequests]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || isLoading || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry?.isIntersecting && !isFetchingMore) {
        fetchRequests(page + 1, true);
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isFetchingMore, fetchRequests, page]);

  const handleRequestClick = async (request: WalletVerificationRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedRequest(null);
    fetchRequests(1, false); // Refresh list after modal closes
  };

  const totalResults = totalCount || requests.length;
  const isInitialLoading = isLoading && requests.length === 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'btc':
        return 'text-orange-500';
      case 'eth':
        return 'text-blue-500';
      case 'tron':
        return 'text-red-500';
      case 'usdtErc20':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <>
      <div id="admin-wallet-verifications" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Wallet <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">Verification Requests</span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and approve user wallet verification requests</p>
              </div>
              <Button
                onClick={() => fetchRequests(1, false)}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                  <Input
                    type="text"
                    placeholder="Search by name, email, or wallet address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setFilter('all')}
                    variant={filter === 'all' ? 'primary' : 'outline'}
                    className={filter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                  >
                    All ({totalResults})
                  </Button>
                  <Button
                    onClick={() => setFilter('pending')}
                    variant={filter === 'pending' ? 'primary' : 'outline'}
                    className={filter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  >
                    Pending {requests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
                        {requests.filter(r => r.status === 'pending').length}
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={() => setFilter('approved')}
                    variant={filter === 'approved' ? 'primary' : 'outline'}
                    className={filter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Approved
                  </Button>
                  <Button
                    onClick={() => setFilter('rejected')}
                    variant={filter === 'rejected' ? 'primary' : 'outline'}
                    className={filter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Rejected
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Requests: <span className="text-foreground font-semibold">{totalResults}</span>
                  </span>
                </div>
                {requests.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Loaded: <span className="text-foreground font-semibold">{requests.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <MagicBadge title="Wallet Verification Requests" className="mt-10 mb-6" />

            {/* Requests List */}
            {isInitialLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : requests.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No requests match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No verification requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {requests.map((request) => {
                  const userId = request.userId as any;
                  return (
                    <Card key={request._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => handleRequestClick(request)}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Request Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                                <Shield className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">{userId?.name || 'Unknown User'}</h3>
                                <div className="text-sm text-gray-400">{userId?.email || 'No email'}</div>
                              </div>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>

                          {/* Wallet Info */}
                          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Wallet className={`w-4 h-4 ${getWalletTypeColor(request.walletType)}`} />
                              <div>
                                <p className="text-xs text-gray-400">Wallet Type</p>
                                <p className={`font-bold ${getWalletTypeColor(request.walletType)}`}>{request.walletType.toUpperCase()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-purple-500" />
                              <div>
                                <p className="text-xs text-gray-400">Address</p>
                                <p className="font-bold text-sm font-mono">
                                  {request.walletAddress.substring(0, 10)}...{request.walletAddress.substring(request.walletAddress.length - 10)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-400">Requested</p>
                                <p className="font-bold text-sm">{new Date(request.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Blockchain Data */}
                          {request.blockchainData && (
                            <div className="pt-3 border-t border-border">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Balance: <span className="text-foreground font-semibold">{request.blockchainData.balance.toFixed(6)}</span></span>
                                <span>Transactions: <span className="text-foreground font-semibold">{request.blockchainData.transactionCount}</span></span>
                              </div>
                            </div>
                          )}

                          {/* Review Button */}
                          <div className="pt-3 border-t border-border">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestClick(request);
                              }}
                              className="w-full bg-purple-600/50 hover:bg-purple-700 text-white flex items-center justify-center gap-2 border border-purple-600"
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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

      {/* Verification Modal */}
      {showModal && selectedRequest && (
        <WalletVerificationModal
          isOpen={showModal}
          onClose={handleModalClose}
          request={selectedRequest}
          token={token || ''}
        />
      )}
    </>
  );
};

export default AdminWalletVerifications;
