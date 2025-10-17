import express from "express";
import { getUserTier, upgradeUserTier, getAllTiers, setUserTier } from "../controllers/tier.controller.js";
import { authMiddleware as authenticate, adminMiddleware } from "../middlewares/auth.middleware.js";

const tierRouter = express.Router();

// Get current user's tier information
tierRouter.get("/my-tier", authenticate, getUserTier);

// Get tier information for specific user (admin or self)
tierRouter.get("/user/:userId", authenticate, getUserTier);

// Upgrade user tier
tierRouter.post("/upgrade", authenticate, upgradeUserTier);

// Get all available tiers
tierRouter.get("/all", getAllTiers);

// Admin route to manually set user tier
tierRouter.post("/admin/set-tier", authenticate, adminMiddleware, setUserTier);

export default tierRouter;

