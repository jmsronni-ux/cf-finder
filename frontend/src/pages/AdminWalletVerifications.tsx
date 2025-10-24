import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { 
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  Wallet,
  RefreshCw
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { apiFetch } from '../utils/api';
import { WalletVerificationRequest } from '../types/wallet-verification';
import WalletVerificationModal from '../components/WalletVerificationModal';

const AdminWalletVerifications: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<WalletVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WalletVerificationRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

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
        ? '/wallet-verification' 
        : `/wallet-verification?status=${filter}`;
      
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(data.data.requests || []);
      } else {
        toast.error(data.message || 'Failed to fetch verification requests');
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('An error occurred while fetching verification requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestClick = async (request: WalletVerificationRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedRequest(null);
    fetchRequests(); // Refresh list after modal closes
  };

  const filteredRequests = requests.filter(request => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const userId = request.userId as any;
    const userName = userId?.name?.toLowerCase() || '';
    const userEmail = userId?.email?.toLowerCase() || '';
    const walletAddress = request.walletAddress.toLowerCase();
    
    return (
      userName.includes(query) ||
      userEmail.includes(query) ||
      walletAddress.includes(query)
    );
  });

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
      <AdminNavigation />
      <MaxWidthWrapper className="py-10">
        <div className="max-w-7xl mx-auto">
          <MagicBadge title="Wallet Verifications" className="mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-500" />
              Wallet Verification Requests
            </h1>
            <Button
              onClick={fetchRequests}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6 border border-border rounded-xl">
            <CardContent className="p-6">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mb-4">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((filterOption) => (
                  <Button
                    key={filterOption}
                    onClick={() => setFilter(filterOption)}
                    variant={filter === filterOption ? 'primary' : 'outline'}
                    className={`${
                      filter === filterOption
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'border-border hover:bg-white/5'
                    }`}
                  >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    {filterOption === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
                        {requests.filter(r => r.status === 'pending').length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by user name, email, or wallet address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border border-border rounded-xl">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {searchQuery
                    ? 'No verification requests found matching your search'
                    : 'No verification requests found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const userId = request.userId as any;
                return (
                  <Card
                    key={request._id}
                    className="border border-border rounded-xl hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => handleRequestClick(request)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {userId?.name || 'Unknown User'}
                              </h3>
                              <p className="text-sm text-muted-foreground">{userId?.email || 'No email'}</p>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Wallet className={`w-4 h-4 ${getWalletTypeColor(request.walletType)}`} />
                              <span className={`font-medium ${getWalletTypeColor(request.walletType)}`}>
                                {request.walletType.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-mono text-xs">
                              {request.walletAddress.substring(0, 10)}...{request.walletAddress.substring(request.walletAddress.length - 10)}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {request.blockchainData && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Balance: {request.blockchainData.balance.toFixed(6)}</span>
                              <span>Transactions: {request.blockchainData.transactionCount}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestClick(request);
                          }}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50"
                        >
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </MaxWidthWrapper>

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
