import express from 'express';
import { 
  getUserNetworkRewards,
  getUserLevelRewards,
  setUserNetworkReward,
  setUserLevelRewards,
  deleteUserNetworkReward,
  getAllUsersNetworkRewards,
  getUserTotalNetworkRewards,
  calculateNetworkCommission
} from '../controllers/user-network-reward.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get user's network rewards (with fallback to global)
router.get('/user/:userId', authMiddleware, getUserNetworkRewards);

// Get user's total network rewards across all levels
router.get('/user/:userId/total', authMiddleware, getUserTotalNetworkRewards);

// Calculate commission for selected networks
router.post('/user/:userId/calculate-commission', authMiddleware, calculateNetworkCommission);

// Get user's rewards for specific level
router.get('/user/:userId/level/:level', authMiddleware, getUserLevelRewards);

// Get all users with their network rewards summary (Admin only)
router.get('/users', authMiddleware, adminMiddleware, getAllUsersNetworkRewards);

// Set user's custom network reward (Admin only)
router.post('/user', authMiddleware, adminMiddleware, setUserNetworkReward);

// Bulk update user's level rewards (Admin only)
router.put('/user/:userId/level/:level', authMiddleware, adminMiddleware, setUserLevelRewards);

// Delete user's custom network reward (Admin only)
router.delete('/user/:userId/level/:level/network/:network', authMiddleware, adminMiddleware, deleteUserNetworkReward);

export default router;
