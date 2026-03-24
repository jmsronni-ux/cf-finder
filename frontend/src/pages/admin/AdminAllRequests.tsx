import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Search,
  X,
  UserPlus,
  Trash2,
  Clock,
  Trophy,
  DollarSign,
  Wallet,
  Coins,
  Copy,
  Check,
  Users,
  KeyRound,
  Timer,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';
import ApproveRegistrationDialog from '../../components/admin/ApproveRegistrationDialog';

// Type definitions
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
  isSubAdmin?: boolean;
  managedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string | null;
}

interface TierRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
    managedBy?: string | null;
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

interface TopupRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
    phone?: string;
    managedBy?: string | null;
  } | null;
  amount: number;
  cryptocurrency?: 'BTC' | 'USDT' | 'ETH' | 'BCY' | 'BETH';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  notes?: string;
  approvedAmount?: number;
  // Payment gateway fields (detecting = under/over payment, needs manual review)
  paymentSessionId?: string;
  paymentStatus?: 'pending' | 'detected' | 'confirming' | 'confirmed' | 'completed' | 'detecting' | 'expired' | 'failed';
  confirmations?: number;
  requiredConfirmations?: number;
  paymentExpiresAt?: string;
  txHash?: string;
  paymentAddress?: string;
}

interface WithdrawRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    tier: number;
    phone?: string;
    managedBy?: string | null;
  };
  amount: number;
  walletAddress: string;
  confirmedWallet?: string;
  confirmedAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  notes?: string;
  networks?: string[];
  networkRewards?: { [network: string]: number };
  withdrawAll?: boolean;
  commissionPaid?: number;
  isDirectBalanceWithdraw?: boolean;
  addToBalance?: boolean;
  networkRewardsAddedToBalance?: number;
}

interface ScheduledActionInfo {
  _id: string;
  actionType: 'approve' | 'reject';
  nodeStatusOutcome: string;
  approvedAmount: number | null;
  executeAt: string;
  scheduledBy: string;
}

interface KeyGenRequestData {
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
  nodeStatus?: 'pending' | 'success' | 'fail' | 'partial success' | 'cold wallet' | 'reported';
  approvedAmount: number | null;
  adminComment: string;
  createdAt: string;
  processedAt: string | null;
  scheduledAction?: ScheduledActionInfo;
}

interface KeyGenGroup {
  userId: string;
  userName: string;
  userEmail: string;
  userTier: number;
  requests: KeyGenRequestData[];
  totalKeys: number;
  totalCost: number;
  statusSummary: { pending: number; approved: number; rejected: number };
  latestDate: string;
}

interface TransferRequestData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    balance: number;
    availableBalance: number;
    tier: number;
  } | null;
  amount: number;
  feeMode: 'percent' | 'fixed';
  feeValue: number;
  feeAmount: number;
  netAmount: number;
  direction: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  processedAt?: string;
  createdAt: string;
}

type UnifiedRequest =
  | { type: 'registration'; data: RegistrationRequestData }
  | { type: 'tier'; data: TierRequestData }
  | { type: 'topup'; data: TopupRequestData }
  | { type: 'withdraw'; data: WithdrawRequestData }
  | { type: 'keygen-group'; data: KeyGenGroup }
  | { type: 'transfer'; data: TransferRequestData };

const PAGE_SIZE = 20;
const TIER_NAMES: { [key: number]: string } = {
  1: 'Basic',
  2: 'Standard',
  3: 'Professional',
  4: 'Enterprise',
  5: 'Premium'
};

const NETWORKS = [
  { key: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
  { key: 'TRON', name: 'TRON', icon: 'T', color: 'text-red-500' },
  { key: 'USDT', name: 'Tether', icon: '$', color: 'text-green-500' },
  { key: 'BNB', name: 'Binance Coin', icon: 'B', color: 'text-yellow-500' },
  { key: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-500' }
];


function formatDelayMinutes(mins: number): string {
  if (mins === 0) return 'Now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getKeygenExecuteAtFromMinutes(mins: number): Date | null {
  if (mins === 0) return null;
  return new Date(Date.now() + mins * 60 * 1000);
}

function formatCountdown(executeAt: string): string {
  const diff = new Date(executeAt).getTime() - Date.now();
  if (diff <= 0) return 'Executing soon...';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const AdminAllRequests: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // State for each request type
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequestData[]>([]);
  const [tierRequests, setTierRequests] = useState<TierRequestData[]>([]);
  const [topupRequests, setTopupRequests] = useState<TopupRequestData[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequestData[]>([]);
  const [keygenRequests, setKeygenRequests] = useState<KeyGenRequestData[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequestData[]>([]);

  // Loading states
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);
  const [isLoadingTier, setIsLoadingTier] = useState(true);
  const [isLoadingTopup, setIsLoadingTopup] = useState(true);
  const [isLoadingWithdraw, setIsLoadingWithdraw] = useState(true);
  const [isLoadingKeygen, setIsLoadingKeygen] = useState(true);
  const [isLoadingTransfer, setIsLoadingTransfer] = useState(true);

  // Fetching more states
  const [isFetchingMoreRegistration, setIsFetchingMoreRegistration] = useState(false);
  const [isFetchingMoreTier, setIsFetchingMoreTier] = useState(false);
  const [isFetchingMoreTopup, setIsFetchingMoreTopup] = useState(false);
  const [isFetchingMoreWithdraw, setIsFetchingMoreWithdraw] = useState(false);
  const [isFetchingMoreKeygen, setIsFetchingMoreKeygen] = useState(false);
  const [isFetchingMoreTransfer, setIsFetchingMoreTransfer] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'registration' | 'tier' | 'topup' | 'withdraw' | 'keygen' | 'transfer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [registrationPage, setRegistrationPage] = useState(1);
  const [tierPage, setTierPage] = useState(1);
  const [topupPage, setTopupPage] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [keygenPage, setKeygenPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);

  const [registrationHasMore, setRegistrationHasMore] = useState(true);
  const [tierHasMore, setTierHasMore] = useState(true);
  const [topupHasMore, setTopupHasMore] = useState(true);
  const [withdrawHasMore, setWithdrawHasMore] = useState(true);
  const [keygenHasMore, setKeygenHasMore] = useState(true);
  const [transferHasMore, setTransferHasMore] = useState(true);

  const [registrationTotalCount, setRegistrationTotalCount] = useState(0);
  const [tierTotalCount, setTierTotalCount] = useState(0);
  const [topupTotalCount, setTopupTotalCount] = useState(0);
  const [withdrawTotalCount, setWithdrawTotalCount] = useState(0);
  const [keygenTotalCount, setKeygenTotalCount] = useState(0);
  const [transferTotalCount, setTransferTotalCount] = useState(0);

  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form states
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  // customAmounts state - used for manual approval of timed-out topup requests
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [confirmedWallet, setConfirmedWallet] = useState<{ [key: string]: string }>({});
  const [confirmedAmount, setConfirmedAmount] = useState<{ [key: string]: string }>({});
  const [selectedCrypto, setSelectedCrypto] = useState<{ [key: string]: 'BTC' | 'USDT' | 'ETH' }>({});
  const [globalWalletAddresses, setGlobalWalletAddresses] = useState<{ btc: string; usdt: string; eth: string }>({
    btc: '',
    usdt: '',
    eth: ''
  });
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);
  const [subadmins, setSubadmins] = useState<any[]>([]);
  const [loadingSubadmins, setLoadingSubadmins] = useState(false);

  // Rejection dialog state
  const [rejectionDialog, setRejectionDialog] = useState<{ requestId: string; type: 'registration' | 'tier' } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [approveDialog, setApproveDialog] = useState<{
    isOpen: boolean;
    requestId: string;
    requestName: string;
    requestEmail: string;
    initialIsSubAdmin?: boolean;
    initialManagedBy?: string | null;
  } | null>(null);

  // Keygen-specific admin states
  const [keygenApprovalAmounts, setKeygenApprovalAmounts] = useState<Record<string, string>>({});
  const [keygenAdminComments, setKeygenAdminComments] = useState<Record<string, string>>({});
  const [keygenDelaySelections, setKeygenDelaySelections] = useState<Record<string, number>>({});
  const [keygenOutcomeSelections, setKeygenOutcomeSelections] = useState<Record<string, string>>({});

  const [expandedKeygenGroups, setExpandedKeygenGroups] = useState<Set<string>>(new Set());

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Admin check
  useEffect(() => {
    if (!user?.isAdmin && !user?.isSubAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

  // Fetch global wallet addresses
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const response = await apiFetch('/global-settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (response.ok && data.success && data.data) {
          setGlobalWalletAddresses({
            btc: data.data.btcAddress || '',
            usdt: data.data.usdtAddress || '',
            eth: data.data.ethAddress || ''
          });
        }
      } catch (error) {
        console.error('[Admin Panel] Error fetching global settings:', error);
      }
    };

    fetchGlobalSettings();
  }, []);

  // Fetch Subadmins for assignment
  useEffect(() => {
    const fetchSubadmins = async () => {
      if (!token || !user?.isAdmin) return;
      setLoadingSubadmins(true);
      try {
        const res = await apiFetch('/user?role=subadmin', {
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
    fetchSubadmins();
  }, [token, user?.isAdmin]);

  // Initialize pending withdraw requests with selected crypto
  useEffect(() => {
    if (withdrawRequests.length > 0 && Object.keys(globalWalletAddresses).some(key => globalWalletAddresses[key as 'btc' | 'usdt' | 'eth'])) {
      const updates: { [key: string]: 'BTC' | 'USDT' | 'ETH' } = {};
      const walletUpdates: { [key: string]: string } = {};

      withdrawRequests.forEach(request => {
        if (request.status === 'pending') {
          if (!selectedCrypto[request._id]) {
            updates[request._id] = 'BTC';
          }
          const crypto = selectedCrypto[request._id] || updates[request._id] || 'BTC';
          const walletAddress = globalWalletAddresses[crypto.toLowerCase() as 'btc' | 'usdt' | 'eth'];
          if (walletAddress && !confirmedWallet[request._id]) {
            walletUpdates[request._id] = walletAddress;
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        setSelectedCrypto(prev => ({ ...prev, ...updates }));
      }
      if (Object.keys(walletUpdates).length > 0) {
        setConfirmedWallet(prev => ({ ...prev, ...walletUpdates }));
      }
    }
  }, [withdrawRequests.length]);

  // Fetch Registration Requests
  const fetchRegistrationRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token || (!user?.isAdmin && !user?.isSubAdmin)) return;
    if (typeFilter !== 'all' && typeFilter !== 'registration') return;

    if (append) {
      setIsFetchingMoreRegistration(true);
    } else {
      setIsLoadingRegistration(true);
      setRegistrationHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/registration-request?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const incomingRequests: RegistrationRequestData[] = data.data || [];
        const pagination = data.pagination || data.data?.pagination;

        setRegistrationRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setRegistrationTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          if (pagination && typeof pagination.totalItems === 'number') {
            return pagination.totalItems;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const totalPages = pagination?.totalPages ?? pagination?.pages;
        const hasMoreResults = totalPages
          ? requestedPage < Math.max(totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;

        setRegistrationHasMore(hasMoreResults);
        setRegistrationPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch registration requests');
      }
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast.error('An error occurred while fetching registration requests');
    } finally {
      if (append) {
        setIsFetchingMoreRegistration(false);
      } else {
        setIsLoadingRegistration(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, user?.isAdmin, user?.isSubAdmin, typeFilter]);

  // Fetch Tier Requests
  const fetchTierRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (typeFilter !== 'all' && typeFilter !== 'tier') return;

    if (append) {
      setIsFetchingMoreTier(true);
    } else {
      setIsLoadingTier(true);
      setTierHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/tier-request/admin/all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const payload = data.data || {};
        const incomingRequests: TierRequestData[] = payload.requests || [];
        const pagination = payload.pagination || data.pagination;

        setTierRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        if (!append) {
          setAdminNotes(prevNotes => {
            const nextNotes: { [key: string]: string } = {};
            incomingRequests.forEach(request => {
              if (prevNotes[request._id]) {
                nextNotes[request._id] = prevNotes[request._id];
              }
            });
            return nextNotes;
          });
        }

        setTierTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;
        setTierHasMore(hasMoreResults);
        setTierPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch tier requests');
      }
    } catch (error) {
      console.error('Error fetching tier requests:', error);
      toast.error('An error occurred while fetching tier requests');
    } finally {
      if (append) {
        setIsFetchingMoreTier(false);
      } else {
        setIsLoadingTier(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, typeFilter]);

  // Fetch Topup Requests
  const fetchTopupRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (typeFilter !== 'all' && typeFilter !== 'topup') return;

    if (append) {
      setIsFetchingMoreTopup(true);
    } else {
      setIsLoadingTopup(true);
      setTopupHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/topup-request/all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const incomingRequests: TopupRequestData[] = data.data || [];
        const pagination = data.pagination || data.data?.pagination;
        setTopupRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setTopupTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;
        setTopupHasMore(hasMoreResults);
        setTopupPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch topup requests');
      }
    } catch (error) {
      console.error('Error fetching topup requests:', error);
      toast.error('An error occurred while fetching topup requests');
    } finally {
      if (append) {
        setIsFetchingMoreTopup(false);
      } else {
        setIsLoadingTopup(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, typeFilter]);

  // Fetch Withdraw Requests
  const fetchWithdrawRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (typeFilter !== 'all' && typeFilter !== 'withdraw') return;

    if (append) {
      setIsFetchingMoreWithdraw(true);
    } else {
      setIsLoadingWithdraw(true);
      setWithdrawHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/withdraw-request/all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const incomingRequests: WithdrawRequestData[] = data.data || [];
        const pagination = data.pagination || data.data?.pagination;

        setWithdrawRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setWithdrawTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;

        setWithdrawHasMore(hasMoreResults);
        setWithdrawPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch withdraw requests');
      }
    } catch (error) {
      console.error('[Admin Panel] Error fetching requests:', error);
      toast.error('An error occurred while fetching requests');
    } finally {
      if (append) {
        setIsFetchingMoreWithdraw(false);
      } else {
        setIsLoadingWithdraw(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, typeFilter]);

  // Fetch Keygen Requests
  const fetchKeygenRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (typeFilter !== 'all' && typeFilter !== 'keygen') return;

    if (append) {
      setIsFetchingMoreKeygen(true);
    } else {
      setIsLoadingKeygen(true);
      setKeygenHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(requestedPage));

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const res = await apiFetch(`/key-generation/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        const incomingRequests: KeyGenRequestData[] = json.data.requests || [];
        const pagination = json.data.pagination || json.pagination;

        setKeygenRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setKeygenTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') return pagination.total;
          return append ? prevTotal : incomingRequests.length;
        });

        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;
        setKeygenHasMore(hasMoreResults);
        setKeygenPage(requestedPage);
      }
    } catch (e) {
      toast.error('Failed to fetch key generation requests');
    } finally {
      if (append) {
        setIsFetchingMoreKeygen(false);
      } else {
        setIsLoadingKeygen(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, typeFilter]);

  // Fetch Transfer Requests
  const fetchTransferRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token) return;
    if (typeFilter !== 'all' && typeFilter !== 'transfer') return;

    if (append) {
      setIsFetchingMoreTransfer(true);
    } else {
      setIsLoadingTransfer(true);
      setTransferHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/transfer-request/all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const incomingRequests: TransferRequestData[] = data.data || [];
        const pagination = data.pagination;

        setTransferRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setTransferTotalCount(prevTotal => {
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const hasMoreResults = pagination && typeof pagination.totalPages === 'number'
          ? requestedPage < Math.max(pagination.totalPages, 1)
          : incomingRequests.length === PAGE_SIZE;
        setTransferHasMore(hasMoreResults);
        setTransferPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch transfer requests');
      }
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      toast.error('An error occurred while fetching transfer requests');
    } finally {
      if (append) {
        setIsFetchingMoreTransfer(false);
      } else {
        setIsLoadingTransfer(false);
      }
    }
  }, [PAGE_SIZE, token, statusFilter, debouncedSearch, typeFilter]);

  // Keygen countdown timer
  useEffect(() => {
    const hasScheduled = keygenRequests.some(r => r.scheduledAction);
    if (!hasScheduled) return;
    const interval = setInterval(() => {
      setKeygenRequests(prev => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, [keygenRequests]);

  // Keygen Action Handlers
  const handleKeygenAction = async (id: string, nodeAmount?: number) => {
    const outcome = keygenOutcomeSelections[id] || 'success';
    const isFail = outcome === 'fail';
    const isPartial = outcome === 'partial success';
    const isSuccess = outcome === 'success';

    let amount = 0;
    if (isFail) {
      amount = 0;
    } else if (isPartial) {
      amount = parseFloat(keygenApprovalAmounts[id] || '0');
      if (isNaN(amount) || amount <= 0) {
        toast.error('Enter a valid partial amount');
        return;
      }
    } else {
      // success, cold wallet, reported — use full node amount
      amount = nodeAmount ?? 0;
    }

    const actionType = isFail ? 'reject' : 'approve';
    const delayMins = keygenDelaySelections[id] || 0;

    if (delayMins > 0) {
      const executeAt = getKeygenExecuteAtFromMinutes(delayMins);
      if (!executeAt) {
        toast.error('Invalid delay');
        return;
      }
      await handleKeygenSchedule(id, actionType, outcome, amount, executeAt);
      return;
    }

    setProcessingId(id);
    try {
      const endpoint = isFail ? 'reject' : 'approve';
      const res = await apiFetch(`/key-generation/admin/${id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          approvedAmount: amount,
          adminComment: keygenAdminComments[id] || '',
          nodeStatusOutcome: outcome
        })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`Node marked as ${outcome.toUpperCase()}${isPartial ? ` ($${amount})` : isSuccess ? ` ($${amount})` : ''}`);
        fetchKeygenRequests(1, false);
      } else {
        toast.error(json?.message || 'Action failed');
      }
    } catch (e) {
      toast.error('Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleKeygenReject = async (id: string) => {
    const delayMins = keygenDelaySelections[id] || 0;

    if (delayMins > 0) {
      const executeAt = getKeygenExecuteAtFromMinutes(delayMins);
      if (!executeAt) {
        toast.error('Invalid delay');
        return;
      }
      await handleKeygenSchedule(id, 'reject', 'fail', 0, executeAt);
      return;
    }

    setProcessingId(id);
    try {
      const res = await apiFetch(`/key-generation/admin/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminComment: keygenAdminComments[id] || '' })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Request rejected and cost refunded');
        fetchKeygenRequests(1, false);
      } else {
        toast.error(json?.message || 'Rejection failed');
      }
    } catch (e) {
      toast.error('Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleKeygenSchedule = async (
    requestId: string,
    actionType: 'approve' | 'reject',
    outcome: string,
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
          adminComment: keygenAdminComments[requestId] || '',
          executeAt: executeAt.toISOString()
        })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(`${actionType === 'approve' ? 'Approval' : 'Rejection'} scheduled for ${executeAt.toLocaleString()}`);
        setKeygenDelaySelections(prev => ({ ...prev, [requestId]: 0 }));
        fetchKeygenRequests(1, false);
      } else {
        toast.error(json?.message || 'Scheduling failed');
      }
    } catch (e) {
      toast.error('Scheduling failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleKeygenCancelScheduled = async (scheduledActionId: string) => {
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
        fetchKeygenRequests(1, false);
      } else {
        toast.error(json?.message || 'Cancel failed');
      }
    } catch (e) {
      toast.error('Cancel failed');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleKeygenGroup = (userId: string) => {
    setExpandedKeygenGroups(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Transfer approve/reject handlers
  const handleTransferApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/transfer-request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Transfer request approved!');
        if (typeFilter === 'all' || typeFilter === 'transfer') {
          fetchTransferRequests(1, false);
        }
      } else {
        toast.error(data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
      toast.error('An error occurred while approving the request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleTransferReject = async (requestId: string) => {
    const notes = prompt('Enter rejection reason (optional):');

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/transfer-request/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote: notes || '' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Transfer request rejected, funds refunded');
        if (typeFilter === 'all' || typeFilter === 'transfer') {
          fetchTransferRequests(1, false);
        }
      } else {
        toast.error(data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast.error('An error occurred while rejecting the request');
    } finally {
      setProcessingId(null);
    }
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    if (!user?.isAdmin && !user?.isSubAdmin) return;

    // Reset and fetch based on type filter
    if (typeFilter === 'all' || typeFilter === 'registration') {
      setRegistrationRequests([]);
      setRegistrationPage(1);
      setRegistrationHasMore(true);
      setRegistrationTotalCount(0);
      fetchRegistrationRequests(1, false);
    }

    if (typeFilter === 'all' || typeFilter === 'tier') {
      setTierRequests([]);
      setTierPage(1);
      setTierHasMore(true);
      setTierTotalCount(0);
      fetchTierRequests(1, false);
    }

    if (typeFilter === 'all' || typeFilter === 'topup') {
      setTopupRequests([]);
      setTopupPage(1);
      setTopupHasMore(true);
      setTopupTotalCount(0);
      fetchTopupRequests(1, false);
    }

    if (typeFilter === 'all' || typeFilter === 'withdraw') {
      setWithdrawRequests([]);
      setWithdrawPage(1);
      setWithdrawHasMore(true);
      setWithdrawTotalCount(0);
      fetchWithdrawRequests(1, false);
    }

    if (typeFilter === 'all' || typeFilter === 'keygen') {
      setKeygenRequests([]);
      setKeygenPage(1);
      setKeygenHasMore(true);
      setKeygenTotalCount(0);
      fetchKeygenRequests(1, false);
    }

    if (typeFilter === 'all' || typeFilter === 'transfer') {
      setTransferRequests([]);
      setTransferPage(1);
      setTransferHasMore(true);
      setTransferTotalCount(0);
      fetchTransferRequests(1, false);
    }
  }, [user?.isAdmin, user?.isSubAdmin, typeFilter, statusFilter, debouncedSearch, fetchRegistrationRequests, fetchTierRequests, fetchTopupRequests, fetchWithdrawRequests, fetchKeygenRequests, fetchTransferRequests]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry?.isIntersecting) {
        if (typeFilter === 'all' || typeFilter === 'registration') {
          if (!isLoadingRegistration && registrationHasMore && !isFetchingMoreRegistration) {
            fetchRegistrationRequests(registrationPage + 1, true);
          }
        }
        if (typeFilter === 'all' || typeFilter === 'tier') {
          if (!isLoadingTier && tierHasMore && !isFetchingMoreTier) {
            fetchTierRequests(tierPage + 1, true);
          }
        }
        if (typeFilter === 'all' || typeFilter === 'topup') {
          if (!isLoadingTopup && topupHasMore && !isFetchingMoreTopup) {
            fetchTopupRequests(topupPage + 1, true);
          }
        }
        if (typeFilter === 'all' || typeFilter === 'withdraw') {
          if (!isLoadingWithdraw && withdrawHasMore && !isFetchingMoreWithdraw) {
            fetchWithdrawRequests(withdrawPage + 1, true);
          }
        }
        if (typeFilter === 'all' || typeFilter === 'keygen') {
          if (!isLoadingKeygen && keygenHasMore && !isFetchingMoreKeygen) {
            fetchKeygenRequests(keygenPage + 1, true);
          }
        }
        if (typeFilter === 'all' || typeFilter === 'transfer') {
          if (!isLoadingTransfer && transferHasMore && !isFetchingMoreTransfer) {
            fetchTransferRequests(transferPage + 1, true);
          }
        }
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    typeFilter,
    isLoadingRegistration,
    isLoadingTier,
    isLoadingTopup,
    isLoadingWithdraw,
    isLoadingKeygen,
    registrationHasMore,
    tierHasMore,
    topupHasMore,
    withdrawHasMore,
    keygenHasMore,
    isFetchingMoreRegistration,
    isFetchingMoreTier,
    isFetchingMoreTopup,
    isFetchingMoreWithdraw,
    isFetchingMoreKeygen,
    registrationPage,
    tierPage,
    topupPage,
    withdrawPage,
    keygenPage,
    fetchRegistrationRequests,
    fetchTierRequests,
    fetchTopupRequests,
    fetchWithdrawRequests,
    fetchKeygenRequests,
    fetchTransferRequests,
    isLoadingTransfer,
    transferHasMore,
    isFetchingMoreTransfer,
    transferPage
  ]);

  // Get unified requests
  const getUnifiedRequests = (): UnifiedRequest[] => {
    const requests: UnifiedRequest[] = [];

    if (typeFilter === 'all' || typeFilter === 'registration') {
      registrationRequests.forEach(req => {
        requests.push({ type: 'registration', data: req });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'tier') {
      tierRequests.forEach(req => {
        requests.push({ type: 'tier', data: req });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'topup') {
      topupRequests.forEach(req => {
        requests.push({ type: 'topup', data: req });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'withdraw') {
      withdrawRequests.forEach(req => {
        requests.push({ type: 'withdraw', data: req });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'transfer') {
      transferRequests.forEach(req => {
        requests.push({ type: 'transfer', data: req });
      });
    }

    // Group keygen requests by user
    if (typeFilter === 'all' || typeFilter === 'keygen') {
      const groupMap = new Map<string, KeyGenRequestData[]>();
      keygenRequests.forEach(req => {
        const uid = req.userId?._id || 'unknown';
        if (!groupMap.has(uid)) groupMap.set(uid, []);
        groupMap.get(uid)!.push(req);
      });

      groupMap.forEach((reqs, uid) => {
        const sorted = [...reqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const first = sorted[0];
        const statusSummary = { pending: 0, approved: 0, rejected: 0 };
        let totalKeys = 0;
        let totalCost = 0;
        sorted.forEach(r => {
          statusSummary[r.status]++;
          totalKeys += r.keysCount;
          totalCost += r.totalCost;
        });

        requests.push({
          type: 'keygen-group',
          data: {
            userId: uid,
            userName: first.userId?.name || 'Unknown',
            userEmail: first.userId?.email || '',
            userTier: first.userId?.tier || 0,
            requests: sorted,
            totalKeys,
            totalCost,
            statusSummary,
            latestDate: sorted[0].createdAt,
          }
        });
      });
    }

    // Sort by creation date (newest first)
    return requests.sort((a, b) => {
      const getDate = (r: UnifiedRequest) => {
        if (r.type === 'keygen-group') return new Date(r.data.latestDate).getTime();
        return new Date(r.data.createdAt).getTime();
      };
      return getDate(b) - getDate(a);
    });
  };

  const unifiedRequests = getUnifiedRequests();
  const totalResults =
    (typeFilter === 'all' || typeFilter === 'registration' ? registrationTotalCount : 0) +
    (typeFilter === 'all' || typeFilter === 'tier' ? tierTotalCount : 0) +
    (typeFilter === 'all' || typeFilter === 'topup' ? topupTotalCount : 0) +
    (typeFilter === 'all' || typeFilter === 'withdraw' ? withdrawTotalCount : 0) +
    (typeFilter === 'all' || typeFilter === 'keygen' ? keygenTotalCount : 0) +
    (typeFilter === 'all' || typeFilter === 'transfer' ? transferTotalCount : 0);

  const isLoading =
    (typeFilter === 'all' || typeFilter === 'registration' ? isLoadingRegistration : false) ||
    (typeFilter === 'all' || typeFilter === 'tier' ? isLoadingTier : false) ||
    (typeFilter === 'all' || typeFilter === 'topup' ? isLoadingTopup : false) ||
    (typeFilter === 'all' || typeFilter === 'withdraw' ? isLoadingWithdraw : false) ||
    (typeFilter === 'all' || typeFilter === 'keygen' ? isLoadingKeygen : false) ||
    (typeFilter === 'all' || typeFilter === 'transfer' ? isLoadingTransfer : false);

  const isInitialLoading = isLoading && unifiedRequests.length === 0;

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/15 border-yellow-500/20 text-yellow-500';
      case 'approved':
        return 'bg-green-500/15 border-green-500/20 text-green-500';
      case 'rejected':
        return 'bg-red-500/15 border-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/15 border-gray-500/20 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'border-l-blue-500';
      case 'tier':
        return 'border-l-purple-500';
      case 'topup':
        return 'border-l-green-500';
      case 'withdraw':
        return 'border-l-orange-500';
      case 'keygen-group':
        return 'border-l-yellow-500';
      case 'transfer':
        return 'border-l-cyan-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getTypeBarColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-blue-500/15 border-blue-500/20 text-blue-500';
      case 'tier':
        return 'bg-purple-500/15 border-purple-500/20 text-purple-500';
      case 'topup':
        return 'bg-green-500/15 border-green-500/20 text-green-500';
      case 'withdraw':
        return 'bg-orange-500/15 border-orange-500/20 text-orange-500';
      case 'keygen-group':
        return 'bg-yellow-500/15 border-yellow-500/20 text-yellow-500';
      case 'transfer':
        return 'bg-cyan-500/15 border-cyan-500/20 text-cyan-500';
      default:
        return 'bg-gray-500/15 border-gray-500/20 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <UserPlus className="w-6 h-6 text-blue-500" />;
      case 'tier':
        return <Trophy className="w-6 h-6 text-purple-500" />;
      case 'topup':
        return <Coins className="w-6 h-6 text-green-500" />;
      case 'withdraw':
        return <Wallet className="w-6 h-6 text-orange-500" />;
      case 'keygen-group':
        return <KeyRound className="w-6 h-6 text-yellow-500" />;
      case 'transfer':
        return <ArrowRightLeft className="w-6 h-6 text-cyan-500" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      registration: { text: 'Registration', color: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
      tier: { text: 'Level', color: 'bg-purple-500/20 text-purple-500 border-purple-500/50' },
      topup: { text: 'Top-Up', color: 'bg-green-500/20 text-green-500 border-green-500/50' },
      withdraw: { text: 'Withdrawal', color: 'bg-orange-500/20 text-orange-500 border-orange-500/50' },
      'keygen-group': { text: 'Key Generation', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' },
      transfer: { text: 'Transfer', color: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/50' }
    };
    return badges[type as keyof typeof badges] || badges.registration;
  };

  // Action Handlers
  const handleRegistrationApprove = async (requestId: string, approvalData: { isSubAdmin: boolean; managedBy: string | null }) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/registration-request/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(approvalData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Registration request approved! User account created successfully.');
        if (typeFilter === 'all' || typeFilter === 'registration') {
          fetchRegistrationRequests(1, false);
        }
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

  const handleRegistrationReject = (requestId: string) => {
    setRejectionDialog({ requestId, type: 'registration' });
    setRejectionNote('');
  };

  const handleRegistrationRejectConfirm = async () => {
    if (!rejectionDialog) return;

    const requestId = rejectionDialog.requestId;
    const reason = rejectionNote.trim() || 'No reason provided';

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
        if (typeFilter === 'all' || typeFilter === 'registration') {
          fetchRegistrationRequests(1, false);
        }
        setRejectionDialog(null);
        setRejectionNote('');
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

  const handleRegistrationDelete = async (requestId: string) => {
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
        if (typeFilter === 'all' || typeFilter === 'registration') {
          fetchRegistrationRequests(1, false);
        }
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

  const handleTierApprove = async (requestId: string) => {
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
        if (typeFilter === 'all' || typeFilter === 'tier') {
          fetchTierRequests(1, false);
        }
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

  const handleTierReject = (requestId: string) => {
    setRejectionDialog({ requestId, type: 'tier' });
    setRejectionNote('');
  };

  const handleTierRejectConfirm = async () => {
    if (!rejectionDialog) return;

    const requestId = rejectionDialog.requestId;
    const adminNote = rejectionNote.trim() || 'Request rejected by admin';

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/tier-request/admin/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Tier upgrade request rejected');
        if (typeFilter === 'all' || typeFilter === 'tier') {
          fetchTierRequests(1, false);
        }
        setRejectionDialog(null);
        setRejectionNote('');
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

  // Topup approve/reject handlers - only used for timed-out requests that need manual review
  const handleTopupApprove = async (requestId: string, approvedAmount?: number) => {
    setProcessingId(requestId);
    try {
      const body: { approvedAmount?: number } = {};
      if (approvedAmount !== undefined) {
        body.approvedAmount = approvedAmount;
      }

      const response = await apiFetch(`/topup-request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Top-up request approved successfully!');
        setCustomAmounts(prev => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        if (typeFilter === 'all' || typeFilter === 'topup') {
          fetchTopupRequests(1, false);
        }
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

  const handleTopupApproveWithAmount = (requestId: string, originalAmount: number) => {
    const customAmountValue = customAmounts[requestId];
    if (customAmountValue !== undefined && customAmountValue !== '') {
      const amount = parseFloat(customAmountValue);
      if (isNaN(amount) || amount < 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      handleTopupApprove(requestId, amount);
    } else {
      handleTopupApprove(requestId, originalAmount);
    }
  };

  const handleTopupReject = async (requestId: string) => {
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
        if (typeFilter === 'all' || typeFilter === 'topup') {
          fetchTopupRequests(1, false);
        }
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

  const handleWithdrawApprove = async (requestId: string) => {
    const crypto = selectedCrypto[requestId];
    if (!crypto) {
      toast.error('Please select a cryptocurrency');
      return;
    }

    const wallet = confirmedWallet[requestId] || globalWalletAddresses[crypto.toLowerCase() as 'btc' | 'usdt' | 'eth'];
    const amount = confirmedAmount[requestId] || withdrawRequests.find(r => r._id === requestId)?.amount.toString();

    if (!wallet || !wallet.trim()) {
      toast.error(`Please configure the ${crypto} wallet address in Global Settings`);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid confirmed amount');
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/withdraw-request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmedWallet: wallet.trim(),
          confirmedAmount: parseFloat(amount)
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Withdrawal request approved successfully!');
        setConfirmedWallet(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
        setConfirmedAmount(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
        setSelectedCrypto(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
        if (typeFilter === 'all' || typeFilter === 'withdraw') {
          fetchWithdrawRequests(1, false);
        }
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

  const handleCryptoSelect = (requestId: string, crypto: 'BTC' | 'USDT' | 'ETH') => {
    setSelectedCrypto(prev => ({ ...prev, [requestId]: crypto }));
    const walletAddress = globalWalletAddresses[crypto.toLowerCase() as 'btc' | 'usdt' | 'eth'];
    if (walletAddress) {
      setConfirmedWallet(prev => ({ ...prev, [requestId]: walletAddress }));
    }
  };

  const handleCopyWalletAddress = async (walletAddress: string, requestId: string) => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedWalletId(requestId);
      toast.success('Wallet address copied to clipboard');
      setTimeout(() => setCopiedWalletId(null), 2000);
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
      toast.error('Failed to copy wallet address');
    }
  };

  const handleUpdateAssignment = async (userId: string, managedBy: string | null) => {
    if (!token || !user?.isAdmin) return;
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
        // Refresh requests to show updated data
        if (typeFilter === 'all' || typeFilter === 'registration') fetchRegistrationRequests(registrationPage, false);
        if (typeFilter === 'all' || typeFilter === 'tier') fetchTierRequests(tierPage, false);
        if (typeFilter === 'all' || typeFilter === 'topup') fetchTopupRequests(topupPage, false);
        if (typeFilter === 'all' || typeFilter === 'withdraw') fetchWithdrawRequests(withdrawPage, false);
      } else {
        toast.error(data.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('An error occurred while updating assignment');
    }
  };

  const handleUpdateRegistrationAssignment = async (requestId: string, managedBy: string | null) => {
    if (!token || !user?.isAdmin) return;
    try {
      const response = await apiFetch(`/registration-request/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ managedBy: managedBy || null }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Registration assignment updated');
        fetchRegistrationRequests(registrationPage, false);
      } else {
        toast.error(data.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating registration assignment:', error);
      toast.error('An error occurred while updating assignment');
    }
  };

  const handleWithdrawReject = async (requestId: string) => {
    const notes = prompt('Enter rejection reason (optional):');

    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/withdraw-request/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Withdrawal request rejected');
        if (typeFilter === 'all' || typeFilter === 'withdraw') {
          fetchWithdrawRequests(1, false);
        }
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

  if (!user?.isAdmin && !user?.isSubAdmin) {
    return null;
  }

  return (
    <>
      <div id="admin-all-requests" className="absolute -z-10 top-0 left-0 right-0 h-[100vh] bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20 pointer-events-none" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  All <br /> <span className="text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 bg-clip-text">
                    Requests
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Manage all user requests in one place</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Filter & Search" className="mb-6" />

            {/* Status Filter Tabs */}
            <div className="flex gap-2 border-b border-border pb-2 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-500 border-b-2 border-blue-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'approved'
                  ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'rejected'
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
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Results: <span className="text-foreground font-semibold">{totalResults}</span>
                  </span>
                </div>
                {unifiedRequests.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Loaded: <span className="text-foreground font-semibold">{unifiedRequests.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Section */}
            <div className="flex items-center gap-4 mt-10 mb-6 justify-between">
              <MagicBadge title="Requests" />
              <Select value={typeFilter} onValueChange={(value: 'all' | 'registration' | 'tier' | 'topup' | 'withdraw' | 'keygen' | 'transfer') => setTypeFilter(value)}>
                <SelectTrigger className="w-[220px] bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background border-border">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="tier">Level</SelectItem>
                  <SelectItem value="topup">Top-Up</SelectItem>
                  <SelectItem value="withdraw">Withdrawal</SelectItem>
                  <SelectItem value="keygen">Key Generation</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Requests List */}
            {isInitialLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : unifiedRequests.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No requests match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {unifiedRequests.map((request) => {
                  const typeBadge = getTypeBadge(request.type);
                  const typeColor = getTypeColor(request.type);
                  const typeIcon = getTypeIcon(request.type);

                  // ── Keygen Group Accordion Card ──
                  if (request.type === 'keygen-group') {
                    const group = request.data;
                    const isExpanded = expandedKeygenGroups.has(group.userId);

                    return (
                      <Card key={`keygen-group-${group.userId}`} className={`${typeColor} border border-border rounded-xl transition-colors overflow-hidden`}>
                        <div className="flex items-stretch">
                          {/* Type Bar */}
                          <div className={`flex flex-col items-center justify-center w-[100px] self-stretch ${getTypeBarColor(request.type)} border rounded-l-2xl p-3 gap-2`}>
                            {typeIcon}
                            <span className="text-xs font-medium text-center leading-tight">{typeBadge.text}</span>
                          </div>

                          <CardContent className="p-0 flex-1">
                            {/* Header — click to expand/collapse */}
                            <button
                              onClick={() => toggleKeygenGroup(group.userId)}
                              className="w-full text-left p-6 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  {/* Name + status */}
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold">{group.userName}</h3>
                                    {group.statusSummary.pending > 0 && (
                                      <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 flex items-center gap-1">
                                        {getStatusIcon('pending')}
                                        {group.statusSummary.pending} Pending
                                      </Badge>
                                    )}
                                    {group.statusSummary.approved > 0 && (
                                      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-xs">
                                        {group.statusSummary.approved} Approved
                                      </Badge>
                                    )}
                                    {group.statusSummary.rejected > 0 && (
                                      <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-xs">
                                        {group.statusSummary.rejected} Rejected
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Email */}
                                  <p className="text-sm text-muted-foreground">{group.userEmail}</p>

                                  {/* Info grid - matching other card styles */}
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <KeyRound className="w-4 h-4 text-yellow-500" />
                                      <span className="text-muted-foreground">Total Keys</span>
                                      <span className="font-semibold text-yellow-500">{group.totalKeys}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <DollarSign className="w-4 h-4 text-green-500" />
                                      <span className="text-muted-foreground">Total Cost</span>
                                      <span className="font-semibold text-green-500">${group.totalCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-yellow-500" />
                                      <span className="text-muted-foreground">Requests</span>
                                      <span className="font-semibold">{group.requests.length}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Chevron */}
                                <div className="pt-1">
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Expanded individual requests */}
                            {isExpanded && (
                              <div className="border-t border-border">
                                {group.requests.map((req, idx) => (
                                  <div key={req._id} className={`px-5 py-4 ${idx !== group.requests.length - 1 ? 'border-b border-dashed border-border/60' : ''}`}>
                                    {/* Compact info row */}
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {req.nodeAmount != null && (
                                          <>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Node Amt</span>
                                            <span className="text-sm font-bold text-yellow-500">${req.nodeAmount}</span>
                                            <span className="text-xs text-muted-foreground">·</span>
                                          </>
                                        )}
                                        <span className="text-sm font-medium">{req.keysCount} keys</span>
                                        <span className="text-xs text-muted-foreground">×</span>
                                        <span className="text-xs text-muted-foreground">${req.directAccessKeyPrice}/ea</span>
                                        <span className="text-xs text-muted-foreground">→</span>
                                        <span className="text-sm font-semibold text-green-500">${req.totalCost.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Badge className={`${getStatusColor(req.status)} text-xs`}>
                                          {req.status}
                                        </Badge>
                                        {req.scheduledAction && (() => {
                                          const sa = req.scheduledAction!;
                                          const outcomeColors: Record<string, string> = {
                                            'success': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                                            'partial success': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
                                            'fail': 'bg-red-500/20 text-red-400 border-red-500/30',
                                            'cold wallet': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
                                            'reported': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                          };
                                          const color = outcomeColors[sa.nodeStatusOutcome] || outcomeColors['success'];
                                          return (
                                            <Badge className={`${color} text-[10px] gap-1 border`}>
                                              <Timer className="w-2.5 h-2.5" />
                                              {sa.nodeStatusOutcome?.replace(/^\w/, (c: string) => c.toUpperCase())} · {formatCountdown(sa.executeAt)}
                                              {sa.actionType === 'approve' && sa.approvedAmount != null && (
                                                <span className="opacity-70"> · ${sa.approvedAmount}</span>
                                              )}
                                            </Badge>
                                          );
                                        })()}
                                        <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>

                                    {/* Admin actions for pending */}
                                    {req.status === 'pending' && (
                                      <div className="space-y-2.5 mt-3">
                                        {/* Scheduled action banner */}
                                        {req.scheduledAction && (() => {
                                          const sa = req.scheduledAction!;
                                          const outcomeMap: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
                                            'success': { label: 'Success', bg: 'bg-emerald-500/8', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
                                            'partial success': { label: 'Partial Success', bg: 'bg-emerald-500/6', text: 'text-emerald-300', border: 'border-emerald-400/15', dot: 'bg-emerald-300' },
                                            'fail': { label: 'Fail', bg: 'bg-red-500/8', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
                                            'cold wallet': { label: 'Cold Wallet', bg: 'bg-sky-500/8', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-400' },
                                            'reported': { label: 'Reported', bg: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
                                          };
                                          const style = outcomeMap[sa.nodeStatusOutcome] || outcomeMap['success'];
                                          return (
                                            <div className={`flex items-center justify-between ${style.bg} border ${style.border} rounded-lg px-3 py-2.5`}>
                                              <div className="flex items-center gap-3">
                                                <div className="relative flex-shrink-0">
                                                  <div className={`w-2 h-2 ${style.dot} rounded-full`} />
                                                  <div className={`absolute inset-0 w-2 h-2 ${style.dot} rounded-full animate-ping opacity-40`} />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-semibold ${style.text}`}>
                                                      Scheduled → {style.label}
                                                    </span>
                                                    {sa.actionType === 'approve' && sa.approvedAmount != null && (
                                                      <span className={`text-[10px] ${style.text} opacity-70 font-mono`}>
                                                        ${sa.approvedAmount}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <span className="text-[10px] text-muted-foreground">
                                                    Fires in {formatCountdown(sa.executeAt)} · {new Date(sa.executeAt).toLocaleString()}
                                                  </span>
                                                </div>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => handleKeygenCancelScheduled(sa._id)}
                                                disabled={processingId === sa._id}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          );
                                        })()}

                                        {/* Status outcome selector */}
                                        <div className="flex items-center gap-2">
                                          {[
                                            { value: 'success', label: 'Success', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
                                            { value: 'partial success', label: 'Partial', color: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300' },
                                            { value: 'fail', label: 'Fail', color: 'bg-red-500/15 border-red-500/30 text-red-400' },
                                            { value: 'cold wallet', label: 'Cold', color: 'bg-sky-500/15 border-sky-500/30 text-sky-400' },
                                            { value: 'reported', label: 'Reported', color: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
                                          ].map((opt) => {
                                            const selected = (keygenOutcomeSelections[req._id] || 'success') === opt.value;
                                            return (
                                              <button
                                                key={opt.value}
                                                onClick={() => setKeygenOutcomeSelections(prev => ({ ...prev, [req._id]: opt.value }))}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                                  selected ? opt.color : 'bg-transparent border-white/10 text-muted-foreground/60 hover:border-white/20'
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            );
                                          })}
                                        </div>

                                        {/* Inputs row — amount only for partial success */}
                                        <div className="flex items-end gap-2">
                                          {(keygenOutcomeSelections[req._id] || 'success') === 'partial success' && (
                                            <Input
                                              type="number"
                                              placeholder="Partial amount ($)"
                                              value={keygenApprovalAmounts[req._id] || ''}
                                              onChange={(e) => setKeygenApprovalAmounts(prev => ({ ...prev, [req._id]: e.target.value }))}
                                              className="h-8 w-32 bg-background/50 border-emerald-500/20 text-sm"
                                            />
                                          )}
                                          <Input
                                            placeholder="Comment..."
                                            value={keygenAdminComments[req._id] || ''}
                                            onChange={(e) => setKeygenAdminComments(prev => ({ ...prev, [req._id]: e.target.value }))}
                                            className="h-8 flex-1 bg-background/50 border-border text-sm"
                                          />
                                        </div>

                                        {/* Slider + action button */}
                                        <div className="flex items-center gap-3">
                                          {/* Time slider with presets */}
                                          <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                                            {/* Preset buttons row */}
                                            <div className="flex items-center gap-1">
                                              {[
                                                { mins: 0, label: 'Now' },
                                                { mins: 30, label: '30m' },
                                                { mins: 60, label: '1h' },
                                                { mins: 180, label: '3h' },
                                                { mins: 360, label: '6h' },
                                                { mins: 720, label: '12h' },
                                                { mins: 1440, label: '24h' },
                                              ].map((tick) => {
                                                const currentVal = keygenDelaySelections[req._id] || 0;
                                                const isActive = currentVal === tick.mins;
                                                return (
                                                  <button
                                                    key={tick.mins}
                                                    onClick={() => setKeygenDelaySelections(prev => ({ ...prev, [req._id]: tick.mins }))}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                                      isActive
                                                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/40'
                                                        : 'text-muted-foreground/70 hover:text-muted-foreground hover:bg-white/5 border border-transparent'
                                                    }`}
                                                  >
                                                    {tick.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                            {/* Slider + value label */}
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="range"
                                                min={0}
                                                max={1440}
                                                step={5}
                                                value={keygenDelaySelections[req._id] || 0}
                                                onChange={(e) => setKeygenDelaySelections(prev => ({ ...prev, [req._id]: parseInt(e.target.value) }))}
                                                className="flex-1 h-1.5 accent-yellow-500 cursor-pointer"
                                                style={{ colorScheme: 'dark' }}
                                              />
                                              <span className="text-[10px] text-yellow-500 font-medium whitespace-nowrap w-8 tabular-nums">
                                                {formatDelayMinutes(keygenDelaySelections[req._id] || 0)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Single action button */}
                                          <Button
                                            onClick={() => handleKeygenAction(req._id, req.nodeAmount ?? undefined)}
                                            disabled={processingId === req._id}
                                            className={`flex items-center gap-2 flex-shrink-0 ${
                                              (keygenOutcomeSelections[req._id] || 'success') === 'fail'
                                                ? 'bg-red-600/50 hover:bg-red-700 text-white border border-red-600'
                                                : 'bg-green-600/50 hover:bg-green-700 text-white border border-green-600'
                                            }`}
                                          >
                                            {processingId === req._id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (keygenOutcomeSelections[req._id] || 'success') === 'fail' ? (
                                              <XCircle className="w-4 h-4" />
                                            ) : (
                                              <CheckCircle className="w-4 h-4" />
                                            )}
                                            Apply
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Already processed */}
                                    {req.status !== 'pending' && req.approvedAmount != null && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Approved: <span className="text-green-500 font-medium">${req.approvedAmount}</span>
                                        {req.adminComment && <> · {req.adminComment}</>}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </div>
                      </Card>
                    );
                  }

                  // ── All other request types ──
                  return (
                    <Card key={`${request.type}-${request.data._id}`} className={`${typeColor} border border-border rounded-xl transition-colors overflow-hidden`}>
                      <div className="flex items-stretch">
                        {/* Type Bar */}
                        <div className={`flex flex-col items-center justify-center w-[100px] self-stretch ${getTypeBarColor(request.type)} border rounded-l-2xl p-3 gap-2`}>
                          {typeIcon}
                          <span className="text-xs font-medium text-center leading-tight">{typeBadge.text}</span>
                        </div>

                        <CardContent className="p-6 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Request Details */}
                            <div className="flex-1 space-y-3">
                              {/* Header with Status Badge */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-lg font-bold">
                                        {request.type === 'registration' ? request.data.name :
                                          request.type === 'tier' ? request.data.userId?.name || 'Unknown User' :
                                            request.type === 'topup' ? request.data.userId?.name || 'Unknown User' :
                                              request.data.userId?.name || 'Unknown User'}
                                      </h3>
                                      <Badge className={`${getStatusColor(request.data.status)} flex items-center gap-1`}>
                                        {getStatusIcon(request.data.status)}
                                        <span className="capitalize">{request.data.status}</span>
                                      </Badge>
                                    </div>

                                    {/* Assignment Dropdown for Main Admin (ONLY for registration requests now) */}
                                    {user?.isAdmin && request.type === 'registration' && (
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-purple-400" />
                                        <Select
                                          value={
                                            typeof (request.data as any).managedBy === 'object'
                                              ? (request.data as any).managedBy?._id || "none"
                                              : (request.data as any).managedBy || "none"
                                          }
                                          onValueChange={(val) => handleUpdateRegistrationAssignment(request.data._id, val === "none" ? null : val)}
                                        >
                                          <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-xs">
                                            <SelectValue placeholder="Assign to sub-admin" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
                                            <SelectItem value="none">Main Admin</SelectItem>
                                            {subadmins.map((sa) => (
                                              <SelectItem key={sa._id} value={sa._id}>
                                                {sa.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {/* Show current manager for existing users (non-registration) */}
                                    {request.type !== 'registration' && request.data.userId && (request.data.userId as any).managedBy && (
                                      <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1">
                                        <Users className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-[10px] text-purple-400 font-medium">
                                          Managed by: {subadmins.find(sa => sa._id === (request.data.userId as any).managedBy)?.name || 'Sub-Admin'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail size={14} />
                                    {request.type === 'registration' ? request.data.email :
                                      request.type === 'tier' ? request.data.userId?.email || 'N/A' :
                                        request.type === 'topup' ? request.data.userId?.email || 'N/A' :
                                          request.data.userId?.email || 'N/A'}
                                  </div>
                                </div>
                              </div>

                              {/* Registration Card */}
                              {request.type === 'registration' && (
                                <>
                                  <div className="text-sm text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{request.data.phone}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>Submitted: {new Date(request.data.createdAt).toLocaleString()}</span>
                                      </div>
                                      {request.data.reviewedAt && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          <span>Reviewed: {new Date(request.data.reviewedAt).toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                    {request.data.reviewedBy && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <User className="w-4 h-4" />
                                        <span>Reviewed by: {request.data.reviewedBy.name}</span>
                                      </div>
                                    )}
                                  </div>

                                  {request.data.status === 'rejected' && request.data.rejectionReason && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                      <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason:</p>
                                      <p className="text-sm text-muted-foreground">{request.data.rejectionReason}</p>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Tier Card */}
                              {request.type === 'tier' && (
                                <>
                                  <div className={`grid ${request.data.status === 'approved' ? 'grid-cols-4' : 'grid-cols-3'} gap-4 pt-3 border-t border-border`}>
                                    <div className="flex items-center gap-2">
                                      <Trophy className="w-4 h-4 text-blue-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Current Tier</p>
                                        <p className="font-bold">Tier {request.data.currentTier} - {TIER_NAMES[request.data.currentTier]}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Trophy className="w-4 h-4 text-purple-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested Tier</p>
                                        <p className="font-bold text-purple-400">Tier {request.data.requestedTier} - {TIER_NAMES[request.data.requestedTier]}</p>
                                      </div>
                                    </div>
                                    {request.data.status === 'approved' && (
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-green-500" />
                                        <div>
                                          <p className="text-xs text-gray-400">User Balance</p>
                                          <p className="font-bold text-green-400">${request.data.userId?.balance?.toFixed(2) ?? 'N/A'}</p>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested</p>
                                        <p className="font-bold text-sm">{new Date(request.data.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {request.data.status !== 'approved' && (
                                    <div className="pt-3 border-t border-border">
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-gray-400">User Balance:</span>
                                        <span className="font-bold text-green-400">${request.data.userId?.balance?.toFixed(2) ?? 'N/A'}</span>
                                      </div>
                                    </div>
                                  )}

                                  {request.data.status !== 'pending' && request.data.adminNote && (
                                    <div className="pt-3 border-t border-border">
                                      <p className="text-xs text-gray-400 mb-1">Admin Note:</p>
                                      <p className="text-sm text-gray-300">{request.data.adminNote}</p>
                                      {request.data.reviewedBy && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Reviewed by {request.data.reviewedBy.name} on {new Date(request.data.reviewedAt!).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Topup Card */}
                              {request.type === 'topup' && (
                                <>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-border">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-yellow-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested</p>
                                        <p className="font-bold text-green-400">${request.data.amount.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    {request.data.status === 'approved' && (
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-blue-500" />
                                        <div>
                                          <p className="text-xs text-gray-400">Approved</p>
                                          <p className="font-bold text-blue-400">${(request.data.approvedAmount != null && request.data.approvedAmount > 0 ? request.data.approvedAmount : request.data.amount).toFixed(2)}</p>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Coins className="w-4 h-4 text-orange-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Crypto</p>
                                        <p className="font-bold">{request.data.cryptocurrency || 'BTC'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Wallet className="w-4 h-4 text-blue-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Current Balance</p>
                                        <p className="font-bold">${request.data.userId?.balance.toFixed(2) ?? 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Trophy className="w-4 h-4 text-purple-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Tier Level</p>
                                        <p className="font-bold">Tier {request.data.userId?.tier ?? 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested</p>
                                        <p className="font-bold text-sm">{new Date(request.data.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment Address */}
                                  {request.data.paymentAddress && (
                                    <div className="bg-background/50 border border-border rounded-lg p-3 mt-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-muted-foreground">Payment Address</p>
                                          <p className="text-sm font-mono text-foreground break-all">{request.data.paymentAddress}</p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(request.data.paymentAddress || '');
                                            toast.success('Payment address copied!');
                                          }}
                                          className="p-1.5 hover:bg-background/50 rounded transition-colors flex-shrink-0 ml-2"
                                          title="Copy payment address"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Transaction Hash */}
                                  {request.data.txHash && (
                                    <div className="bg-background/50 border border-border rounded-lg p-3 mt-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-muted-foreground">Transaction Hash</p>
                                          <p className="text-sm font-mono text-foreground break-all">{request.data.txHash}</p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(request.data.txHash || '');
                                            toast.success('Transaction hash copied!');
                                          }}
                                          className="p-1.5 hover:bg-background/50 rounded transition-colors flex-shrink-0 ml-2"
                                          title="Copy transaction hash"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {request.data.processedAt && (
                                    <div className="text-xs text-gray-500 pt-2">
                                      Processed on {new Date(request.data.processedAt).toLocaleString()}
                                      {request.data.processedBy && ` by ${request.data.processedBy.name}`}
                                    </div>
                                  )}

                                  {request.data.notes && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                                      <p className="text-sm text-red-400"><strong>Note:</strong> {request.data.notes}</p>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Withdraw Card */}

                              {/* Transfer Card */}
                              {request.type === 'transfer' && (
                                <>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-border">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-cyan-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Amount</p>
                                        <p className="font-bold text-cyan-400">${request.data.amount.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-red-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Fee ({request.data.feeMode === 'percent' ? `${request.data.feeValue}%` : `$${request.data.feeValue}`})</p>
                                        <p className="font-bold text-red-400">${request.data.feeAmount.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-green-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Net Amount</p>
                                        <p className="font-bold text-green-400">${request.data.netAmount.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Direction</p>
                                        <p className="font-bold text-sm">Onchain → Available</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested</p>
                                        <p className="font-bold text-sm">{new Date(request.data.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {request.data.adminNote && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                                      <p className="text-sm text-red-400"><strong>Admin Note:</strong> {request.data.adminNote}</p>
                                    </div>
                                  )}

                                  {request.data.processedAt && (
                                    <div className="text-xs text-gray-400 mt-2">
                                      Processed: {new Date(request.data.processedAt).toLocaleString()}
                                      {request.data.processedBy && ` by ${request.data.processedBy.name}`}
                                    </div>
                                  )}
                                </>
                              )}

                              {request.type === 'withdraw' && (
                                <>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-red-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Withdraw Amount</p>
                                        <p className="font-bold text-red-400">${request.data.amount.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Wallet className="w-4 h-4 text-blue-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Current Balance</p>
                                        <p className="font-bold">${request.data.userId?.balance?.toFixed(2) ?? 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Trophy className="w-4 h-4 text-purple-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Tier Level</p>
                                        <p className="font-bold">Tier {request.data.userId?.tier ?? 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Requested</p>
                                        <p className="font-bold text-sm">{new Date(request.data.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {request.data.isDirectBalanceWithdraw && (
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2">
                                      <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-blue-400" />
                                        <p className="text-sm font-medium text-blue-400">Direct Balance Withdrawal</p>
                                      </div>
                                      <p className="text-xs text-gray-400">User wants to withdraw directly from their balance (no commission)</p>
                                    </div>
                                  )}

                                  {!request.data.addToBalance && request.data.walletAddress && (
                                    <div className="flex flex-row items-center justify-between bg-background/50 border border-border rounded-lg p-3 mt-2">
                                      <div className="flex flex-col">
                                        <p className="text-xs text-muted-foreground">User Wallet Address:</p>
                                        <p className="text-sm font-mono text-foreground break-all">{request.data.walletAddress}</p>
                                      </div>
                                      <button
                                        onClick={() => handleCopyWalletAddress(request.data.walletAddress, request.data._id)}
                                        className="p-1.5 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                                        title="Copy wallet address"
                                      >
                                        {copiedWalletId === request.data._id ? (
                                          <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {(request.data.networks && request.data.networks.length > 0) || request.data.withdrawAll ? (
                                    <div className="bg-background/50 border border-border rounded-lg p-3 mt-2">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Coins className="w-4 h-4 text-purple-400" />
                                        <p className="text-xs text-muted-foreground font-medium">Network Withdrawal Details:</p>
                                      </div>

                                      {request.data.withdrawAll ? (
                                        <div className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                          <Coins className="w-4 h-4 text-purple-400" />
                                          <span className="text-sm text-purple-400 font-medium">Withdraw All Networks</span>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                          {request.data.networks?.map(networkKey => {
                                            const network = NETWORKS.find(n => n.key === networkKey);
                                            const amount = request.data.networkRewards?.[networkKey] || 0;

                                            if (!network || amount === 0) return null;

                                            return (
                                              <div key={networkKey} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-sm ${network.color}`}>{network.icon}</span>
                                                  <span className="text-xs text-gray-300">{network.name}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-white">
                                                  {amount.toFixed(2)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}

                                  {request.data.commissionPaid && request.data.commissionPaid > 0 && (
                                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-2">
                                      <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-orange-400" />
                                        <p className="text-sm font-medium text-orange-400">Commission Paid</p>
                                      </div>
                                      <p className="text-lg font-bold text-orange-300">${request.data.commissionPaid.toFixed(2)}</p>
                                      <p className="text-xs text-gray-400 mt-1">Commission deducted from user's balance</p>
                                    </div>
                                  )}

                                  {request.data.processedAt && (
                                    <div className="text-xs text-gray-500 pt-2">
                                      Processed on {new Date(request.data.processedAt).toLocaleString()}
                                      {request.data.processedBy && ` by ${request.data.processedBy.name}`}
                                    </div>
                                  )}

                                  {request.data.notes && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                                      <p className="text-sm text-red-400"><strong>Note:</strong> {request.data.notes}</p>
                                    </div>
                                  )}

                                  {request.data.status === 'approved' && (request.data.confirmedWallet || request.data.confirmedAmount) && (
                                    <div className="mt-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                                      <h4 className="text-sm font-semibold text-green-400 mb-3">✅ Admin Payment Instructions Provided</h4>
                                      <div className="space-y-2">
                                        {request.data.confirmedWallet && (() => {
                                          // Determine wallet type by comparing with global addresses
                                          let walletType: 'BTC' | 'ETH' | 'USDT' | null = null;
                                          if (globalWalletAddresses.btc && request.data.confirmedWallet.toLowerCase() === globalWalletAddresses.btc.toLowerCase()) {
                                            walletType = 'BTC';
                                          } else if (globalWalletAddresses.eth && request.data.confirmedWallet.toLowerCase() === globalWalletAddresses.eth.toLowerCase()) {
                                            walletType = 'ETH';
                                          } else if (globalWalletAddresses.usdt && request.data.confirmedWallet.toLowerCase() === globalWalletAddresses.usdt.toLowerCase()) {
                                            walletType = 'USDT';
                                          }

                                          const walletNetwork = walletType ? NETWORKS.find(n => n.key === walletType) : null;

                                          return (
                                            <div>
                                              <label className="text-xs text-gray-400 mb-1 block">Receiving Wallet Type:</label>
                                              {walletNetwork ? (
                                                <div className="flex items-center gap-2 text-sm bg-green-500/10 p-2 rounded border border-green-500/20">
                                                  <span className={`${walletNetwork.color} text-lg`}>{walletNetwork.icon}</span>
                                                  <span className="text-green-300 font-medium">{walletNetwork.name}</span>
                                                </div>
                                              ) : (
                                                <p className="text-sm font-mono text-green-300 bg-green-500/10 p-2 rounded border border-green-500/20 break-all">
                                                  {request.data.confirmedWallet}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                        {request.data.confirmedAmount && (
                                          <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Amount User Should Send:</label>
                                            <p className="text-lg font-bold text-green-400">
                                              ${request.data.confirmedAmount.toFixed(2)}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Right: Action Buttons */}
                            {request.data.status === 'pending' && (
                              <div className="flex flex-col gap-3 w-[250px] flex-shrink-0">
                                {/* Registration Actions */}
                                {request.type === 'registration' && (
                                  <>
                                    <Button
                                      onClick={() => setApproveDialog({
                                        isOpen: true,
                                        requestId: request.data._id,
                                        requestName: request.data.name,
                                        requestEmail: request.data.email,
                                        initialIsSubAdmin: request.data.isSubAdmin,
                                        initialManagedBy: typeof request.data.managedBy === 'object' ? request.data.managedBy?._id : request.data.managedBy
                                      })}
                                      disabled={processingId === request.data._id}
                                      className="bg-green-600/50 hover:bg-green-700 text-white flex items-center justify-center gap-2 border border-green-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Approve
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => handleRegistrationReject(request.data._id)}
                                      disabled={processingId === request.data._id}
                                      className="bg-red-600/50 hover:bg-red-700 text-white flex items-center justify-center gap-2 border border-red-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}

                                {/* Tier Actions */}
                                {request.type === 'tier' && (
                                  <>
                                    <Button
                                      onClick={() => handleTierApprove(request.data._id)}
                                      disabled={processingId === request.data._id}
                                      className="bg-green-600/50 hover:bg-green-700 text-white flex items-center justify-center gap-2 border border-green-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Approve
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => handleTierReject(request.data._id)}
                                      disabled={processingId === request.data._id}
                                      className="bg-red-600/50 hover:bg-red-700 text-white flex items-center justify-center gap-2 border border-red-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}

                                {/* Topup Actions */}
                                {request.type === 'topup' && (() => {
                                  const topupData = request.data as TopupRequestData;
                                  const isDirectFlow = !topupData.paymentSessionId;

                                  if (isDirectFlow) {
                                    // Direct top-up: user manually sent crypto to the global wallet.
                                    // Show approve/reject immediately with no timeout logic.
                                    return (
                                      <>
                                        <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg mb-3 border bg-purple-500/10 border-purple-500/30">
                                          <DollarSign className="w-5 h-5 text-purple-400" />
                                          <span className="text-sm text-purple-400 font-medium text-center">Direct Top-Up</span>
                                          <span className="text-xs text-muted-foreground text-center">User sent crypto manually — verify and approve or reject.</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <label className="text-xs text-muted-foreground">Amount to credit (USD)</label>
                                          <Input
                                            type="number"
                                            placeholder={`Requested: $${topupData.amount.toFixed(2)}`}
                                            value={customAmounts[topupData._id] ?? topupData.amount.toString()}
                                            onChange={(e) => setCustomAmounts(prev => ({
                                              ...prev,
                                              [topupData._id]: e.target.value
                                            }))}
                                            className="bg-background/50 border-border text-foreground"
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => handleTopupApproveWithAmount(topupData._id, topupData.amount)}
                                            disabled={processingId === topupData._id}
                                            className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600 flex-1"
                                          >
                                            {processingId === topupData._id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-4 h-4" />
                                            )}
                                            Approve
                                          </Button>
                                          <Button
                                            onClick={() => handleTopupReject(topupData._id)}
                                            disabled={processingId === topupData._id}
                                            className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600 flex-1"
                                          >
                                            {processingId === topupData._id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <XCircle className="w-4 h-4" />
                                            )}
                                            Reject
                                          </Button>
                                        </div>
                                      </>
                                    );
                                  }

                                  // Auto top-up (payment gateway): use timeout / detecting logic
                                  const confirmations = topupData.confirmations || 0;
                                  const requiredConfirmations = topupData.requiredConfirmations || 1;

                                  // Calculate timeout based on createdAt + 1 hour
                                  const createdAt = new Date(topupData.createdAt);
                                  const timeoutAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
                                  const hasTimedOut = new Date() > timeoutAt;

                                  const hasConfirmations = confirmations > 0;
                                  const hasEnoughConfirmations = confirmations >= requiredConfirmations;

                                  // Timed out: 1 hour since creation, 0 confirmations, pending/expired
                                  const isTimedOut = hasTimedOut && !hasConfirmations &&
                                                     ['pending', 'expired'].includes(topupData.paymentStatus || 'pending');
                                  // Under/over payment: gateway returned 'detecting' - admin must set amount to credit
                                  const isDetecting = topupData.paymentStatus === 'detecting';

                                  const showManualControls = isTimedOut || isDetecting;

                                  if (showManualControls) {
                                    return (
                                      <>
                                        <div className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg mb-3 border ${isDetecting ? 'bg-amber-500/10 border-amber-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                                          {isDetecting ? (
                                            <>
                                              <DollarSign className="w-5 h-5 text-amber-400" />
                                              <span className="text-sm text-amber-400 font-medium text-center">Amount Mismatch</span>
                                              <span className="text-xs text-muted-foreground text-center">User sent a different amount than requested. Enter the amount (USD) to add to their balance, then Approve or Reject.</span>
                                            </>
                                          ) : (
                                            <>
                                              <Clock className="w-5 h-5 text-orange-400" />
                                              <span className="text-sm text-orange-400 font-medium text-center">Payment Timed Out</span>
                                              <span className="text-xs text-muted-foreground text-center">No transaction detected - manual review required</span>
                                            </>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <label className="text-xs text-muted-foreground">{isDetecting ? 'Amount to add to balance (USD)' : 'Approval Amount (USD)'}</label>
                                          <Input
                                            type="number"
                                            placeholder={`Requested: $${topupData.amount.toFixed(2)}`}
                                            value={customAmounts[topupData._id] ?? topupData.amount.toString()}
                                            onChange={(e) => setCustomAmounts(prev => ({
                                              ...prev,
                                              [topupData._id]: e.target.value
                                            }))}
                                            className="bg-background/50 border-border text-foreground"
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => handleTopupApproveWithAmount(topupData._id, topupData.amount)}
                                            disabled={processingId === topupData._id}
                                            className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600 flex-1"
                                          >
                                            {processingId === topupData._id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-4 h-4" />
                                            )}
                                            Approve
                                          </Button>
                                          <Button
                                            onClick={() => handleTopupReject(topupData._id)}
                                            disabled={processingId === topupData._id}
                                            className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600 flex-1"
                                          >
                                            {processingId === topupData._id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <XCircle className="w-4 h-4" />
                                            )}
                                            Reject
                                          </Button>
                                        </div>
                                      </>
                                    );
                                  } else {
                                    // Still processing - show auto-processing indicator with status
                                    const remainingMs = timeoutAt.getTime() - new Date().getTime();
                                    const remainingMins = Math.max(0, Math.ceil(remainingMs / 60000));

                                    return (
                                      <div className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        {hasConfirmations ? (
                                          <>
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                            <span className="text-sm text-green-400 font-medium text-center">Confirming Payment</span>
                                            <span className="text-xs text-muted-foreground text-center">
                                              {confirmations}/{requiredConfirmations} confirmations
                                            </span>
                                            {hasEnoughConfirmations && (
                                              <span className="text-xs text-green-400 text-center">Will auto-approve shortly</span>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                            <span className="text-sm text-blue-400 font-medium text-center">Awaiting Payment</span>
                                            <span className="text-xs text-muted-foreground text-center">
                                              {remainingMins > 0
                                                ? `Manual review in ${remainingMins} min${remainingMins !== 1 ? 's' : ''}`
                                                : 'Will require manual review soon'
                                              }
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  }
                                })()}

                                {/* Transfer Actions */}
                                {request.type === 'transfer' && (
                                  <>
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 mb-1">
                                      <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                                      <div className="text-xs">
                                        <span className="text-cyan-400 font-medium">${request.data.netAmount.toFixed(2)}</span>
                                        <span className="text-gray-400"> after </span>
                                        <span className="text-red-400">${request.data.feeAmount.toFixed(2)} fee</span>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleTransferApprove(request.data._id)}
                                      disabled={processingId === request.data._id}
                                      className="bg-green-600/50 hover:bg-green-700 text-white flex items-center justify-center gap-2 border border-green-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Approve
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => handleTransferReject(request.data._id)}
                                      disabled={processingId === request.data._id}
                                      className="bg-red-600/50 hover:bg-red-700 text-white flex items-center justify-center gap-2 border border-red-600"
                                    >
                                      {processingId === request.data._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}

                                {/* Withdraw Actions */}
                                {request.type === 'withdraw' && (
                                  <>
                                    <div className="flex flex-col gap-2">
                                      <label className="text-xs text-muted-foreground">Select Wallet</label>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          onClick={() => handleCryptoSelect(request.data._id, 'BTC')}
                                          variant={selectedCrypto[request.data._id] === 'BTC' ? undefined : 'outline'}
                                          className={`flex-1 p-2 h-auto ${selectedCrypto[request.data._id] === 'BTC' ? 'bg-orange-600/50 hover:bg-orange-700 border-orange-600' : ''}`}
                                        >
                                          <img
                                            src="/assets/crypto-logos/bitcoin-btc-logo.svg"
                                            alt="BTC"
                                            className="w-6 h-6"
                                          />
                                        </Button>
                                        <Button
                                          type="button"
                                          onClick={() => handleCryptoSelect(request.data._id, 'USDT')}
                                          variant={selectedCrypto[request.data._id] === 'USDT' ? undefined : 'outline'}
                                          className={`flex-1 p-2 h-auto ${selectedCrypto[request.data._id] === 'USDT' ? 'bg-green-600/50 hover:bg-green-700 border-green-600' : ''}`}
                                        >
                                          <img
                                            src="/assets/crypto-logos/tether-usdt-logo.svg"
                                            alt="USDT"
                                            className="w-6 h-6"
                                          />
                                        </Button>
                                        <Button
                                          type="button"
                                          onClick={() => handleCryptoSelect(request.data._id, 'ETH')}
                                          variant={selectedCrypto[request.data._id] === 'ETH' ? undefined : 'outline'}
                                          className={`flex-1 p-2 h-auto ${selectedCrypto[request.data._id] === 'ETH' ? 'bg-blue-600/50 hover:bg-blue-700 border-blue-600' : ''}`}
                                        >
                                          <img
                                            src="/assets/crypto-logos/ethereum-eth-logo.svg"
                                            alt="ETH"
                                            className="w-6 h-6"
                                          />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <label className="text-xs text-muted-foreground">Fee Amount</label>
                                      <Input
                                        type="number"
                                        placeholder={`Requested: $${request.data.amount.toFixed(2)}`}
                                        value={confirmedAmount[request.data._id] ?? request.data.amount.toString()}
                                        onChange={(e) => setConfirmedAmount(prev => ({
                                          ...prev,
                                          [request.data._id]: e.target.value
                                        }))}
                                        className="bg-background/50 border-border text-foreground"
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleWithdrawApprove(request.data._id)}
                                        disabled={processingId === request.data._id}
                                        className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600 flex-1"
                                      >
                                        {processingId === request.data._id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-4 h-4" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => handleWithdrawReject(request.data._id)}
                                        disabled={processingId === request.data._id}
                                        className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600 flex-1"
                                      >
                                        {processingId === request.data._id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        Reject
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Delete button for rejected registration requests only */}
                            {request.type === 'registration' && request.data.status === 'rejected' && (
                              <div className="flex flex-col gap-3 w-[280px] flex-shrink-0">
                                <Button
                                  onClick={() => handleRegistrationDelete(request.data._id)}
                                  disabled={processingId === request.data._id}
                                  variant="outline"
                                  className="border-red-500/50 hover:bg-red-500/20 text-red-400 flex items-center justify-center gap-2"
                                >
                                  {processingId === request.data._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
                <div ref={loadMoreRef} />
                {(isFetchingMoreRegistration || isFetchingMoreTier || isFetchingMoreTopup || isFetchingMoreWithdraw) && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>

      {/* Registration Approval with Assignment Dialog */}
      {approveDialog && (
        <ApproveRegistrationDialog
          isOpen={approveDialog.isOpen}
          onClose={() => setApproveDialog(null)}
          requestName={approveDialog.requestName}
          requestEmail={approveDialog.requestEmail}
          initialIsSubAdmin={approveDialog.initialIsSubAdmin}
          initialManagedBy={approveDialog.initialManagedBy}
          onApprove={(data) => handleRegistrationApprove(approveDialog.requestId, data)}
        />
      )}

      {/* Rejection Dialog */}
      <Dialog open={!!rejectionDialog} onOpenChange={(open) => !open && setRejectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectionDialog?.type === 'registration' ? 'Reject Registration Request' : 'Reject Level Request'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="rejectionNote">
                {rejectionDialog?.type === 'registration' ? 'Rejection Reason' : 'Admin Note'} (Optional but Recommended)
              </Label>
              <Textarea
                id="rejectionNote"
                placeholder={`Enter the reason for rejection...`}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="bg-background/50 border-border min-h-[100px] mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {rejectionDialog?.type === 'registration'
                  ? 'This reason will be included in the rejection notification sent to the user.'
                  : 'This note will be included in the rejection notification sent to the user.'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionDialog(null);
                  setRejectionNote('');
                }}
                disabled={!!processingId}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (rejectionDialog?.type === 'registration') {
                    handleRegistrationRejectConfirm();
                  } else if (rejectionDialog?.type === 'tier') {
                    handleTierRejectConfirm();
                  }
                }}
                disabled={!!processingId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {processingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminAllRequests;
