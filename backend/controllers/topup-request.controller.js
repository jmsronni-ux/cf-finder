import mongoose from 'mongoose';
import TopupRequest from '../models/topup-request.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendTopupRequestSubmittedEmail, sendTopupRequestApprovedEmail, sendTopupRequestRejectedEmail } from '../services/email.service.js';
import { sendTopupNotification } from '../services/telegram.service.js';

// User creates a top-up request
export const createTopupRequest = async (req, res, next) => {
    try {
        const { amount, cryptocurrency } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const topupRequest = await TopupRequest.create({
            userId,
            amount,
            cryptocurrency: cryptocurrency || 'BTC'
        });

        // Send confirmation email to user
        sendTopupRequestSubmittedEmail(
            user.email,
            user.name,
            amount,
            cryptocurrency || 'BTC',
            topupRequest._id
        ).catch(err => console.error('Failed to send topup request submitted email:', err));

        // Send Telegram notification to admin
        sendTopupNotification(user, topupRequest).catch(err => console.error('Failed to send Telegram topup notification:', err));

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
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();

        const filter = {};
        if (status) {
            filter.status = status;
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const matchedUsers = await User.find({
                $or: [{ name: searchRegex }, { email: searchRegex }]
            }).select('_id');
            const userIds = matchedUsers.map(user => user._id);

            filter.$or = [
                { userId: { $in: userIds } }
            ];

            if (mongoose.Types.ObjectId.isValid(search)) {
                filter.$or.push({ _id: search });
            }
        }

        const total = await TopupRequest.countDocuments(filter);
        const requests = await TopupRequest.find(filter)
            .populate('userId', 'name email balance tier phone')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
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
        const { approvedAmount } = req.body;
        const adminId = req.user._id;

        const topupRequest = await TopupRequest.findById(requestId).populate('userId');

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        if (topupRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${topupRequest.status}`);
        }

        // Determine the amount to add (use approvedAmount if provided, otherwise use original amount)
        const amountToAdd = approvedAmount !== undefined && approvedAmount !== null
            ? Number(approvedAmount)
            : topupRequest.amount;

        // Validate the approved amount
        if (amountToAdd < 0) {
            throw new ApiError(400, 'Approved amount cannot be negative');
        }

        // Update user balance
        const user = await User.findById(topupRequest.userId._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        user.balance += amountToAdd;
        await user.save();

        // Update request status
        topupRequest.status = 'approved';
        topupRequest.processedAt = new Date();
        topupRequest.processedBy = adminId;
        topupRequest.approvedAmount = amountToAdd;
        await topupRequest.save();

        // Send email notification to user
        sendTopupRequestApprovedEmail(
            user.email,
            user.name,
            amountToAdd,
            topupRequest.cryptocurrency,
            user.balance,
            topupRequest._id
        ).catch(err => console.error('Failed to send topup request approved email:', err));

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

        const topupRequest = await TopupRequest.findById(requestId).populate('userId');

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

        // Send email notification to user
        if (topupRequest.userId) {
            const user = await User.findById(topupRequest.userId._id);
            if (user) {
                sendTopupRequestRejectedEmail(
                    user.email,
                    user.name,
                    topupRequest.amount,
                    topupRequest.cryptocurrency,
                    topupRequest._id,
                    notes || ''
                ).catch(err => console.error('Failed to send topup request rejected email:', err));
            }
        }

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



