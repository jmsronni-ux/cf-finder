import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getMyWallets, updateMyWallets, getAllUsersWithRewards, updateUserLevelRewards } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import UserNetworkReward from "../models/user-network-reward.model.js";

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
        
        // Add network rewards to balance if animation not already watched
        if (!alreadyWatched) {
            // Get user's custom network rewards first, fallback to global rewards
            const userRewards = await UserNetworkReward.find({ userId, level, isActive: true });
            const globalRewards = await NetworkReward.find({ level, isActive: true });
            
            const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
            let totalReward = 0;
            const rewardBreakdown = [];
            
            // Calculate total reward using user-specific rewards with global fallback
            for (const network of networks) {
                let rewardAmount = 0;
                let source = 'none';
                
                // Check if user has custom reward for this network
                const userReward = userRewards.find(r => r.network === network);
                if (userReward) {
                    rewardAmount = userReward.rewardAmount;
                    source = 'custom';
                } else {
                    // Fall back to global reward
                    const globalReward = globalRewards.find(r => r.network === network);
                    if (globalReward) {
                        rewardAmount = globalReward.rewardAmount;
                        source = 'global';
                    }
                }
                
                totalReward += rewardAmount;
                if (rewardAmount > 0) {
                    rewardBreakdown.push(`${network}: ${rewardAmount} (${source})`);
                }
            }
            
            if (totalReward > 0) {
                const newBalance = currentUser.balance + totalReward;
                updateObj.balance = newBalance;
                console.log(`[Animation] Adding level ${level} network rewards: $${totalReward}. New balance: $${newBalance}`);
                console.log(`[Animation] Network breakdown:`, rewardBreakdown.join(', '));
            }
        } else {
            console.log(`[Animation] Animation already watched, no reward added`);
        }
        
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
                rewardAdded: !alreadyWatched
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
userRouter.get("/admin/rewards", authMiddleware, getAllUsersWithRewards);
userRouter.put("/admin/rewards/:userId", authMiddleware, updateUserLevelRewards);

// Tier price routes removed - use /tier-request endpoints for tier upgrade requests

export default userRouter;