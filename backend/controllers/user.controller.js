import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import ConversionRate from "../models/conversion-rate.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { getTierInfo } from "../utils/tier-system.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const getAllUsers = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();

        const filter = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];

            if (mongoose.Types.ObjectId.isValid(search)) {
                filter.$or.push({ _id: search });
            }
        }

        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users,
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
        // Get global rewards for all levels
        const globalRewards = await NetworkReward.find({ isActive: true });

        // Get conversion rates
        const conversionRates = await ConversionRate.find({});
        const conversionRatesMap = {};
        conversionRates.forEach(rate => {
            conversionRatesMap[rate.network] = rate.rateToUSD;
        });

        // Create user with global rewards populated
        const userData = { ...req.body };

        // Calculate level rewards (lvl1reward, lvl2reward, etc.) from network rewards and conversion rates
        const levelRewards = {};
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = globalRewards.filter(r => r.level === level && r.isActive);
            let totalUSDValue = 0;

            // Calculate total USD value for this level
            for (const reward of levelNetworkRewards) {
                const conversionRate = conversionRatesMap[reward.network] || 1;
                const usdValue = reward.rewardAmount * conversionRate;
                totalUSDValue += usdValue;
            }

            // Round to 2 decimal places
            levelRewards[`lvl${level}reward`] = Math.round(totalUSDValue * 100) / 100;
        }

        // Store commission percentages per level (use first network's commission for each level)
        const levelCommissions = {};
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = globalRewards.filter(r => r.level === level && r.isActive);
            let commissionPercent = 0;

            // Use the first network's commission percent for this level
            if (levelNetworkRewards.length > 0 && typeof levelNetworkRewards[0].commissionPercent === 'number') {
                commissionPercent = levelNetworkRewards[0].commissionPercent;
            }

            levelCommissions[`lvl${level}Commission`] = commissionPercent;
        }

        // Add calculated level rewards and commissions to user data
        Object.assign(userData, levelRewards, levelCommissions);

        // Populate network rewards for each level with global defaults
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = {};
            const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];

            for (const network of networks) {
                const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                levelNetworkRewards[network] = globalReward ? globalReward.rewardAmount : 0;
            }

            userData[`lvl${level}NetworkRewards`] = levelNetworkRewards;
        }

        const user = await User.create(userData, { session });
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ success: true, message: "User created successfully with global rewards", data: user });
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

// Update authenticated user's basic profile (name only)
export const updateMyProfile = async (req, res, next) => {
    try {
        const { name } = req.body || {};
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { name: name.trim(), updatedAt: new Date() } },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, message: 'Profile updated', data: updated });
    } catch (error) {
        next(error);
    }
};

// Change authenticated user's password
export const changeMyPassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        }

        // Fetch user including password hash
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        user.password = hashed;
        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
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

        // Fetch current user to compare wallets
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('wallets walletVerified');

        // Check if we need to reset wallet verification
        // Only reset if BTC wallet is being updated and it's different
        if (wallets.btc !== undefined) {
            const currentBtc = currentUser.wallets?.btc || '';
            const newBtc = wallets.btc || '';

            if (currentBtc !== newBtc) {
                // BTC wallet changed, reset verification
                await User.findByIdAndUpdate(req.user._id, { walletVerified: false });
                updated.walletVerified = false;
            }
        }

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Wallets updated. Wallet verification status has been reset.',
            data: {
                wallets: updated.wallets || {},
                walletVerified: updated.walletVerified
            }
        });
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
            .select('name email balance tier lvl1reward lvl2reward lvl3reward lvl4reward lvl5reward lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim lvl1Commission lvl2Commission lvl3Commission lvl4Commission lvl5Commission wallets createdAt')
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
        if (!newTier || newTier < 1 || newTier > 5) {
            console.log('[Admin Tier Change] Validation failed - invalid tier:', newTier);
            throw new ApiError(400, 'Invalid tier. Must be between 1 and 5.');
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found.');
        }

        const oldTier = user.tier || 1;
        const tierInfo = getTierInfo(newTier);

        // Log the tier change
        console.log(`[Admin Tier Change] Admin ${adminId} changing user ${userId} from tier ${oldTier} to tier ${newTier}. Reason: ${reason || 'No reason provided'}`);

        // Reset animation flags for the current tier level and all levels above
        // This ensures users can watch the tier animation again when they get that tier
        // Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
        for (let level = newTier; level <= 5; level++) {
            const animField = `lvl${level}anim`;
            user[animField] = 0;
            console.log(`[Admin Tier Change] Reset ${animField} to 0 (can watch animation again at tier ${level})`);
        }

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

        const currentTier = user.tier || 1;
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
                    { tier: 1, name: 'Basic', description: 'Basic access level' },
                    { tier: 2, name: 'Standard', description: 'Enhanced features' },
                    { tier: 3, name: 'Professional', description: 'Advanced features' },
                    { tier: 4, name: 'Enterprise', description: 'Premium features' },
                    { tier: 5, name: 'Premium', description: 'Highest tier with all features' }
                ]
            }
        });

    } catch (error) {
        console.error('Error getting user tier management info:', error);
        next(error);
    }
};

// GET /admin/users-with-passwords - ADMIN ONLY
export const getAllUsersWithPasswords = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();
        const filter = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
            if (mongoose.Types.ObjectId.isValid(search)) {
                filter.$or.push({ _id: search });
            }
        }
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json({
            success: true,
            message: 'Users (with passwords) fetched successfully',
            data: users,
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