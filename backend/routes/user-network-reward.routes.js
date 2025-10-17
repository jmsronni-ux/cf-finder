import express from 'express';
import { 
  getUserNetworkRewards,
  getUserLevelRewards,
  setUserNetworkReward,
  setUserLevelRewards,
  deleteUserNetworkReward,
  getAllUsersNetworkRewards
} from '../controllers/user-network-reward.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get user's network rewards (with fallback to global)
router.get('/user/:userId', authenticate, getUserNetworkRewards);

// Get user's rewards for specific level
router.get('/user/:userId/level/:level', authenticate, getUserLevelRewards);

// Get all users with their network rewards summary (Admin only)
router.get('/users', authenticate, isAdmin, getAllUsersNetworkRewards);

// Set user's custom network reward (Admin only)
router.post('/user', authenticate, isAdmin, setUserNetworkReward);

// Bulk update user's level rewards (Admin only)
router.put('/user/:userId/level/:level', authenticate, isAdmin, setUserLevelRewards);

// Delete user's custom network reward (Admin only)
router.delete('/user/:userId/level/:level/network/:network', authenticate, isAdmin, deleteUserNetworkReward);

export default router;
