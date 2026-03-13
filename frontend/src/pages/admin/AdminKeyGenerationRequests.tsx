import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  KeyRound,
  DollarSign,
  User,
  Timer,
  CalendarClock,
  Ban
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';

interface ScheduledActionInfo {
  _id: string;
  actionType: 'approve' | 'reject';
  nodeStatusOutcome: 'success' | 'fail';
  approvedAmount: number | null;
  executeAt: string;
  scheduledBy: string;
}

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
  scheduledAction?: ScheduledActionInfo;
}

const DELAY_OPTIONS = [
  { value: 'now', label: 'Now' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'custom', label: 'Custom' },
];

function getExecuteAt(delayValue: string, customDate?: string): Date | null {
  const now = new Date();
  switch (delayValue) {
    case 'now': return null;
    case '30m': return new Date(now.getTime() + 30 * 60 * 1000);
    case '1h': return new Date(now.getTime() + 60 * 60 * 1000);
    case '6h': return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'custom': return customDate ? new Date(customDate) : null;
    default: return null;
  }
}

function formatCountdown(executeAt: string): string {
  const diff = new Date(executeAt).getTime() - Date.now();
  if (diff <= 0) return 'Executing soon...';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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
  const [delaySelections, setDelaySelections] = useState<Record<string, string>>({});
  const [customDates, setCustomDates] = useState<Record<string, string>>({});

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

  // Update countdown timer every minute
  useEffect(() => {
    const hasScheduled = requests.some(r => r.scheduledAction);
    if (!hasScheduled) return;

    const interval = setInterval(() => {
      setRequests(prev => [...prev]); // Force re-render to update countdowns
    }, 60000);

    return () => clearInterval(interval);
  }, [requests]);

  const handleAction = async (id: string, actionType: 'approve', outcome: 'success' | 'fail') => {
    const amount = parseFloat(approvalAmounts[id] || '0');
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid approval amount');
      return;
    }

    const delay = delaySelections[id] || 'now';

    if (delay !== 'now') {
      // Schedule the action
      const executeAt = getExecuteAt(delay, customDates[id]);
      if (!executeAt || executeAt <= new Date()) {
        toast.error('Please select a valid future date/time');
        return;
      }
      await handleSchedule(id, actionType, outcome, amount, executeAt);
      return;
    }

    // Immediate execution
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
    const delay = delaySelections[id] || 'now';

    if (delay !== 'now') {
      const executeAt = getExecuteAt(delay, customDates[id]);
      if (!executeAt || executeAt <= new Date()) {
        toast.error('Please select a valid future date/time');
        return;
      }
      await handleSchedule(id, 'reject', 'fail', 0, executeAt);
      return;
    }

    // Immediate execution
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

  const handleSchedule = async (
    requestId: string,
    actionType: 'approve' | 'reject',
    outcome: 'success' | 'fail',
    amount: number,
    executeAt: Date
  ) => {
    setProcessingId(requestId);
    try {
      const res = await apiFetch(`/key-generation/admin/${requestId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          actionType,
          nodeStatusOutcome: outcome,
          approvedAmount: amount,
          adminComment: adminComments[requestId] || '',
          executeAt: executeAt.toISOString()
        })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`${actionType === 'approve' ? 'Approval' : 'Rejection'} scheduled for ${executeAt.toLocaleString()}`);
        // Reset delay selection
        setDelaySelections(prev => ({ ...prev, [requestId]: 'now' }));
        setCustomDates(prev => ({ ...prev, [requestId]: '' }));
        fetchRequests();
      } else {
        toast.error(json?.message || 'Scheduling failed');
      }
    } catch (e) {
      toast.error('Scheduling failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelScheduled = async (scheduledActionId: string) => {
    setProcessingId(scheduledActionId);
    try {
      const res = await apiFetch(`/key-generation/admin/scheduled/${scheduledActionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Scheduled action cancelled');
        fetchRequests();
      } else {
        toast.error(json?.message || 'Cancel failed');
      }
    } catch (e) {
      toast.error('Cancel failed');
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

                          {/* Scheduled Action Badge */}
                          {request.scheduledAction && (
                            <div className="mt-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <CalendarClock className="w-4 h-4 text-purple-400" />
                                <div>
                                  <p className="text-purple-300 text-sm font-semibold">
                                    Scheduled: {request.scheduledAction.actionType === 'approve' ? `Approve (${request.scheduledAction.nodeStatusOutcome})` : 'Reject'}
                                    {request.scheduledAction.actionType === 'approve' && request.scheduledAction.approvedAmount !== null && (
                                      <span className="text-purple-400 ml-1">— ${request.scheduledAction.approvedAmount}</span>
                                    )}
                                  </p>
                                  <p className="text-purple-400/70 text-xs">
                                    Fires in {formatCountdown(request.scheduledAction.executeAt)} · {new Date(request.scheduledAction.executeAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleCancelScheduled(request.scheduledAction!._id)}
                                disabled={processingId === request.scheduledAction._id}
                                variant="outline"
                                size="sm"
                                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs shrink-0"
                              >
                                {processingId === request.scheduledAction._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <><Ban className="w-3 h-3 mr-1" /> Cancel</>
                                )}
                              </Button>
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

                            {/* Delay Selector */}
                            <div>
                              <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Delay
                              </label>
                              <Select
                                value={delaySelections[request._id] || 'now'}
                                onValueChange={(val) => setDelaySelections(prev => ({ ...prev, [request._id]: val }))}
                              >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DELAY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Custom Date Picker */}
                            {(delaySelections[request._id] === 'custom') && (
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Execute At</label>
                                <Input
                                  type="datetime-local"
                                  value={customDates[request._id] || ''}
                                  onChange={(e) => setCustomDates(prev => ({ ...prev, [request._id]: e.target.value }))}
                                  className="bg-white/5 border-white/10 text-white text-xs"
                                />
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAction(request._id, 'approve', 'success')}
                                disabled={processingId === request._id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {(delaySelections[request._id] && delaySelections[request._id] !== 'now') ? 'Schedule' : ''} Approve (Success)
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleAction(request._id, 'approve', 'fail')}
                                disabled={processingId === request._id}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs px-2"
                              >
                                {processingId === request._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {(delaySelections[request._id] && delaySelections[request._id] !== 'now') ? 'Schedule' : ''} Approve (Fail)
                                  </>
                                )}
                              </Button>
                            </div>
                            <Button
                              onClick={() => handleReject(request._id)}
                              disabled={processingId === request._id}
                              variant="outline"
                              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              {(delaySelections[request._id] && delaySelections[request._id] !== 'now') ? 'Schedule ' : ''}Reject Request
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
