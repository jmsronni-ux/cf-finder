import { ApiError } from '../middlewares/error.middleware.js';
import WalletVerificationRequest from '../models/wallet-verification-request.model.js';
import User from '../models/user.model.js';
import { fetchCompleteWalletData } from '../utils/blockchain-verification.util.js';

// Submit a new wallet verification request
export const submitVerificationRequest = async (req, res, next) => {
    try {
        const { walletAddress, walletType } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!walletAddress || !walletType) {
            throw new ApiError(400, 'Wallet address and type are required');
        }

        // Validate wallet type
        const validTypes = ['btc', 'eth', 'tron', 'usdtErc20'];
        if (!validTypes.includes(walletType.toLowerCase())) {
            throw new ApiError(400, 'Invalid wallet type. Must be one of: btc, eth, tron, usdtErc20');
        }

        // Check if user has this wallet in their profile
        const user = await User.findById(userId).select('wallets');
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const userWallet = user.wallets[walletType.toLowerCase()];
        if (!userWallet || userWallet !== walletAddress.trim()) {
            throw new ApiError(400, 'Wallet address does not match your saved wallet');
        }

        // Check if there's already a pending or approved request for this wallet
        const existingRequest = await WalletVerificationRequest.findOne({
            userId,
            walletAddress: walletAddress.trim(),
            status: { $in: ['pending', 'approved'] }
        });

        if (existingRequest) {
            throw new ApiError(409, 'Verification request already exists for this wallet');
        }

        // Create new verification request
        const verificationRequest = new WalletVerificationRequest({
            userId,
            walletAddress: walletAddress.trim(),
            walletType: walletType.toLowerCase()
        });

        await verificationRequest.save();

        res.status(201).json({
            success: true,
            message: 'Wallet verification request submitted successfully',
            data: {
                id: verificationRequest._id,
                walletAddress: verificationRequest.walletAddress,
                walletType: verificationRequest.walletType,
                status: verificationRequest.status,
                createdAt: verificationRequest.createdAt
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get user's own verification requests
export const getMyVerificationRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const requests = await WalletVerificationRequest.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-blockchainData.latestTransactions'); // Exclude detailed transactions for list view

        const total = await WalletVerificationRequest.countDocuments({ userId });

        res.json({
            success: true,
            data: {
                requests,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get all verification requests (admin only)
export const getAllVerificationRequests = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { walletAddress: { $regex: search, $options: 'i' } }
            ];
        }

        const requests = await WalletVerificationRequest.find(filter)
            .populate('userId', 'name email')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-blockchainData.latestTransactions'); // Exclude detailed transactions for list view

        const total = await WalletVerificationRequest.countDocuments(filter);

        res.json({
            success: true,
            data: {
                requests,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get specific verification request by ID (admin only)
export const getVerificationRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const request = await WalletVerificationRequest.findById(id)
            .populate('userId', 'name email wallets')
            .populate('reviewedBy', 'name email');

        if (!request) {
            throw new ApiError(404, 'Verification request not found');
        }

        res.json({
            success: true,
            data: request
        });

    } catch (error) {
        next(error);
    }
};

// Fetch fresh blockchain data for a verification request (admin only)
export const fetchBlockchainData = async (req, res, next) => {
    try {
        const { id } = req.params;

        const request = await WalletVerificationRequest.findById(id);
        if (!request) {
            throw new ApiError(404, 'Verification request not found');
        }

        if (request.status !== 'pending') {
            throw new ApiError(400, 'Can only fetch blockchain data for pending requests');
        }

        // Fetch fresh blockchain data
        console.log(`Fetching blockchain data for ${request.walletType} address: ${request.walletAddress}`);
        const blockchainData = await fetchCompleteWalletData(request.walletAddress, request.walletType);
        console.log('Blockchain data result:', {
            balance: blockchainData.balance,
            transactionCount: blockchainData.transactionCount,
            transactionsLength: blockchainData.transactions?.length || 0,
            error: blockchainData.error
        });

        // Update the request with fresh data
        request.blockchainData = {
            balance: blockchainData.balance,
            transactionCount: blockchainData.transactionCount,
            latestTransactions: blockchainData.transactions,
            lastFetched: new Date()
        };

        await request.save();

        res.json({
            success: true,
            message: 'Blockchain data refreshed successfully',
            data: {
                balance: blockchainData.balance,
                transactionCount: blockchainData.transactionCount,
                latestTransactions: blockchainData.transactions,
                lastFetched: new Date(),
                error: blockchainData.error
            }
        });

    } catch (error) {
        next(error);
    }
};

// Approve verification request (admin only)
export const approveVerificationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const request = await WalletVerificationRequest.findById(id).populate('userId');
        if (!request) {
            throw new ApiError(404, 'Verification request not found');
        }

        if (request.status !== 'pending') {
            throw new ApiError(400, `Request is already ${request.status}`);
        }

        // Update request status
        request.status = 'approved';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        await request.save();

        // Update user's wallet verification status
        const user = await User.findById(request.userId._id);
        if (user) {
            user.walletVerified = true;
            await user.save();
        }

        res.json({
            success: true,
            message: 'Wallet verification approved successfully',
            data: request
        });

    } catch (error) {
        next(error);
    }
};

// Reject verification request (admin only)
export const rejectVerificationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const adminId = req.user._id;

        if (!rejectionReason || !rejectionReason.trim()) {
            throw new ApiError(400, 'Rejection reason is required');
        }

        const request = await WalletVerificationRequest.findById(id);
        if (!request) {
            throw new ApiError(404, 'Verification request not found');
        }

        if (request.status !== 'pending') {
            throw new ApiError(400, `Request is already ${request.status}`);
        }

        // Update request status
        request.status = 'rejected';
        request.rejectionReason = rejectionReason.trim();
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        await request.save();

        res.json({
            success: true,
            message: 'Wallet verification rejected successfully',
            data: request
        });

    } catch (error) {
        next(error);
    }
};

// Get verification statistics (admin only)
export const getVerificationStatistics = async (req, res, next) => {
    try {
        const stats = await WalletVerificationRequest.aggregate([
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    pendingRequests: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    approvedRequests: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    rejectedRequests: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                    }
                }
            }
        ]);

        const walletTypeStats = await WalletVerificationRequest.aggregate([
            {
                $group: {
                    _id: '$walletType',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalRequests: stats[0]?.totalRequests || 0,
                pendingRequests: stats[0]?.pendingRequests || 0,
                approvedRequests: stats[0]?.approvedRequests || 0,
                rejectedRequests: stats[0]?.rejectedRequests || 0,
                walletTypeBreakdown: walletTypeStats
            }
        });

    } catch (error) {
        next(error);
    }
};
