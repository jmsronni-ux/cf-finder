import TopupRequest from '../models/topup-request.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// User creates a top-up request
export const createTopupRequest = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        const topupRequest = await TopupRequest.create({
            userId,
            amount
        });

        res.status(201).json({
            success: true,
            message: 'Top-up request created successfully',
            data: topupRequest
        });
    } catch (error) {
        next(error);
    }
};

// Get all top-up requests (admin only)
export const getAllTopupRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const requests = await TopupRequest.find(filter)
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

// Get user's own top-up requests
export const getMyTopupRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const requests = await TopupRequest.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Approve top-up request (admin only)
export const approveTopupRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const adminId = req.user._id;

        const topupRequest = await TopupRequest.findById(requestId).populate('userId');

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        if (topupRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${topupRequest.status}`);
        }

        // Update user balance
        const user = await User.findById(topupRequest.userId._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        user.balance += topupRequest.amount;
        await user.save();

        // Update request status
        topupRequest.status = 'approved';
        topupRequest.processedAt = new Date();
        topupRequest.processedBy = adminId;
        await topupRequest.save();

        res.status(200).json({
            success: true,
            message: 'Top-up request approved successfully',
            data: {
                request: topupRequest,
                newBalance: user.balance
            }
        });
    } catch (error) {
        next(error);
    }
};

// Reject top-up request (admin only)
export const rejectTopupRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { notes } = req.body;
        const adminId = req.user._id;

        const topupRequest = await TopupRequest.findById(requestId);

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        if (topupRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${topupRequest.status}`);
        }

        topupRequest.status = 'rejected';
        topupRequest.processedAt = new Date();
        topupRequest.processedBy = adminId;
        if (notes) {
            topupRequest.notes = notes;
        }
        await topupRequest.save();

        res.status(200).json({
            success: true,
            message: 'Top-up request rejected',
            data: topupRequest
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createTopupRequest,
    getAllTopupRequests,
    getMyTopupRequests,
    approveTopupRequest,
    rejectTopupRequest
};



