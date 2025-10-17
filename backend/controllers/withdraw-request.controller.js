import WithdrawRequest from '../models/withdraw-request.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// User creates a withdraw request
export const createWithdrawRequest = async (req, res, next) => {
    try {
        const { amount, wallet, networks, networkRewards, withdrawAll } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        if (!wallet || !wallet.trim()) {
            throw new ApiError(400, 'Wallet address is required');
        }

        // Check if user has sufficient balance
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        if (user.balance < amount) {
            throw new ApiError(400, `Insufficient balance. Available: $${user.balance}`);
        }

        const withdrawRequest = await WithdrawRequest.create({
            userId,
            amount,
            walletAddress: wallet.trim(),
            networks: networks || [],
            networkRewards: networkRewards || {},
            withdrawAll: withdrawAll || false
        });

        res.status(201).json({
            success: true,
            message: 'Withdraw request created successfully',
            data: withdrawRequest
        });
    } catch (error) {
        next(error);
    }
};

// Get all withdraw requests (admin only)
export const getAllWithdrawRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const requests = await WithdrawRequest.find(filter)
            .populate('userId', 'name email balance tier phone')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Get user's own withdraw requests
export const getMyWithdrawRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const requests = await WithdrawRequest.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Approve withdraw request (admin only)
// Admin provides their wallet address and amount for user to send TO
export const approveWithdrawRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { confirmedWallet, confirmedAmount } = req.body;
        const adminId = req.user._id;

        // Validate admin inputs - these are admin's receiving wallet and amount
        if (!confirmedWallet || !confirmedWallet.trim()) {
            throw new ApiError(400, 'Admin receiving wallet address is required');
        }

        if (!confirmedAmount || confirmedAmount <= 0) {
            throw new ApiError(400, 'Amount for user to send must be greater than 0');
        }

        const withdrawRequest = await WithdrawRequest.findById(requestId).populate('userId');

        if (!withdrawRequest) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        if (withdrawRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${withdrawRequest.status}`);
        }

        // Update user balance (deduct the confirmed amount)
        const user = await User.findById(withdrawRequest.userId._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        if (user.balance < confirmedAmount) {
            throw new ApiError(400, 'Insufficient balance for confirmed amount');
        }

        user.balance -= confirmedAmount;
        await user.save();

        // Update request status with admin-confirmed values
        withdrawRequest.status = 'approved';
        withdrawRequest.confirmedWallet = confirmedWallet.trim();
        withdrawRequest.confirmedAmount = confirmedAmount;
        withdrawRequest.processedAt = new Date();
        withdrawRequest.processedBy = adminId;
        await withdrawRequest.save();

        res.status(200).json({
            success: true,
            message: 'Withdraw request approved successfully',
            data: {
                request: withdrawRequest,
                newBalance: user.balance
            }
        });
    } catch (error) {
        next(error);
    }
};

// Reject withdraw request (admin only)
export const rejectWithdrawRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { notes } = req.body;
        const adminId = req.user._id;

        const withdrawRequest = await WithdrawRequest.findById(requestId);

        if (!withdrawRequest) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        if (withdrawRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${withdrawRequest.status}`);
        }

        withdrawRequest.status = 'rejected';
        withdrawRequest.processedAt = new Date();
        withdrawRequest.processedBy = adminId;
        if (notes) {
            withdrawRequest.notes = notes;
        }
        await withdrawRequest.save();

        res.status(200).json({
            success: true,
            message: 'Withdraw request rejected',
            data: withdrawRequest
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createWithdrawRequest,
    getAllWithdrawRequests,
    getMyWithdrawRequests,
    approveWithdrawRequest,
    rejectWithdrawRequest
};
