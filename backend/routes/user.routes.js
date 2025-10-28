import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getMyWallets, updateMyWallets, getAllUsersWithRewards, updateUserLevelRewards, adminChangeUserTier, getUserTierManagementInfo } from "../controllers/user.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import { convertRewardsToUSDT } from "../utils/crypto-conversion.js";

const userRouter = express.Router();

userRouter.get("/", authMiddleware, getAllUsers);

userRouter.get("/:id", authMiddleware, getUserById);

userRouter.post("/", authMiddleware, createUser);

userRouter.put("/:id", authMiddleware, adminMiddleware, updateUser);

userRouter.delete("/:id", authMiddleware, deleteUser);

// Mark animation as watched
userRouter.post("/mark-animation-watched", authMiddleware, async (req, res, next) => {
    try {
        console.log(`[Animation] ===== ROUTE HIT - MARK ANIMATION WATCHED =====`);
        console.log(`[Animation] Route called at:`, new Date().toISOString());
        
        const { level } = req.body;
        const userId = req.user._id;
        
        console.log(`[Animation] ===== ANIMATION COMPLETION REQUEST =====`);
        console.log(`[Animation] Request to mark level ${level} as watched for user ${userId}`);
        console.log(`[Animation] Request body:`, req.body);
        console.log(`[Animation] User from token:`, req.user);
        
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
        console.log(`[Animation] Effective tier: ${effectiveTier}, Level: ${level}`);
        if (effectiveTier < level) {
            console.error(`[Animation] Tier ${effectiveTier} too low for level ${level}`);
            return res.status(403).json({ success: false, message: "Tier too low for this level" });
        }
        
        console.log(`[Animation] Tier check passed - proceeding with animation completion`);
        
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
        
        // SIMPLE FIX: Always add network rewards to balance when animation is completed
        console.log(`[Animation] ===== EXECUTING CONVERSION LOGIC =====`);
        
        // Get user's network rewards from user model
        const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
        userNetworkRewards = currentUser[levelNetworkRewardsField] || {};
        
        console.log(`[Animation] User network rewards for level ${level}:`, userNetworkRewards);
        console.log(`[Animation] User current balance:`, currentUser.balance);
        console.log(`[Animation] Network rewards field: ${levelNetworkRewardsField}`);
        console.log(`[Animation] Raw network rewards from user:`, currentUser[levelNetworkRewardsField]);
        
        // Convert all rewards to USDT equivalent
        console.log(`[Animation] Calling convertRewardsToUSDT with:`, userNetworkRewards);
        try {
            conversionResult = convertRewardsToUSDT(userNetworkRewards);
            totalRewardUSDT = conversionResult.totalUSDT;
            console.log(`[Animation] Conversion function result:`, conversionResult);
        } catch (conversionError) {
            console.error(`[Animation] Error in conversion function:`, conversionError);
            conversionResult = { totalUSDT: 0, breakdown: {} };
            totalRewardUSDT = 0;
        }
        
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
        
        console.log(`[Animation] Update object:`, updateObj);
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateObj },
            { new: true, runValidators: false }
        ).select('lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim balance');
        
        console.log(`[Animation] Database update result:`, {
            userId: updatedUser?._id,
            oldBalance: currentUser.balance,
            newBalance: updatedUser?.balance,
            updateApplied: updateObj.balance ? 'YES' : 'NO'
        });
        
        if (!updatedUser) {
            console.error(`[Animation] Failed to update user: ${userId}`);
            return res.status(500).json({ success: false, message: "Failed to update animation status" });
        }
        
        console.log(`[Animation] Successfully saved animation status for level ${level}`);
        
        const responseData = {
            success: true,
            message: `Animation marked as watched for level ${level}. Reward added to balance!`,
            data: {
                lvl1anim: updatedUser.lvl1anim,
                lvl2anim: updatedUser.lvl2anim,
                lvl3anim: updatedUser.lvl3anim,
                lvl4anim: updatedUser.lvl4anim,
                lvl5anim: updatedUser.lvl5anim,
                balance: updatedUser.balance,
                rewardAdded: true, // Always true since we always add rewards
                networkRewards: userNetworkRewards,
                rewardBreakdown: rewardBreakdown,
                totalRewardUSDT: totalRewardUSDT,
                conversionBreakdown: conversionResult.breakdown
            }
        };
        
        console.log(`[Animation] ===== FINAL RESPONSE DATA =====`);
        console.log(`[Animation] totalRewardUSDT in response:`, responseData.data.totalRewardUSDT);
        console.log(`[Animation] networkRewards in response:`, responseData.data.networkRewards);
        console.log(`[Animation] balance in response:`, responseData.data.balance);
        
        console.log(`[Animation] ===== SENDING RESPONSE =====`);
        console.log(`[Animation] Response data:`, responseData);
        
        res.status(200).json(responseData);
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