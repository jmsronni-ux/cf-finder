import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  KeyRound,
  DollarSign,
  User
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';

interface KeyGenRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    tier: number;
  };
  level: number;
  nodeId?: string;
  nodeAmount?: number;
  keysCount: number;
  directAccessKeyPrice: number;
  totalCost: number;
  status: 'pending' | 'approved' | 'rejected';
  nodeStatus?: 'pending' | 'success' | 'fail';
  approvedAmount: number | null;
  adminComment: string;
  createdAt: string;
  processedAt: string | null;
}

const AdminKeyGenerationRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<KeyGenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvalAmounts, setApprovalAmounts] = useState<Record<string, string>>({});
  const [adminComments, setAdminComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied');
      navigate('/profile');
    }
  }, [user, navigate]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await apiFetch(`/key-generation/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setRequests(json.data.requests || []);
      }
    } catch (e) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string, outcome: 'success' | 'fail' = 'success') => {
    const amount = parseFloat(approvalAmounts[id] || '0');
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid approval amount');
      return;
    }

    setProcessingId(id);
    try {
      const res = await apiFetch(`/key-generation/admin/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          approvedAmount: amount,
          adminComment: adminComments[id] || '',
          nodeStatusOutcome: outcome
        })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`Approved $${amount} and marked Node as ${outcome.toUpperCase()}`);
        fetchRequests();
      } else {
        toast.error(json?.message || 'Approval failed');
      }
    } catch (e) {
      toast.error('Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/key-generation/admin/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminComment: adminComments[id] || '' })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Request rejected and cost refunded');
        fetchRequests();
      } else {
        toast.error(json?.message || 'Rejection failed');
      }
    } catch (e) {
      toast.error('Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/15 text-green-500 border border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/15 text-red-500 border border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const getNodeStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-400 font-semibold text-xs ml-2">(Node: Pending)</span>;
      case 'success':
        return <span className="text-green-400 font-semibold text-xs ml-2">(Node: Success)</span>;
      case 'fail':
        return <span className="text-red-400 font-semibold text-xs ml-2">(Node: Fail)</span>;
      default:
        return null;
    }
  };

  if (!user?.isAdmin) return null;

  return (
    <>
      <div className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Key Generation <br /> <span className="text-transparent bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text">
                    Requests
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage Direct Access Key generation requests</p>
              </div>
            </div>

            <AdminNavigation />

            <MagicBadge title="Key Requests" className="mb-6" />

            {/* Status Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${statusFilter === status
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Requests List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <Card className="border border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No {statusFilter !== 'all' ? statusFilter : ''} key generation requests found.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map(request => (
                  <Card key={request._id} className="border border-border">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-orange-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{request.userId?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{request.userId?.email || ''}</p>
                            </div>
                            {getStatusBadge(request.status)}
                            {request.nodeStatus && getNodeStatusBadge(request.nodeStatus)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-2 flex flex-col items-start justify-center">
                              <span className="text-gray-500 text-xs">Node</span>
                              <p className="text-white font-mono text-[10px] break-all max-w-[100px] truncate" title={request.nodeId}>{request.nodeId || 'N/A'}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500 text-xs">Amount</span>
                              <p className="text-white font-semibold">${request.nodeAmount || 0}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500 text-xs">Keys</span>
                              <p className="text-orange-400 font-semibold flex items-center gap-1">
                                <KeyRound className="w-3 h-3" /> {request.keysCount}
                              </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500 text-xs">Price/Key</span>
                              <p className="text-white font-semibold">${request.directAccessKeyPrice}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <span className="text-gray-500 text-xs">Total Cost</span>
                              <p className="text-green-400 font-semibold">${request.totalCost.toFixed(2)}</p>
                            </div>
                          </div>

                          {request.approvedAmount !== null && request.approvedAmount !== undefined && (
                            <div className="mt-2 bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-sm">
                              <span className="text-green-400 font-semibold">Approved Amount: ${request.approvedAmount}</span>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {/* Admin Actions (only for pending) */}
                        {request.status === 'pending' && (
                          <div className="flex flex-col gap-2 min-w-[280px]">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Approve Amount ($)</label>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="Amount to credit"
                                value={approvalAmounts[request._id] || ''}
                                onChange={(e) => setApprovalAmounts(prev => ({ ...prev, [request._id]: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Comment (optional)</label>
                              <Input
                                type="text"
                                placeholder="Admin note"
                                value={adminComments[request._id] || ''}
                                onChange={(e) => setAdminComments(prev => ({ ...prev, [request._id]: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApprove(request._id, 'success')}
                                disabled={processingId === request._id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><CheckCircle className="w-3 h-3 mr-1" /> Approve (Success)</>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleApprove(request._id, 'fail')}
                                disabled={processingId === request._id}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs px-2"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" /> Approve (Fail)</>
                                )}
                              </Button>
                            </div>
                            <Button
                              onClick={() => handleReject(request._id)}
                              disabled={processingId === request._id}
                              variant="outline"
                              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject Request
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

export default AdminKeyGenerationRequests;
