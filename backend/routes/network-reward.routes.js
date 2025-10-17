import express from 'express';
import { 
  getNetworkRewards, 
  getRewardsByLevel, 
  setNetworkReward, 
  setLevelRewards, 
  deleteNetworkReward,
  getRewardSummary
} from '../controllers/network-reward.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getNetworkRewards); // Get all rewards (with optional level filter)
router.get('/summary', getRewardSummary); // Get reward summary
router.get('/level/:level', getRewardsByLevel); // Get rewards for specific level

// Admin routes (protected)
router.post('/', authenticate, isAdmin, setNetworkReward); // Set single network reward
router.put('/level/:level', authenticate, isAdmin, setLevelRewards); // Bulk update level rewards
router.delete('/level/:level/network/:network', authenticate, isAdmin, deleteNetworkReward); // Delete specific reward

export default router;
