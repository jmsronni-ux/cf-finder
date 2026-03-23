import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getMyWallets, updateMyWallets, getAllUsersWithRewards, updateUserLevelRewards, adminChangeUserTier, getUserTierManagementInfo, resetUserLevel, updateMyProfile, changeMyPassword, getAllUsersWithPasswords, getMyCompanyDetails, updateMyCompanyDetails, getMyBankingDetails, updateMyBankingDetails, getAiAssistantData } from "../controllers/user.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import { convertRewardsToUSDT } from "../utils/crypto-conversion.js";

const userRouter = express.Router();

// ─── Static named routes MUST come before any /:id wildcards ────────────────

// Profile routes (authenticated user themselves)
userRouter.get("/me/ai-assistant-data", authMiddleware, getAiAssistantData);
userRouter.put("/me", authMiddleware, updateMyProfile);
userRouter.put("/me/password", authMiddleware, changeMyPassword);
userRouter.get("/me/wallets", authMiddleware, getMyWallets);
userRouter.put("/me/wallets", authMiddleware, updateMyWallets);
userRouter.get("/me/company-details", authMiddleware, getMyCompanyDetails);
userRouter.put("/me/company-details", authMiddleware, updateMyCompanyDetails);
userRouter.get("/me/banking-details", authMiddleware, getMyBankingDetails);
userRouter.put("/me/banking-details", authMiddleware, updateMyBankingDetails);

// Admin named routes (before /:id wildcard)
userRouter.get("/admin/rewards", authMiddleware, adminMiddleware, getAllUsersWithRewards);
userRouter.put("/admin/rewards/:userId", authMiddleware, adminMiddleware, updateUserLevelRewards);
userRouter.get("/admin/users-with-passwords", authMiddleware, adminMiddleware, getAllUsersWithPasswords);

// Mark animation watched (before /:id wildcard)
userRouter.post("/mark-animation-watched", authMiddleware, async (req, res, next) => {
    try {
        const { level } = req.body;
        const userId = req.user._id;

        if (!level || level < 1 || level > 5) {
            return res.status(400).json({ success: false, message: "Invalid level" });
        }

        // First check if user exists and has sufficient tier
        const userCheck = await User.findById(userId).select('tier');
        if (!userCheck) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Only allow watching if tier >= level
        const effectiveTier = userCheck.tier || 1;
        if (effectiveTier < level) {
            return res.status(403).json({ success: false, message: "Tier too low for this level" });
        }

        // Check if animation was already watched to avoid duplicate rewards
        const currentUser = await User.findById(userId).select(`lvl${level}anim balance`);
        const animField = `lvl${level}anim`;

        // Prepare update object
        const updateObj = {};
        updateObj[animField] = 1;

        // Initialize variables for response
        let userNetworkRewards = {};
        let rewardBreakdown = [];
        let totalRewardUSDT = 0;
        let conversionResult = { totalUSDT: 0, breakdown: {} };

        // Get user's network rewards from user model
        const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
        userNetworkRewards = currentUser[levelNetworkRewardsField] || {};

        // Convert all rewards to USDT equivalent
        try {
            conversionResult = convertRewardsToUSDT(userNetworkRewards);
            totalRewardUSDT = conversionResult.totalUSDT;
        } catch (conversionError) {
            console.error(`[Animation] Error in conversion for user ${userId}, level ${level}:`, conversionError);
            conversionResult = { totalUSDT: 0, breakdown: {} };
            totalRewardUSDT = 0;
        }

        Object.entries(conversionResult.breakdown).forEach(([network, data]) => {
            if (data.original > 0) {
                rewardBreakdown.push(`${network}: ${data.original} (${data.usdt} USDT)`);
            }
        });

        if (totalRewardUSDT > 0) {
            const newBalance = currentUser.balance + totalRewardUSDT;
            updateObj.balance = newBalance;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateObj },
            { new: true, runValidators: false }
        ).select('lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim balance');

        if (!updatedUser) {
            return res.status(500).json({ success: false, message: "Failed to update animation status" });
        }

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
                rewardAdded: true,
                networkRewards: userNetworkRewards,
                rewardBreakdown: rewardBreakdown,
                totalRewardUSDT: totalRewardUSDT,
                conversionBreakdown: conversionResult.breakdown
            }
        };

        res.status(200).json(responseData);
    } catch (error) {
        console.error('[Animation] Error marking animation as watched:', error);
        next(error);
    }
});

// ─── Generic CRUD routes with /:id wildcards ────────────────────────────────

userRouter.get("/", authMiddleware, getAllUsers);
userRouter.post("/", authMiddleware, createUser);
userRouter.get("/:id", authMiddleware, getUserById);
userRouter.put("/:id", authMiddleware, adminMiddleware, updateUser);
userRouter.delete("/:id", authMiddleware, adminMiddleware, deleteUser);

// Admin tier management routes (use /:userId sub-paths, safe after /:id because different param name)
userRouter.get("/:userId/tier-management", authMiddleware, adminMiddleware, getUserTierManagementInfo);
userRouter.put("/:userId/tier", authMiddleware, adminMiddleware, adminChangeUserTier);
userRouter.put("/:userId/reset-level", authMiddleware, adminMiddleware, resetUserLevel);

export default userRouter;