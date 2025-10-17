import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getMyWallets, updateMyWallets, getAllUsersWithRewards, updateUserLevelRewards, adminChangeUserTier, getUserTierManagementInfo } from "../controllers/user.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import UserNetworkReward from "../models/user-network-reward.model.js";
import { convertRewardsToUSDT } from "../utils/crypto-conversion.js";

const userRouter = express.Router();

userRouter.get("/", authMiddleware, getAllUsers);

userRouter.get("/:id", authMiddleware, getUserById);

userRouter.post("/", authMiddleware, createUser);

userRouter.put("/:id", authMiddleware, updateUser);

userRouter.delete("/:id", authMiddleware, deleteUser);

// Mark animation as watched
userRouter.post("/mark-animation-watched", authMiddleware, async (req, res, next) => {
    try {
        const { level } = req.body;
        const userId = req.user._id;
        
        console.log(`[Animation] Request to mark level ${level} as watched for user ${userId}`);
        
        if (!level || level < 1 || level > 5) {
            console.error(`[Animation] Invalid level: ${level}`);
            return res.status(400).json({ success: false, message: "Invalid level" });
        }
        
        // First check if user exists and has sufficient tier
        const userCheck = await User.findById(userId).select('tier');
        if (!userCheck) {
            console.error(`[Animation] User not found: ${userId}`);
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        console.log(`[Animation] User tier: ${userCheck.tier}, Level requested: ${level}`);
        
        // Only allow watching if tier >= level
        const effectiveTier = userCheck.tier || 1;
        if (effectiveTier < level) {
            console.error(`[Animation] Tier ${effectiveTier} too low for level ${level}`);
            return res.status(403).json({ success: false, message: "Tier too low for this level" });
        }
        
        // Check if animation was already watched to avoid duplicate rewards
        const currentUser = await User.findById(userId).select(`lvl${level}anim balance`);
        const animField = `lvl${level}anim`;
        const alreadyWatched = currentUser[animField] === 1;
        
        console.log(`[Animation] Setting ${animField} to 1`);
        
        // Prepare update object
        const updateObj = {};
        updateObj[animField] = 1;
        
        // Initialize variables for response
        let userNetworkRewards = {};
        let rewardBreakdown = [];
        let totalRewardUSDT = 0;
        let conversionResult = { totalUSDT: 0, breakdown: {} };
        
        // Add network rewards to balance if animation not already watched
        if (!alreadyWatched) {
            // Get user's network rewards from user model
            const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
            userNetworkRewards = currentUser[levelNetworkRewardsField] || {};
            
            console.log(`[Animation] User network rewards for level ${level}:`, userNetworkRewards);
            console.log(`[Animation] User current balance:`, currentUser.balance);
            
            // Convert all rewards to USDT equivalent
            conversionResult = convertRewardsToUSDT(userNetworkRewards);
            totalRewardUSDT = conversionResult.totalUSDT;
            
            console.log(`[Animation] Conversion result:`, conversionResult);
            console.log(`[Animation] Total reward USDT:`, totalRewardUSDT);
            
            Object.entries(conversionResult.breakdown).forEach(([network, data]) => {
                if (data.original > 0) {
                    rewardBreakdown.push(`${network}: ${data.original} (${data.usdt} USDT)`);
                }
            });
            
            if (totalRewardUSDT > 0) {
                const newBalance = currentUser.balance + totalRewardUSDT;
                updateObj.balance = newBalance;
                console.log(`[Animation] Adding level ${level} network rewards: $${totalRewardUSDT} USDT. New balance: $${newBalance}`);
                console.log(`[Animation] Network breakdown:`, rewardBreakdown.join(', '));
            } else {
                console.log(`[Animation] No rewards to add - totalRewardUSDT is ${totalRewardUSDT}`);
            }
        } else {
            console.log(`[Animation] Animation already watched, no reward added`);
        }
        
        console.log(`[Animation] Update object:`, updateObj);
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateObj },
            { new: true, runValidators: false }
        ).select('lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim balance');
        
        if (!updatedUser) {
            console.error(`[Animation] Failed to update user: ${userId}`);
            return res.status(500).json({ success: false, message: "Failed to update animation status" });
        }
        
        console.log(`[Animation] Successfully saved animation status for level ${level}`);
        
        res.status(200).json({
            success: true,
            message: `Animation marked as watched for level ${level}${!alreadyWatched ? '. Reward added to balance!' : ''}`,
            data: {
                lvl1anim: updatedUser.lvl1anim,
                lvl2anim: updatedUser.lvl2anim,
                lvl3anim: updatedUser.lvl3anim,
                lvl4anim: updatedUser.lvl4anim,
                lvl5anim: updatedUser.lvl5anim,
                balance: updatedUser.balance,
                rewardAdded: !alreadyWatched,
                networkRewards: !alreadyWatched ? userNetworkRewards : null,
                rewardBreakdown: !alreadyWatched ? rewardBreakdown : null,
                totalRewardUSDT: !alreadyWatched ? totalRewardUSDT : null,
                conversionBreakdown: !alreadyWatched ? conversionResult.breakdown : null
            }
        });
    } catch (error) {
        console.error('[Animation] Error marking animation as watched:', error);
        next(error);
    }
});

// Wallet routes (must come before export in CommonJS; here it's fine after since ESM hoists)
userRouter.get("/me/wallets", authMiddleware, getMyWallets);
userRouter.put("/me/wallets", authMiddleware, updateMyWallets);

// Admin routes for managing user level rewards
userRouter.get("/admin/rewards", authMiddleware, adminMiddleware, getAllUsersWithRewards);
userRouter.put("/admin/rewards/:userId", authMiddleware, adminMiddleware, updateUserLevelRewards);

// Admin tier management routes
userRouter.get("/:userId/tier-management", authMiddleware, adminMiddleware, getUserTierManagementInfo);
userRouter.put("/:userId/tier", authMiddleware, adminMiddleware, adminChangeUserTier);

// Tier price routes removed - use /tier-request endpoints for tier upgrade requests

export default userRouter;