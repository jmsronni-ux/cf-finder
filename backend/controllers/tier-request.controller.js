import TierRequest from "../models/tier-request.model.js";
import User from "../models/user.model.js";
import WithdrawalRequest from "../models/withdrawal-request.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { getTierInfo } from "../utils/tier-system.js";

// User creates a tier upgrade request
export const createTierRequest = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.userId;
        const { requestedTier } = req.body;

        console.log('Creating tier request - userId:', userId, 'requestedTier:', requestedTier);

        // Validate requested tier
        if (!requestedTier || requestedTier < 1 || requestedTier > 5) {
            throw new ApiError(400, "Invalid tier. Must be between 1 and 5");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check if requested tier is higher than current
        if (requestedTier <= user.tier) {
            throw new ApiError(400, "Requested tier must be higher than current tier");
        }

        // Check if user already has a pending request for this tier
        const existingPendingRequest = await TierRequest.findOne({
            userId,
            requestedTier,
            status: 'pending'
        });

        if (existingPendingRequest) {
            throw new ApiError(400, "You already have a pending request for this tier");
        }

        // Check withdrawal requirements - user must have withdrawn all completed level rewards
        const completedLevels = [];
        for (let level = 1; level <= user.tier; level++) {
            const animField = `lvl${level}anim`;
            if (user[animField] === 1) {
                completedLevels.push(level);
            }
        }

        if (completedLevels.length > 0) {
            // Check withdrawal requests for completed levels
            const withdrawalRequests = await WithdrawalRequest.find({
                userId,
                level: { $in: completedLevels },
                status: { $in: ['completed'] }
            });

            const levelsWithWithdrawals = withdrawalRequests.map(req => req.level);
            const levelsWithoutWithdrawals = completedLevels.filter(level => !levelsWithWithdrawals.includes(level));

            if (levelsWithoutWithdrawals.length > 0) {
                throw new ApiError(400, `You must withdraw rewards from completed levels before upgrading: ${levelsWithoutWithdrawals.join(', ')}. Please request withdrawals for these levels first.`);
            }
        }

        // Create the tier request
        const tierRequest = await TierRequest.create({
            userId,
            requestedTier,
            currentTier: user.tier
        });

        const tierInfo = getTierInfo(requestedTier);

        res.status(201).json({
            success: true,
            message: `Tier upgrade request for ${tierInfo.name} submitted successfully. Awaiting admin approval.`,
            data: {
                request: tierRequest
            }
        });

    } catch (error) {
        console.error('Error creating tier request:', error);
        next(error);
    }
};

// User gets their tier requests
export const getUserTierRequests = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.userId;

        const requests = await TierRequest.find({ userId })
            .sort({ createdAt: -1 })
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Tier requests retrieved successfully",
            data: {
                requests
            }
        });

    } catch (error) {
        console.error('Error fetching tier requests:', error);
        next(error);
    }
};

// Admin gets all tier requests
export const getAllTierRequests = async (req, res, next) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query.status = status;
        }

        const requests = await TierRequest.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name email tier balance')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Tier requests retrieved successfully",
            data: {
                requests
            }
        });

    } catch (error) {
        console.error('Error fetching all tier requests:', error);
        next(error);
    }
};

// Admin approves tier request and upgrades user
export const approveTierRequest = async (req, res, next) => {
    try {
        const adminId = req.user?._id || req.user?.userId;
        const { requestId } = req.params;
        const { adminNote } = req.body;

        console.log('Approving tier request - requestId:', requestId, 'adminId:', adminId);

        const tierRequest = await TierRequest.findById(requestId);
        if (!tierRequest) {
            throw new ApiError(404, "Tier request not found");
        }

        if (tierRequest.status !== 'pending') {
            throw new ApiError(400, `This request has already been ${tierRequest.status}`);
        }

        const user = await User.findById(tierRequest.userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Verify the requested tier is still valid
        if (tierRequest.requestedTier <= user.tier) {
            throw new ApiError(400, "User's current tier is already equal to or higher than requested tier");
        }

        // Reset animation flags for the current tier level and all levels above
        // This ensures users can watch the tier animation again when they get that tier
        // Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
        for (let level = tierRequest.requestedTier; level <= 5; level++) {
            const animField = `lvl${level}anim`;
            user[animField] = 0;
        }

        // Update user's tier
        user.tier = tierRequest.requestedTier;
        user.updatedAt = new Date();
        await user.save();

        // Update tier request status
        tierRequest.status = 'approved';
        tierRequest.reviewedBy = adminId;
        tierRequest.reviewedAt = new Date();
        tierRequest.adminNote = adminNote || '';
        tierRequest.updatedAt = new Date();
        await tierRequest.save();

        const tierInfo = getTierInfo(tierRequest.requestedTier);

        res.status(200).json({
            success: true,
            message: `Tier request approved. User upgraded to ${tierInfo.name}`,
            data: {
                request: tierRequest,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    tier: user.tier
                }
            }
        });

    } catch (error) {
        console.error('Error approving tier request:', error);
        next(error);
    }
};

// Admin rejects tier request
export const rejectTierRequest = async (req, res, next) => {
    try {
        const adminId = req.user?._id || req.user?.userId;
        const { requestId } = req.params;
        const { adminNote } = req.body;

        console.log('Rejecting tier request - requestId:', requestId, 'adminId:', adminId);

        const tierRequest = await TierRequest.findById(requestId);
        if (!tierRequest) {
            throw new ApiError(404, "Tier request not found");
        }

        if (tierRequest.status !== 'pending') {
            throw new ApiError(400, `This request has already been ${tierRequest.status}`);
        }

        // Update tier request status
        tierRequest.status = 'rejected';
        tierRequest.reviewedBy = adminId;
        tierRequest.reviewedAt = new Date();
        tierRequest.adminNote = adminNote || 'Request rejected by admin';
        tierRequest.updatedAt = new Date();
        await tierRequest.save();

        res.status(200).json({
            success: true,
            message: "Tier request rejected",
            data: {
                request: tierRequest
            }
        });

    } catch (error) {
        console.error('Error rejecting tier request:', error);
        next(error);
    }
};

// Admin can manually set user tier (keeping this for emergency use)
export const setUserTier = async (req, res, next) => {
    try {
        const { userId, tier } = req.body;

        // Validate tier
        if (!tier || tier < 1 || tier > 5) {
            throw new ApiError(400, "Invalid tier. Must be between 1 and 5");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const tierInfo = getTierInfo(tier);

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { tier, updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `User tier manually set to ${tierInfo.name}`,
            data: {
                user: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    tier: updatedUser.tier
                },
                tier: {
                    tier,
                    ...tierInfo
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

