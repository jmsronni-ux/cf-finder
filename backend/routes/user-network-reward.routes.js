import express from 'express';
import { 
  getUserNetworkRewards,
  getUserLevelRewards,
  setUserLevelRewards,
  calculateNetworkCommission
} from '../controllers/user-network-reward.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get user's network rewards (with fallback to global)
router.get('/user/:userId', authMiddleware, getUserNetworkRewards);

// Get user's rewards for specific level
router.get('/user/:userId/level/:level', authMiddleware, getUserLevelRewards);

// Calculate commission for selected networks
router.post('/user/:userId/calculate-commission', authMiddleware, calculateNetworkCommission);

// Bulk update user's level rewards (Admin only)
router.put('/user/:userId/level/:level', authMiddleware, adminMiddleware, setUserLevelRewards);

export default router;
