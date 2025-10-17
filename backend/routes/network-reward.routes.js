import express from 'express';
import { 
  getNetworkRewards, 
  getRewardsByLevel, 
  setNetworkReward, 
  setLevelRewards, 
  deleteNetworkReward,
  getRewardSummary
} from '../controllers/network-reward.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getNetworkRewards); // Get all rewards (with optional level filter)
router.get('/summary', getRewardSummary); // Get reward summary
router.get('/level/:level', getRewardsByLevel); // Get rewards for specific level

// Admin routes (protected)
router.post('/', authMiddleware, adminMiddleware, setNetworkReward); // Set single network reward
router.put('/level/:level', authMiddleware, adminMiddleware, setLevelRewards); // Bulk update level rewards
router.delete('/level/:level/network/:network', authMiddleware, adminMiddleware, deleteNetworkReward); // Delete specific reward

export default router;
