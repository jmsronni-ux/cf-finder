import express from 'express';
import {
  createWithdrawalRequest,
  getUserWithdrawalRequests,
  getAllWithdrawalRequests,
  processWithdrawalRequest,
  checkTierUpgradeEligibility,
  getUserRewardSummary
} from '../controllers/withdrawal-request.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User routes
router.post('/', authMiddleware, createWithdrawalRequest);
router.get('/my-requests', authMiddleware, getUserWithdrawalRequests);
router.get('/reward-summary', authMiddleware, getUserRewardSummary);
router.get('/tier-upgrade-eligibility', authMiddleware, checkTierUpgradeEligibility);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllWithdrawalRequests);
router.put('/:requestId/process', authMiddleware, adminMiddleware, processWithdrawalRequest);

export default router;
