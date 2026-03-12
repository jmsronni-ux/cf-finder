import KeyGenerationRequest from "../models/key-generation-request.model.js";
import User from "../models/user.model.js";
import GlobalSettings from "../models/global-settings.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

// Apply for key generation (User)
export const createKeyGenerationRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { level, keysCount, nodeId, nodeAmount } = req.body;

        if (!level || !keysCount || keysCount < 1 || !nodeId) {
            throw new ApiError(400, "Level, valid keysCount, and nodeId are required");
        }

        // Get current block price
        let settings = await GlobalSettings.findById('global_settings');
        const price = settings?.directAccessKeyPrice || 20;
        const totalCost = price * keysCount;

        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check if node is already success
        if (user.nodeProgress && user.nodeProgress.get(nodeId) === 'success') {
            throw new ApiError(400, "Node is already successfully unlocked");
        }

        // Check if user has sufficient availableBalance
        if (user.availableBalance < totalCost) {
            throw new ApiError(400, `Insufficient available balance to generate ${keysCount} keys. Required: $${totalCost}, Available: $${user.availableBalance}`);
        }

        // Check if there is already a pending request for this user and node
        const pendingRequest = await KeyGenerationRequest.findOne({
            userId,
            nodeId,
            status: 'pending'
        }).session(session);

        if (pendingRequest) {
            throw new ApiError(400, "You already have a pending key generation request for this node");
        }

        // Deduct from availableBalance
        user.availableBalance -= totalCost;

        // Update user nodeProgress to pending
        if (!user.nodeProgress) user.nodeProgress = new Map();
        user.nodeProgress.set(nodeId, 'pending');
        await user.save({ session });

        // Create the request
        const request = await KeyGenerationRequest.create([{
            userId,
            nodeId,
            nodeAmount: nodeAmount || 0,
            level,
            keysCount,
            directAccessKeyPrice: price,
            totalCost,
            status: 'pending',
            nodeStatus: 'pending'
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Key generation request submitted successfully",
            data: request[0]
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error creating key generation request:', error);
        next(error);
    } finally {
        session.endSession();
    }
};

// Get my requests (User)
export const getMyRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const requests = await KeyGenerationRequest.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Get all requests (Admin)
export const getAllRequests = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { status, limit = 50, page = 1 } = req.query;
        const query = {};

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await KeyGenerationRequest.countDocuments(query);

        const requests = await KeyGenerationRequest.find(query)
            .populate('userId', 'name email tier')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data: {
                requests,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Approve request (Admin)
export const approveRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;
        const { approvedAmount, adminComment, nodeStatusOutcome } = req.body;

        // nodeStatusOutcome is required for new requests, defaulting to 'success' for backwards compatibility
        const finalNodeStatus = nodeStatusOutcome || 'success';

        if (approvedAmount === undefined || approvedAmount < 0) {
            throw new ApiError(400, "Valid approvedAmount is required");
        }

        const request = await KeyGenerationRequest.findById(id).session(session);
        if (!request) {
            throw new ApiError(404, "Request not found");
        }

        if (request.status !== 'pending') {
            throw new ApiError(400, `Request is already ${request.status}`);
        }

        const user = await User.findById(request.userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Approve and give user the approvedAmount to their DASHBOARD balance
        user.balance += Number(approvedAmount);

        // Update user nodeProgress based on admin decision
        if (request.nodeId) {
            if (!user.nodeProgress) user.nodeProgress = new Map();
            user.nodeProgress.set(request.nodeId, finalNodeStatus);
        }

        await user.save({ session });

        request.status = 'approved';
        request.nodeStatus = finalNodeStatus;
        request.approvedAmount = Number(approvedAmount);
        request.adminComment = adminComment || '';
        request.processedBy = req.user._id;
        request.processedAt = new Date();
        await request.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Request approved successfully and balance credited",
            data: request
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// Reject request (Admin)
export const rejectRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;
        const { adminComment } = req.body;

        const request = await KeyGenerationRequest.findById(id).session(session);
        if (!request) {
            throw new ApiError(404, "Request not found");
        }

        if (request.status !== 'pending') {
            throw new ApiError(400, `Request is already ${request.status}`);
        }

        const user = await User.findById(request.userId).session(session);
        if (user) {
            // Refund the availableBalance
            user.availableBalance += request.totalCost;

            // Mark node as failed so user can try again
            if (request.nodeId) {
                if (!user.nodeProgress) user.nodeProgress = new Map();
                user.nodeProgress.set(request.nodeId, 'fail');
            }
            await user.save({ session });
        }

        request.status = 'rejected';
        request.nodeStatus = 'fail';
        request.adminComment = adminComment || '';
        request.processedBy = req.user._id;
        request.processedAt = new Date();
        await request.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Request rejected successfully and cost refunded",
            data: request
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
