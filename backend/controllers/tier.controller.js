import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";
import { TIER_CONFIG, getTierInfo, getTierBenefits, getUpgradeOptions, getUpgradeOptionsForUser } from "../utils/tier-system.js";

// Get user's current tier information
export const getUserTier = async (req, res, next) => {
    try {
        console.log('getUserTier called, req.user:', req.user);
        console.log('req.params:', req.params);
        const userId = req.user?._id || req.user?.userId || req.params.userId;
        console.log('Looking for user with ID:', userId);
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            console.log('User not found for ID:', userId);
            throw new ApiError(404, "User not found");
        }
        console.log('User found:', user);

        const tierInfo = getTierInfo(user.tier);
        const upgradeOptions = getUpgradeOptionsForUser(user);

        res.status(200).json({
            success: true,
            message: "Tier information retrieved successfully",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    tier: user.tier,
                    balance: user.balance,
                    isAdmin: user.isAdmin,
                    lvl1anim: user.lvl1anim,
                    lvl2anim: user.lvl2anim,
                    lvl3anim: user.lvl3anim,
                    lvl4anim: user.lvl4anim,
                    lvl5anim: user.lvl5anim,
                    lvl1reward: user.lvl1reward,
                    lvl2reward: user.lvl2reward,
                    lvl3reward: user.lvl3reward,
                    lvl4reward: user.lvl4reward,
                    lvl5reward: user.lvl5reward
                },
                currentTier: {
                    tier: user.tier,
                    ...tierInfo
                },
                upgradeOptions,
                canUpgrade: user.tier < 5
            }
        });
    } catch (error) {
        next(error);
    }
};

// This endpoint is deprecated - users should now use /tier-request/create to request tier upgrades
export const upgradeUserTier = async (req, res, next) => {
    try {
        res.status(400).json({
            success: false,
            message: "Direct tier upgrades are no longer supported. Please submit a tier upgrade request via /tier-request/create and wait for admin approval."
        });
    } catch (error) {
        console.error('❌ Tier upgrade error:', error);
        next(error);
    }
};

// Get all tier information (for display purposes)
export const getAllTiers = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Tier information retrieved successfully",
            data: {
                tiers: Object.keys(TIER_CONFIG).map(tier => ({
                    tier: parseInt(tier),
                    ...TIER_CONFIG[tier]
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin function to manually set user tier (for testing or admin purposes)
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
        
        // Reset animation flags for the current tier level and all levels above
        // This ensures users can watch the tier animation again when they get that tier
        // Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
        const updateFields = { tier, updatedAt: new Date() };
        for (let level = tier; level <= 5; level++) {
            updateFields[`lvl${level}anim`] = 0;
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: `User tier set to ${tierInfo.name}`,
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

