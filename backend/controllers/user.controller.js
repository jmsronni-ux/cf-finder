import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { getTierInfo } from "../utils/tier-system.js";
import mongoose from "mongoose";

export const getAllUsers = async (req, res, next) => {
    try { 
        const users = await User.find();
        res.status(200).json({ success: true, message: "Users fetched successfully", data: users });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json({ success: true, message: "User fetched successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.create(req.body, { session });
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ success: true, message: "User created successfully", data: user });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const updateUser = async (req, res, next) => {       
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "User updated successfully", data: user });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findByIdAndDelete(req.params.id, { session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "User deleted successfully", data: user });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// Get authenticated user's wallets
export const getMyWallets = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('wallets');
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json({ success: true, data: user.wallets || {} });
    } catch (error) {
        next(error);
    }
};

// Update authenticated user's wallets
export const updateMyWallets = async (req, res, next) => {
    try {
        const { wallets } = req.body || {};
        if (!wallets || typeof wallets !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid wallets payload' });
        }

        // Import wallet validation
        const { validateWalletAddress } = await import('../utils/wallet-validation.js');

        // Whitelist fields and build update object with dot notation
        const allowed = ['btc', 'eth', 'tron', 'usdtErc20', 'custom'];
        const update = {};
        
        for (const key of allowed) {
            if (key in wallets) {
                // Skip validation for empty strings (removing wallet)
                if (wallets[key] && wallets[key].trim()) {
                    // Validate wallet address
                    const validation = validateWalletAddress(wallets[key], key);
                    if (!validation.isValid) {
                        return res.status(400).json({ 
                            success: false, 
                            message: validation.error || 'Invalid wallet address' 
                        });
                    }
                }
                update[`wallets.${key}`] = wallets[key];
            }
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid wallet fields provided' });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('wallets');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'Wallets updated', data: updated.wallets || {} });
    } catch (error) {
        console.error('Error updating wallets:', error);
        next(error);
    }
};

// Get all users with their level rewards (Admin only)
export const getAllUsersWithRewards = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Admin privileges required." 
            });
        }

        const users = await User.find()
            .select('name email balance tier lvl1reward lvl2reward lvl3reward lvl4reward lvl5reward lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim wallets createdAt')
            .sort({ createdAt: -1 });
        
        // Import wallet balance utility
        const { getAllWalletBalances } = await import('../utils/wallet-balance.js');
        
        // Fetch balances for all users in parallel (with rate limiting)
        const usersWithBalances = await Promise.all(
            users.map(async (user) => {
                const userObj = user.toObject();
                
                // Fetch wallet balances
                if (userObj.wallets) {
                    try {
                        userObj.walletBalances = await getAllWalletBalances(userObj.wallets);
                    } catch (error) {
                        console.error(`Error fetching balances for user ${userObj._id}:`, error.message);
                        userObj.walletBalances = {};
                    }
                } else {
                    userObj.walletBalances = {};
                }
                
                return userObj;
            })
        );
        
        res.status(200).json({ 
            success: true, 
            message: "Users fetched successfully", 
            data: usersWithBalances 
        });
    } catch (error) {
        console.error('Error fetching users with rewards:', error);
        next(error);
    }
};

// Update user level rewards (Admin only)
export const updateUserLevelRewards = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Admin privileges required." 
            });
        }

        const { userId } = req.params;
        const { lvl1reward, lvl2reward, lvl3reward, lvl4reward, lvl5reward } = req.body;

        // Validate that at least one reward is provided
        if (lvl1reward === undefined && lvl2reward === undefined && 
            lvl3reward === undefined && lvl4reward === undefined && 
            lvl5reward === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: "At least one level reward must be provided" 
            });
        }

        // Build update object only with provided fields
        const updateFields = {};
        if (lvl1reward !== undefined) updateFields.lvl1reward = Number(lvl1reward);
        if (lvl2reward !== undefined) updateFields.lvl2reward = Number(lvl2reward);
        if (lvl3reward !== undefined) updateFields.lvl3reward = Number(lvl3reward);
        if (lvl4reward !== undefined) updateFields.lvl4reward = Number(lvl4reward);
        if (lvl5reward !== undefined) updateFields.lvl5reward = Number(lvl5reward);

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('name email lvl1reward lvl2reward lvl3reward lvl4reward lvl5reward');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Level rewards updated successfully", 
            data: user 
        });
    } catch (error) {
        console.error('Error updating user level rewards:', error);
        next(error);
    }
};

// Tier prices functionality has been removed - users now request tier upgrades from admin
// See tier-request.controller.js for the new tier upgrade request system

// Admin function to directly change any user's tier
export const adminChangeUserTier = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { newTier, reason, skipWithdrawalCheck = false } = req.body;
        const adminId = req.user._id;

        console.log('[Admin Tier Change] Request received:', {
            userId,
            newTier,
            reason,
            adminId,
            body: req.body
        });

        // Validate new tier
        if (!newTier || newTier < 0 || newTier > 5) {
            console.log('[Admin Tier Change] Validation failed - invalid tier:', newTier);
            throw new ApiError(400, 'Invalid tier. Must be between 0 and 5.');
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found.');
        }

        const oldTier = user.tier || 0;
        const tierInfo = getTierInfo(newTier);

        // Log the tier change
        console.log(`[Admin Tier Change] Admin ${adminId} changing user ${userId} from tier ${oldTier} to tier ${newTier}. Reason: ${reason || 'No reason provided'}`);

        // Update user's tier
        user.tier = newTier;
        user.updatedAt = new Date();
        await user.save();

        // Create audit log entry (optional - you can add this to a separate audit model)
        const auditLog = {
            action: 'tier_change',
            adminId,
            userId,
            oldTier,
            newTier,
            reason: reason || 'Direct admin tier change',
            timestamp: new Date(),
            skipWithdrawalCheck
        };

        console.log('[Audit Log]', auditLog);

        res.status(200).json({
            success: true,
            message: `User tier changed from ${oldTier} to ${newTier} successfully`,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    oldTier,
                    newTier,
                    tierName: tierInfo.name,
                    updatedAt: user.updatedAt
                },
                auditLog: {
                    action: auditLog.action,
                    oldTier: auditLog.oldTier,
                    newTier: auditLog.newTier,
                    reason: auditLog.reason,
                    timestamp: auditLog.timestamp
                }
            }
        });

    } catch (error) {
        console.error('Error changing user tier:', error);
        next(error);
    }
};

// Admin function to get user tier management info
export const getUserTierManagementInfo = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new ApiError(404, 'User not found.');
        }

        const currentTier = user.tier || 0;
        const tierInfo = getTierInfo(currentTier);

        // Get completed levels
        const completedLevels = [];
        for (let level = 1; level <= 5; level++) {
            const animField = `lvl${level}anim`;
            if (user[animField] === 1) {
                completedLevels.push(level);
            }
        }

        // Get tier history (if you have a tier history model)
        const tierHistory = [
            {
                tier: currentTier,
                name: tierInfo.name,
                changedAt: user.updatedAt,
                reason: 'Current tier'
            }
        ];

        res.status(200).json({
            success: true,
            message: 'User tier management info retrieved successfully',
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    currentTier,
                    tierName: tierInfo.name,
                    balance: user.balance,
                    completedLevels,
                    joinedAt: user.createdAt
                },
                tierHistory,
                availableTiers: [
                    { tier: 0, name: 'Basic (No Tier)', description: 'Starting tier' },
                    { tier: 1, name: 'Standard', description: 'Basic access level' },
                    { tier: 2, name: 'Professional', description: 'Enhanced features' },
                    { tier: 3, name: 'Enterprise', description: 'Advanced features' },
                    { tier: 4, name: 'Premium', description: 'Premium features' },
                    { tier: 5, name: 'VIP', description: 'Highest tier with all features' }
                ]
            }
        });

    } catch (error) {
        console.error('Error getting user tier management info:', error);
        next(error);
    }
};