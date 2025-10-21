import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, User, Mail, Phone, Calendar, Loader2, Search, X, UserPlus, Trash2 } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';

interface RegistrationRequestData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  rejectionReason?: string;
}

const AdminRegistrationRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RegistrationRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    } else {
      fetchRequests();
    }
  }, [filter, user, navigate]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all' 
        ? '/registration-request' 
        : `/registration-request?status=${filter}`;
      
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
        toast.error(data.message || 'Failed to fetch registration requests');
      }
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast.error('An error occurred while fetching registration requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/registration-request/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Registration request approved! User account created successfully.');
        fetchRequests();
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
    const reason = rejectionReasons[requestId] || 'No reason provided';
    
    if (!rejectionReasons[requestId]?.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/registration-request/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Registration request rejected');
        fetchRequests();
        // Clear the rejection reason for this request
        setRejectionReasons(prev => {
          const newReasons = { ...prev };
          delete newReasons[requestId];
          return newReasons;
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

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this registration request? This action cannot be undone.')) {
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/registration-request/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Registration request deleted successfully');
        fetchRequests();
      } else {
        toast.error(data.message || 'Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('An error occurred while deleting the request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      request.name.toLowerCase().includes(query) ||
      request.email.toLowerCase().includes(query) ||
      request.phone.toLowerCase().includes(query) ||
      request._id.toLowerCase().includes(query)
    );
  });

  if (!user?.isAdmin) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <>
      <div id="admin-registration-requests" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Registration <br/> <span className="text-transparent bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text">
                    Requests
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and approve new user registration requests</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Registration Requests" className="mb-6" />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-3xl font-bold text-blue-400">{requests.length}</p>
                    </div>
                    <UserPlus className="w-10 h-10 text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-yellow-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-3xl font-bold text-green-400">{approvedCount}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-3xl font-bold text-red-400">{rejectedCount}</p>
                    </div>
                    <XCircle className="w-10 h-10 text-red-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setFilter('all')}
                      variant={filter === 'all' ? 'primary' : 'outline'}
                      size="sm"
                    >
                      All ({requests.length})
                    </Button>
                    <Button
                      onClick={() => setFilter('pending')}
                      variant={filter === 'pending' ? 'primary' : 'outline'}
                      size="sm"
                      className={filter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      Pending ({pendingCount})
                    </Button>
                    <Button
                      onClick={() => setFilter('approved')}
                      variant={filter === 'approved' ? 'primary' : 'outline'}
                      size="sm"
                      className={filter === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      Approved ({approvedCount})
                    </Button>
                    <Button
                      onClick={() => setFilter('rejected')}
                      variant={filter === 'rejected' ? 'primary' : 'outline'}
                      size="sm"
                      className={filter === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
                    >
                      Rejected ({rejectedCount})
                    </Button>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-80 text-foreground"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requests List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <UserPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-xl text-muted-foreground">
                    {searchQuery ? 'No registration requests match your search' : 
                     filter === 'pending' ? 'No pending registration requests' :
                     filter === 'approved' ? 'No approved registration requests' :
                     filter === 'rejected' ? 'No rejected registration requests' :
                     'No registration requests found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request._id} className="border-border/50 hover:border-border transition-all">
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: User Info */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-foreground">{request.name}</h3>
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  <span>{request.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  <span>{request.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Submitted: {new Date(request.createdAt).toLocaleString()}</span>
                                </div>
                                {request.reviewedAt && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Reviewed: {new Date(request.reviewedAt).toLocaleString()}</span>
                                  </div>
                                )}
                                {request.reviewedBy && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>Reviewed by: {request.reviewedBy.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Rejection Reason Display */}
                          {request.status === 'rejected' && request.rejectionReason && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                              <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-muted-foreground">{request.rejectionReason}</p>
                            </div>
                          )}

                          {/* Rejection Reason Input (for pending requests) */}
                          {request.status === 'pending' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                Rejection Reason (optional)
                              </label>
                              <Textarea
                                placeholder="Provide a reason if rejecting this request..."
                                value={rejectionReasons[request._id] || ''}
                                onChange={(e) => setRejectionReasons(prev => ({
                                  ...prev,
                                  [request._id]: e.target.value
                                }))}
                                className="min-h-[80px]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        {request.status === 'pending' && (
                          <div className="flex lg:flex-col gap-3 lg:w-40">
                            <Button
                              onClick={() => handleApprove(request._id)}
                              disabled={processingId === request._id}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingId === request._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleReject(request._id)}
                              disabled={processingId === request._id}
                              variant="outline"
                              className="flex-1 border-red-500/50 hover:bg-red-500/20 text-red-400"
                            >
                              {processingId === request._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Delete button for non-pending requests */}
                        {request.status !== 'pending' && (
                          <div className="flex lg:flex-col gap-3 lg:w-40">
                            <Button
                              onClick={() => handleDelete(request._id)}
                              disabled={processingId === request._id}
                              variant="outline"
                              className="flex-1 border-red-500/50 hover:bg-red-500/20 text-red-400"
                            >
                              {processingId === request._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </>
                              )}
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

export default AdminRegistrationRequests;

