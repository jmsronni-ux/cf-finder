import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { CheckCircle, XCircle, DollarSign, User, Mail, Wallet, Trophy, Calendar, Loader2, ArrowLeft, Search, X, UserRoundSearch } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';

interface TopupRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
    phone?: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  notes?: string;
}

const AdminTopupRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TopupRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all' 
        ? '/topup-request/all' 
        : `/topup-request/all?status=${filter}`;
      
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('An error occurred while fetching requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/topup-request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Top-up request approved successfully!');
        fetchRequests(); // Refresh the list
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
    const notes = prompt('Enter rejection reason (optional):');
    
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/topup-request/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Top-up request rejected');
        fetchRequests(); // Refresh the list
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

  // Filter requests based on search query
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div id="admin-topup" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Top-Up <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Management
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and process user top-up requests</p>
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

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-border pb-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-500/20 text-blue-500 border-b-2 border-blue-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'pending' 
                    ? 'bg-yellow-500/20 text-yellow-500 border-b-2 border-yellow-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'approved' 
                    ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  filter === 'rejected' 
                    ? 'bg-red-500/20 text-red-500 border-b-2 border-red-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rejected
              </button>
            </div>

            {/* Search Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
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
              <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
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

            <MagicBadge title="Requests" className="mt-10 mb-6"/>

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
                  <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredRequests.map((request) => (
                  <Card key={request._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                    <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-transparent border border-border flex items-center justify-center">
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
                        {getStatusBadge(request.status)}
                      </div>

                      {/* User Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-yellow-500" />
                          <div>
                            <p className="text-xs text-gray-400">Requested</p>
                            <p className="font-bold text-green-400">${request.amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-400">Current Balance</p>
                            <p className="font-bold">${request.userId.balance}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-400">Tier Level</p>
                            <p className="font-bold">Tier {request.userId.tier}</p>
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

                      {request.processedAt && (
                        <div className="text-xs text-gray-500 pt-2">
                          Processed on {new Date(request.processedAt).toLocaleString()}
                          {request.processedBy && ` by ${request.processedBy.name}`}
                        </div>
                      )}

                      {request.notes && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                          <p className="text-sm text-red-400"><strong>Note:</strong> {request.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(request._id)}
                          disabled={processingId === request._id}
                          className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600"
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
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
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

export default AdminTopupRequests;


