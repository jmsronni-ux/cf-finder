import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle, RefreshCw, ExternalLink, Copy, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '../utils/api';
import { WalletVerificationRequest } from '../types/wallet-verification';

interface WalletVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: WalletVerificationRequest;
  token: string;
}

const WalletVerificationModal: React.FC<WalletVerificationModalProps> = ({
  isOpen,
  onClose,
  request,
  token
}) => {
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [blockchainData, setBlockchainData] = useState(request.blockchainData);
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!isOpen) return null;

  const userId = request.userId as any;

  const fetchBlockchainData = async () => {
    setIsLoadingBlockchain(true);
    try {
      const response = await apiFetch(`/wallet-verification/${request._id}/fetch-blockchain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBlockchainData(data.data);
        toast.success('Blockchain data refreshed successfully');
      } else {
        toast.error(data.message || 'Failed to fetch blockchain data');
      }
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
      toast.error('An error occurred while fetching blockchain data');
    } finally {
      setIsLoadingBlockchain(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await apiFetch(`/wallet-verification/${request._id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet verification approved successfully');
        onClose();
      } else {
        toast.error(data.message || 'Failed to approve verification');
      }
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('An error occurred while approving verification');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await apiFetch(`/wallet-verification/${request._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet verification rejected');
        onClose();
      } else {
        toast.error(data.message || 'Failed to reject verification');
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('An error occurred while rejecting verification');
    } finally {
      setIsRejecting(false);
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'btc':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'eth':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'tron':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'usdtErc20':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getExplorerUrl = (txHash: string, walletType: string) => {
    switch (walletType) {
      case 'btc':
        return `https://blockchain.com/btc/tx/${txHash}`;
      case 'eth':
      case 'usdtErc20':
        return `https://etherscan.io/tx/${txHash}`;
      case 'tron':
        return `https://tronscan.org/#/transaction/${txHash}`;
      default:
        return '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl border border-border rounded-xl my-8">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-6 h-6 text-purple-500" />
              Wallet Verification Request
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* User Information */}
          <div className="bg-white/5 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground">{userId?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{userId?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  {request.status === 'pending' && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      Pending Review
                    </Badge>
                  )}
                  {request.status === 'approved' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                      Approved
                    </Badge>
                  )}
                  {request.status === 'rejected' && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Information */}
          <div className="bg-white/5 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Wallet Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Wallet Type</p>
                <Badge variant="outline" className={getWalletTypeColor(request.walletType)}>
                  {request.walletType.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 px-3 py-2 rounded text-xs font-mono text-foreground break-all">
                    {request.walletAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(request.walletAddress)}
                    className="hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Data */}
          <div className="bg-white/5 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Blockchain Data</h3>
              <Button
                onClick={fetchBlockchainData}
                disabled={isLoadingBlockchain || request.status !== 'pending'}
                size="sm"
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingBlockchain ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>

            {blockchainData ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-black/30 p-3 rounded">
                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                    <p className="text-lg font-bold text-foreground">
                      {blockchainData.balance.toFixed(6)}
                    </p>
                  </div>
                  <div className="bg-black/30 p-3 rounded">
                    <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                    <p className="text-lg font-bold text-foreground">
                      {blockchainData.transactionCount}
                    </p>
                  </div>
                  <div className="bg-black/30 p-3 rounded">
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-xs font-medium text-foreground">
                      {new Date(blockchainData.lastFetched).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Transactions List */}
                {blockchainData.latestTransactions && blockchainData.latestTransactions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Latest Transactions</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {blockchainData.latestTransactions.map((tx, index) => (
                        <div
                          key={index}
                          className="bg-black/30 p-3 rounded text-xs flex items-center justify-between"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-foreground">
                                {tx.hash.substring(0, 16)}...{tx.hash.substring(tx.hash.length - 8)}
                              </code>
                              <Badge
                                variant="outline"
                                className={
                                  tx.type === 'in'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                                }
                              >
                                {tx.type === 'in' ? 'In' : 'Out'}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">
                              {new Date(tx.date).toLocaleString()} • Amount: {tx.amount.toFixed(8)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(getExplorerUrl(tx.hash, request.walletType), '_blank')}
                            className="hover:bg-white/10"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No blockchain data available. Click "Refresh Data" to fetch wallet information.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {request.status === 'pending' && (
            <div className="space-y-3">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Approve Verification
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    variant="outline"
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/50 py-6"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Verification
                  </Button>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-red-400">Reject Verification</h4>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full bg-black/30 border border-border rounded px-3 py-2 text-sm text-foreground min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={isRejecting || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Confirm Rejection'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason('');
                      }}
                      variant="outline"
                      className="border-border hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {request.status === 'rejected' && request.rejectionReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Rejection Reason</h4>
              <p className="text-sm text-foreground">{request.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletVerificationModal;
