import TransferRequest from "../models/transfer-request.model.js";
import User from "../models/user.model.js";
import GlobalSettings from "../models/global-settings.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

// Calculate fee based on mode and value
function calculateFee(amount, feeMode, feeValue) {
    if (!feeValue || feeValue <= 0) return 0;
    if (feeMode === 'percent') {
        return Math.round((amount * feeValue / 100) * 100) / 100;
    }
    // fixed
    return Math.min(feeValue, amount);
}

// User: create a transfer request (onchain → available)
export const createTransferRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, "Invalid transfer amount");
        }

        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user.balance < amount) {
            throw new ApiError(400, `Insufficient onchain balance. Available: $${user.balance}`);
        }

        // Get fee settings
        const settings = await GlobalSettings.findById('global_settings');
        const feeMode = settings?.transferFeeMode || 'fixed';
        const feeValue = settings?.transferFeeValue || 0;
        const feeAmount = calculateFee(amount, feeMode, feeValue);
        const netAmount = Math.round((amount - feeAmount) * 100) / 100;

        if (netAmount <= 0) {
            throw new ApiError(400, "Transfer amount is too small to cover the fee");
        }

        // Lock funds: deduct from onchain balance immediately
        user.balance -= amount;
        await user.save({ session });

        const transferRequest = await TransferRequest.create([{
            userId,
            amount,
            feeMode,
            feeValue,
            feeAmount,
            netAmount,
            direction: 'dashboard_to_available',
            status: 'pending'
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Transfer request submitted for admin approval",
            data: transferRequest[0]
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// User: get my transfer requests
export const getMyTransferRequests = async (req, res, next) => {
    try {
        const requests = await TransferRequest.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Admin: get all transfer requests with pagination
export const getAllTransferRequests = async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        let userIds = null;
        if (search) {
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            userIds = matchingUsers.map(u => u._id);
            filter.userId = { $in: userIds };
        }

        const total = await TransferRequest.countDocuments(filter);
        const requests = await TransferRequest.find(filter)
            .populate('userId', 'name email balance availableBalance tier')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin: approve a transfer request
export const approveTransferRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { requestId } = req.params;

        const transferRequest = await TransferRequest.findById(requestId).session(session);
        if (!transferRequest) {
            throw new ApiError(404, "Transfer request not found");
        }

        if (transferRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${transferRequest.status}`);
        }

        const user = await User.findById(transferRequest.userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Credit netAmount to available balance
        user.availableBalance += transferRequest.netAmount;
        await user.save({ session });

        transferRequest.status = 'approved';
        transferRequest.processedBy = req.user._id;
        transferRequest.processedAt = new Date();
        await transferRequest.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Transfer approved. $${transferRequest.netAmount} added to available balance (fee: $${transferRequest.feeAmount})`,
            data: transferRequest
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// Admin: reject a transfer request (refund locked funds)
export const rejectTransferRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { requestId } = req.params;
        const { adminNote } = req.body;

        const transferRequest = await TransferRequest.findById(requestId).session(session);
        if (!transferRequest) {
            throw new ApiError(404, "Transfer request not found");
        }

        if (transferRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${transferRequest.status}`);
        }

        const user = await User.findById(transferRequest.userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Refund the full locked amount back to onchain balance
        user.balance += transferRequest.amount;
        await user.save({ session });

        transferRequest.status = 'rejected';
        transferRequest.adminNote = adminNote || '';
        transferRequest.processedBy = req.user._id;
        transferRequest.processedAt = new Date();
        await transferRequest.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Transfer rejected. $${transferRequest.amount} refunded to onchain balance`,
            data: transferRequest
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
