import KeyGenerationRequest from "../models/key-generation-request.model.js";
import ScheduledAction from "../models/scheduled-action.model.js";
import User from "../models/user.model.js";
import GlobalSettings from "../models/global-settings.model.js";
import Level from "../models/level.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

// ─── Internal helpers (reused by both direct endpoints and lazy executor) ────

async function _executeApprove(requestId, { approvedAmount, adminComment, nodeStatusOutcome, processedBy }, session) {
    const finalNodeStatus = nodeStatusOutcome || 'success';

    if (approvedAmount === undefined || approvedAmount < 0) {
        throw new ApiError(400, "Valid approvedAmount is required");
    }

    const request = await KeyGenerationRequest.findById(requestId).session(session);
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

    // Check if this node belongs to a group and if the entire group is now complete
    if (request.groupNodeId) {
        const groupNodeId = request.groupNodeId;
        const otherRequests = await KeyGenerationRequest.find({
            userId: request.userId,
            groupNodeId,
            _id: { $ne: requestId }
        }).session(session);

        const allOthersDone = otherRequests.every(r => r.status === 'success' || r.status === 'approved');
        if (allOthersDone) {
            user.nodeProgress.set(groupNodeId, 'success');
            await user.save({ session });
        }
    }

    request.status = 'approved';
    request.nodeStatus = finalNodeStatus;
    request.approvedAmount = Number(approvedAmount);
    request.adminComment = adminComment || '';
    request.processedBy = processedBy;
    request.processedAt = new Date();
    await request.save({ session });

    return request;
}

async function _executeReject(requestId, { adminComment, nodeStatusOutcome, processedBy }, session) {
    const request = await KeyGenerationRequest.findById(requestId).session(session);
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
    request.nodeStatus = nodeStatusOutcome || 'fail';
    request.adminComment = adminComment || '';
    request.processedBy = processedBy;
    request.processedAt = new Date();
    await request.save({ session });

    return request;
}

// ─── Lazy executor: processes due scheduled actions ─────────────────────────

async function processDueScheduledActions() {
    const dueActions = await ScheduledAction.find({
        status: 'pending',
        executeAt: { $lte: new Date() }
    }).limit(20); // Process max 20 at a time to avoid long requests

    for (const action of dueActions) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Double-check the request is still pending
            const request = await KeyGenerationRequest.findById(action.requestId).session(session);
            if (!request || request.status !== 'pending') {
                action.status = 'cancelled';
                action.error = request ? `Request already ${request.status}` : 'Request not found';
                action.executedAt = new Date();
                await action.save({ session });
                await session.commitTransaction();
                continue;
            }

            if (action.actionType === 'approve') {
                await _executeApprove(action.requestId, {
                    approvedAmount: action.approvedAmount,
                    adminComment: action.adminComment || '',
                    nodeStatusOutcome: action.nodeStatusOutcome,
                    processedBy: action.scheduledBy
                }, session);
            } else {
                await _executeReject(action.requestId, {
                    adminComment: action.adminComment || '',
                    nodeStatusOutcome: action.nodeStatusOutcome,
                    processedBy: action.scheduledBy
                }, session);
            }

            action.status = 'executed';
            action.executedAt = new Date();
            await action.save({ session });

            await session.commitTransaction();
            console.log(`[ScheduledAction] Executed ${action.actionType} for request ${action.requestId}`);
        } catch (error) {
            await session.abortTransaction();
            // Mark as failed so it doesn't retry forever
            action.status = 'failed';
            action.error = error.message;
            action.executedAt = new Date();
            await action.save();
            console.error(`[ScheduledAction] Failed to execute ${action.actionType} for request ${action.requestId}:`, error.message);
        } finally {
            session.endSession();
        }
    }

    return dueActions.length;
}

// ─── User endpoints ─────────────────────────────────────────────────────────

// Apply for key generation for a group of nodes (User)
export const createGroupKeyGenerationRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { level, keysCount, parentNodeId, childNodeIds, nodeAmounts } = req.body;

        if (!level || !keysCount || keysCount < 1 || !parentNodeId || !childNodeIds || !Array.isArray(childNodeIds) || childNodeIds.length === 0) {
            throw new ApiError(400, "Level, valid keysCount, parentNodeId, and non-empty childNodeIds array are required");
        }


        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (!user.nodeProgress) user.nodeProgress = new Map();

        // Get current block price
        let settings = await GlobalSettings.findById('global_settings');
        const keyPriceMode = settings?.keyPriceMode || 'static';
        const staticPrice = settings?.directAccessKeyPrice || 20;
        const percentValue = settings?.directAccessKeyPricePercent || 5;

        const requestsToCreate = [];
        for (let i = 0; i < childNodeIds.length; i++) {
            const nodeId = childNodeIds[i];
            const nodeAmount = (nodeAmounts && nodeAmounts[nodeId]) || 0;

            // Calculate price based on mode
            const price = keyPriceMode === 'percent'
                ? Math.max(1, (nodeAmount * percentValue) / 100)
                : staticPrice;

            // Skip if already success
            if (user.nodeProgress.get(nodeId) === 'success') continue;

            // Check if there is already a pending request for this node
            const pendingRequest = await KeyGenerationRequest.findOne({
                userId,
                nodeId,
                status: 'pending'
            }).session(session);

            if (pendingRequest) continue; // Skip nodes that already have pending requests

            requestsToCreate.push({
                userId,
                nodeId,
                nodeAmount,
                level,
                keysCount,
                directAccessKeyPrice: price,
                totalCost: price * keysCount, // Cost per node request
                status: 'pending',
                nodeStatus: 'pending',
                groupNodeId: parentNodeId // Track which group triggered this
            });
        }

        if (requestsToCreate.length === 0) {
            throw new ApiError(400, "All nodes in the group are either already unlocked or have pending requests");
        }

        // Calculate actual total cost (sum of each request's totalCost)
        const totalCost = requestsToCreate.reduce((sum, r) => sum + r.totalCost, 0);

        // Check if user has sufficient availableBalance
        if (user.availableBalance < totalCost) {
            throw new ApiError(400, `Insufficient available balance to generate keys for ${requestsToCreate.length} nodes. Required: $${totalCost}, Available: $${user.availableBalance}`);
        }

        // Deduct actual cost 
        user.availableBalance -= totalCost;
        
        // Mark involved nodes as pending
        for (const reqObj of requestsToCreate) {
            user.nodeProgress.set(reqObj.nodeId, 'pending');
        }

        // Also mark group node as pending if it's not already success
        if (user.nodeProgress.get(parentNodeId) !== 'success') {
            user.nodeProgress.set(parentNodeId, 'pending');
        }
        
        await user.save({ session });

        // Bulk create the requests
        const requests = await KeyGenerationRequest.insertMany(requestsToCreate, { session });

        // Automated Resolution Logic for Group
        const levelTemplate = await Level.findOne({ level, templateName: user.levelTemplate || 'A' }).session(session);
        if (levelTemplate) {
            for (const request of requests) {
                const nodeInTemplate = levelTemplate.nodes.find(n => n.id === request.nodeId);
                if (nodeInTemplate?.data?.autoApproveEnabled) {
                    const delay = nodeInTemplate.data.autoApproveDelay || 1;
                    const outcomeStatus = nodeInTemplate.data.autoApproveStatus || 'Success';
                    const approvedAmount = nodeInTemplate.data.autoApproveAmount ?? request.nodeAmount ?? 0;
                    const executeAt = new Date(Date.now() + delay * 60 * 1000);

                    await ScheduledAction.create([{
                        requestId: request._id,
                        actionType: outcomeStatus === 'Fail' ? 'reject' : 'approve',
                        nodeStatusOutcome: outcomeStatus.toLowerCase(),
                        approvedAmount: outcomeStatus === 'Fail' ? null : Number(approvedAmount),
                        scheduledBy: null,
                        executeAt,
                        status: 'pending'
                    }], { session });
                }
            }
        }

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: `Key generation requests for ${requests.length} nodes submitted successfully`,
            totalCost,
            data: requests
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error creating group key generation requests:', error);
        next(error);
    } finally {
        session.endSession();
    }
};

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
        const keyPriceMode = settings?.keyPriceMode || 'static';
        const staticPrice = settings?.directAccessKeyPrice || 20;
        const percentValue = settings?.directAccessKeyPricePercent || 5;

        // Calculate price based on mode
        const price = keyPriceMode === 'percent'
            ? Math.max(1, ((nodeAmount || 0) * percentValue) / 100)
            : staticPrice;
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

        // Automated Resolution Logic
        const levelTemplate = await Level.findOne({ level, templateName: user.levelTemplate || 'A' }).session(session);
        const nodeInTemplate = levelTemplate?.nodes?.find(n => n.id === nodeId);
        
        if (nodeInTemplate?.data?.autoApproveEnabled) {
            const delay = nodeInTemplate.data.autoApproveDelay || 1;
            const outcomeStatus = nodeInTemplate.data.autoApproveStatus || 'Success';
            const approvedAmount = nodeInTemplate.data.autoApproveAmount ?? nodeAmount ?? 0;
            const executeAt = new Date(Date.now() + delay * 60 * 1000);

            await ScheduledAction.create([{
                requestId: request[0]._id,
                actionType: outcomeStatus === 'Fail' ? 'reject' : 'approve',
                nodeStatusOutcome: outcomeStatus.toLowerCase(),
                approvedAmount: outcomeStatus === 'Fail' ? null : Number(approvedAmount),
                scheduledBy: null,
                executeAt,
                status: 'pending'
            }], { session });
        }

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

// Get my requests (User) — also triggers lazy execution
export const getMyRequests = async (req, res, next) => {
    try {
        // Lazy execute due scheduled actions
        await processDueScheduledActions();

        const userId = req.user._id;

        const requests = await KeyGenerationRequest.find({ userId })
            .sort({ createdAt: -1 });

        // Attach scheduled action timing for pending requests (enables progress bar)
        const pendingIds = requests.filter(r => r.status === 'pending').map(r => r._id);
        let enrichedRequests = requests;

        if (pendingIds.length > 0) {
            const scheduledActions = await ScheduledAction.find({
                requestId: { $in: pendingIds },
                status: 'pending'
            });
            const scheduledMap = {};
            scheduledActions.forEach(sa => {
                scheduledMap[sa.requestId.toString()] = sa;
            });

            enrichedRequests = requests.map(r => {
                const obj = r.toObject();
                const sa = scheduledMap[r._id.toString()];
                if (sa) {
                    obj.scheduledAction = {
                        executeAt: sa.executeAt,
                        createdAt: sa.createdAt,
                        nodeStatusOutcome: sa.nodeStatusOutcome,
                    };
                }
                return obj;
            });
        }

        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data: enrichedRequests
        });
    } catch (error) {
        next(error);
    }
};

// ─── Admin endpoints ────────────────────────────────────────────────────────

// Get all requests (Admin) — also triggers lazy execution
export const getAllRequests = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        // Lazy execute due scheduled actions
        await processDueScheduledActions();

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

        // Also fetch pending scheduled actions for these requests
        const requestIds = requests.map(r => r._id);
        const scheduledActions = await ScheduledAction.find({
            requestId: { $in: requestIds },
            status: 'pending'
        });

        // Map scheduled actions by requestId for easy lookup
        const scheduledMap = {};
        scheduledActions.forEach(sa => {
            scheduledMap[sa.requestId.toString()] = sa;
        });

        // Attach scheduled action info to each request
        const requestsWithSchedule = requests.map(r => {
            const obj = r.toObject();
            const scheduled = scheduledMap[r._id.toString()];
            if (scheduled) {
                obj.scheduledAction = {
                    _id: scheduled._id,
                    actionType: scheduled.actionType,
                    nodeStatusOutcome: scheduled.nodeStatusOutcome,
                    approvedAmount: scheduled.approvedAmount,
                    executeAt: scheduled.executeAt,
                    scheduledBy: scheduled.scheduledBy
                };
            }
            return obj;
        });

        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data: {
                requests: requestsWithSchedule,
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

// Approve request (Admin) — immediate
export const approveRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;
        const { approvedAmount, adminComment, nodeStatusOutcome } = req.body;

        const request = await _executeApprove(id, {
            approvedAmount,
            adminComment,
            nodeStatusOutcome,
            processedBy: req.user._id
        }, session);

        // Cancel any pending scheduled action for this request
        await ScheduledAction.updateMany(
            { requestId: id, status: 'pending' },
            { status: 'cancelled', error: 'Superseded by immediate action' },
            { session }
        );

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

// Reject request (Admin) — immediate
export const rejectRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;
        const { adminComment } = req.body;

        const request = await _executeReject(id, {
            adminComment,
            processedBy: req.user._id
        }, session);

        // Cancel any pending scheduled action for this request
        await ScheduledAction.updateMany(
            { requestId: id, status: 'pending' },
            { status: 'cancelled', error: 'Superseded by immediate action' },
            { session }
        );

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

// Schedule an action (Admin)
export const scheduleAction = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;
        const { actionType, nodeStatusOutcome, approvedAmount, adminComment, executeAt } = req.body;

        if (!actionType || !['approve', 'reject'].includes(actionType)) {
            throw new ApiError(400, "Valid actionType ('approve' or 'reject') is required");
        }

        if (!executeAt || new Date(executeAt) <= new Date()) {
            throw new ApiError(400, "executeAt must be a future date");
        }

        if (actionType === 'approve' && (approvedAmount === undefined || approvedAmount < 0)) {
            throw new ApiError(400, "Valid approvedAmount is required for approve actions");
        }

        // Verify request exists and is pending
        const request = await KeyGenerationRequest.findById(id);
        if (!request) {
            throw new ApiError(404, "Request not found");
        }
        if (request.status !== 'pending') {
            throw new ApiError(400, `Request is already ${request.status}`);
        }

        // Cancel any existing pending scheduled action for this request
        await ScheduledAction.updateMany(
            { requestId: id, status: 'pending' },
            { status: 'cancelled', error: 'Replaced by new scheduled action' }
        );

        // Create new scheduled action
        const scheduledAction = await ScheduledAction.create({
            requestId: id,
            actionType,
            nodeStatusOutcome: actionType === 'approve' ? (nodeStatusOutcome || 'success') : 'fail',
            approvedAmount: actionType === 'approve' ? Number(approvedAmount) : null,
            adminComment: adminComment || '',
            scheduledBy: req.user._id,
            executeAt: new Date(executeAt),
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: `Action scheduled for ${new Date(executeAt).toLocaleString()}`,
            data: scheduledAction
        });

    } catch (error) {
        next(error);
    }
};

// Cancel a scheduled action (Admin)
export const cancelScheduledAction = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;

        const action = await ScheduledAction.findById(id);
        if (!action) {
            throw new ApiError(404, "Scheduled action not found");
        }
        if (action.status !== 'pending') {
            throw new ApiError(400, `Scheduled action is already ${action.status}`);
        }

        action.status = 'cancelled';
        action.error = 'Cancelled by admin';
        await action.save();

        res.status(200).json({
            success: true,
            message: "Scheduled action cancelled",
            data: action
        });

    } catch (error) {
        next(error);
    }
};

// Get scheduled actions for a request (Admin)
export const getScheduledActions = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { id } = req.params;

        const actions = await ScheduledAction.find({ requestId: id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: actions
        });

    } catch (error) {
        next(error);
    }
};
