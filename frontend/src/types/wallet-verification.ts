export interface WalletVerificationRequest {
  _id: string;
  userId: string;
  walletAddress: string;
  walletType: 'btc' | 'eth' | 'tron' | 'usdtErc20';
  status: 'pending' | 'approved' | 'rejected';
  blockchainData: BlockchainData;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockchainData {
  balance: number;
  transactionCount: number;
  latestTransactions: Transaction[];
  lastFetched: string;
}

export interface Transaction {
  hash: string;
  date: string;
  amount: number;
  type: 'in' | 'out';
  explorerUrl: string;
}

export interface WalletVerificationStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  walletTypeBreakdown: Array<{
    _id: string;
    count: number;
  }>;
}

export interface WalletVerificationResponse {
  success: boolean;
  message?: string;
  data: WalletVerificationRequest | WalletVerificationRequest[] | WalletVerificationStats;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface SubmitVerificationRequest {
  walletAddress: string;
  walletType: 'btc' | 'eth' | 'tron' | 'usdtErc20';
}

export interface RejectVerificationRequest {
  rejectionReason: string;
}
