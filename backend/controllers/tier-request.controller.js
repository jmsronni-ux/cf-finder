import mongoose from "mongoose";
import TierRequest from "../models/tier-request.model.js";
import User from "../models/user.model.js";
import WithdrawRequest from "../models/withdraw-request.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { getTierInfo } from "../utils/tier-system.js";
import { sendTierRequestSubmittedEmail, sendTierRequestApprovedEmail, sendTierRequestRejectedEmail } from "../services/email.service.js";
import { sendTierNotification } from "../services/telegram.service.js";

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

        // NEW CHECK: Verify all network rewards from ALL completed levels have been withdrawn
        // by checking approved WithdrawRequest history per level
        const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
        const levelsWithRemainingRewards = [];

        for (let level = 1; level <= user.tier; level++) {
            const animField = `lvl${level}anim`;
            const levelCompleted = user[animField] === 1;
            if (!levelCompleted) {
                continue;
            }

            const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
            const levelNetworkRewards = user[levelNetworkRewardsField] || {};

            // Networks that actually have non-zero rewards for this level
            const networksWithAmounts = networks.filter(network => {
                const amount = Number(levelNetworkRewards[network] || 0);
                return amount > 0;
            });

            if (networksWithAmounts.length === 0) {
                continue;
            }

            // Build set of withdrawn networks for this level from approved requests
            const approvedRequests = await WithdrawRequest.find({ userId, status: 'approved', level });
            const withdrawnSet = new Set();
            approvedRequests.forEach(req => {
                (req.networks || []).forEach(n => withdrawnSet.add(String(n).toUpperCase()));
            });

            // Remaining networks are those with amounts but not in withdrawn set
            const remaining = networksWithAmounts.filter(n => !withdrawnSet.has(n));
            if (remaining.length > 0) {
                levelsWithRemainingRewards.push({ level, networks: remaining });
            }
        }

        if (levelsWithRemainingRewards.length > 0) {
            const levelsList = levelsWithRemainingRewards.map(l => `Level ${l.level} (${l.networks.join(', ')})`).join('; ');
            throw new ApiError(400, `You must withdraw all network rewards before upgrading. Remaining: ${levelsList}`);
        }

        // Create the tier request
        const tierRequest = await TierRequest.create({
            userId,
            requestedTier,
            currentTier: user.tier
        });

        const tierInfo = getTierInfo(requestedTier);
        const currentTierInfo = getTierInfo(user.tier);

        // Send confirmation email to user
        sendTierRequestSubmittedEmail(
            user.email,
            user.name,
            user.tier,
            currentTierInfo.name,
            requestedTier,
            tierInfo.name,
            tierRequest._id
        ).catch(err => console.error('Failed to send tier request submitted email:', err));

        // Send Telegram notification to admin
        sendTierNotification(user, tierRequest).catch(err => console.error('Failed to send Telegram tier notification:', err));

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
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();

        const query = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query.status = status;
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const matchedUsers = await User.find({
                $or: [{ name: searchRegex }, { email: searchRegex }]
            }).select('_id');
            const userIds = matchedUsers.map(user => user._id);

            query.$or = [
                { userId: { $in: userIds } }
            ];

            if (mongoose.Types.ObjectId.isValid(search)) {
                query.$or.push({ _id: search });
            }
        }

        const total = await TierRequest.countDocuments(query);
        const requests = await TierRequest.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('userId', 'name email tier balance')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Tier requests retrieved successfully",
            data: {
                requests,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit) || 1
                }
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
        const currentTierInfo = getTierInfo(tierRequest.currentTier);

        // Send email notification to user
        sendTierRequestApprovedEmail(
            user.email,
            user.name,
            tierRequest.currentTier,
            currentTierInfo.name,
            tierRequest.requestedTier,
            tierInfo.name,
            tierRequest._id
        ).catch(err => console.error('Failed to send tier request approved email:', err));

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

        // Get user and tier info for email
        const user = await User.findById(tierRequest.userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const tierInfo = getTierInfo(tierRequest.requestedTier);
        const currentTierInfo = getTierInfo(tierRequest.currentTier);

        // Update tier request status
        tierRequest.status = 'rejected';
        tierRequest.reviewedBy = adminId;
        tierRequest.reviewedAt = new Date();
        tierRequest.adminNote = adminNote || 'Request rejected by admin';
        tierRequest.updatedAt = new Date();
        await tierRequest.save();

        // Send email notification to user
        sendTierRequestRejectedEmail(
            user.email,
            user.name,
            tierRequest.currentTier,
            currentTierInfo.name,
            tierRequest.requestedTier,
            tierInfo.name,
            tierRequest._id,
            adminNote || ''
        ).catch(err => console.error('Failed to send tier request rejected email:', err));

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

