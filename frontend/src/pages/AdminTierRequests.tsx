import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, DollarSign, User, Mail, Trophy, Calendar, Loader2, ArrowLeft, Search, X, UserRoundSearch, Wallet } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import { apiFetch } from '../utils/api';

interface TierRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
  };
  requestedTier: number;
  currentTier: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  adminNote?: string;
}

const TIER_NAMES: { [key: number]: string } = {
  1: 'Basic',
  2: 'Standard',
  3: 'Professional',
  4: 'Enterprise',
  5: 'Premium'
};

const AdminTierRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TierRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all' 
        ? '/tier-request/admin/all' 
        : `/tier-request/admin/all?status=${filter}`;
      
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(data.data.requests);
      } else {
        toast.error(data.message || 'Failed to fetch tier requests');
      }
    } catch (error) {
      console.error('Error fetching tier requests:', error);
      toast.error('An error occurred while fetching tier requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/tier-request/admin/approve/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote: adminNotes[requestId] || '' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Tier upgrade request approved successfully!');
        fetchRequests();
        // Clear the admin note for this request
        setAdminNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[requestId];
          return newNotes;
        });
      } else {
        toast.error(data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('An error occurred while approving the request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/tier-request/admin/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote: adminNotes[requestId] || 'Request rejected by admin' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Tier upgrade request rejected');
        fetchRequests();
        // Clear the admin note for this request
        setAdminNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[requestId];
          return newNotes;
        });
      } else {
        toast.error(data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('An error occurred while rejecting the request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      request.userId.name.toLowerCase().includes(query) ||
      request.userId.email.toLowerCase().includes(query) ||
      request._id.toLowerCase().includes(query)
    );
  });

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
      <div id="admin-tier-requests" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Tier Upgrade <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Requests
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and approve user tier upgrade requests</p>
              </div>
              <div className="flex flex-col flex-wrap gap-2">
                <Button onClick={() => navigate('/profile')} className="text-white bg-transparent flex items-center gap-2 border border-border py-1 px-4 rounded-md hover:bg-border/50">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={() => navigate('/admin/topup-requests')} className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600">
                  <DollarSign size={16} />
                  Top-Up Requests
                </Button>
                <Button onClick={() => navigate('/admin/withdraw-requests')} className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600">
                  <Wallet size={16} />
                  Withdraw Requests
                </Button>
                <Button onClick={() => navigate('/admin/tier-requests')} className="bg-blue-600/50 hover:bg-blue-700 text-white flex items-center gap-2 border border-blue-600">
                  <Trophy size={16} />
                  Tier Requests
                </Button>
                <Button onClick={() => navigate('/admin/user-rewards')} className="bg-purple-600/50 hover:bg-purple-700 text-white flex items-center gap-2 border border-purple-600">
                  <UserRoundSearch size={16} />
                  User Management
                </Button>
              </div>
            </div>

            <MagicBadge title="Filter & Search" className="mb-6"/>

            {/* Filter Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or request ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    All ({requests.length})
                  </Button>
                  <Button
                    onClick={() => setFilter('pending')}
                    variant={filter === 'pending' ? 'primary' : 'outline'}
                    className={filter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  >
                    Pending
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
                    Total Requests: <span className="text-foreground font-semibold">{requests.length}</span>
                  </span>
                </div>
                {searchQuery && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Filtered: <span className="text-foreground font-semibold">{filteredRequests.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <MagicBadge title="Tier Requests" className="mt-10 mb-6"/>

            {/* Requests List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No requests match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No tier requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredRequests.map((request) => (
                  <Card key={request._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Request Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">{request.userId.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Mail size={14} />
                                {request.userId.email}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            className={
                              request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                              request.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/50' :
                              'bg-red-500/20 text-red-500 border border-red-500/50'
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Tier Upgrade Info */}
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-400">Current Tier</p>
                              <p className="font-bold">Tier {request.currentTier} - {TIER_NAMES[request.currentTier]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-gray-400">Requested Tier</p>
                              <p className="font-bold text-purple-400">Tier {request.requestedTier} - {TIER_NAMES[request.requestedTier]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-400">Requested</p>
                              <p className="font-bold text-sm">{new Date(request.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>

                        {/* User Balance */}
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-400">User Balance:</span>
                            <span className="font-bold text-green-400">${request.userId.balance.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Admin Note (for processed requests) */}
                        {request.status !== 'pending' && request.adminNote && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-gray-400 mb-1">Admin Note:</p>
                            <p className="text-sm text-gray-300">{request.adminNote}</p>
                            {request.reviewedBy && (
                              <p className="text-xs text-gray-500 mt-1">
                                Reviewed by {request.reviewedBy.name} on {new Date(request.reviewedAt!).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Admin Actions (only for pending requests) */}
                        {request.status === 'pending' && (
                          <div className="pt-3 border-t border-border space-y-3">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Admin Note (optional)</label>
                              <Textarea
                                placeholder="Add a note about this request..."
                                value={adminNotes[request._id] || ''}
                                onChange={(e) => setAdminNotes(prev => ({ ...prev, [request._id]: e.target.value }))}
                                className="bg-background/50 border-border text-foreground min-h-[60px]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApprove(request._id)}
                                disabled={processingId === request._id}
                                className="flex-1 bg-green-600/50 hover:bg-green-700 text-white flex items-center justify-center gap-2 border border-green-600"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReject(request._id)}
                                disabled={processingId === request._id}
                                className="flex-1 bg-red-600/50 hover:bg-red-700 text-white flex items-center justify-center gap-2 border border-red-600"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
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

export default AdminTierRequests;

