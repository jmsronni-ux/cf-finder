import express from 'express';
import {
  createWithdrawalRequest,
  getUserWithdrawalRequests,
  getAllWithdrawalRequests,
  processWithdrawalRequest,
  checkTierUpgradeEligibility,
  getUserRewardSummary
} from '../controllers/withdrawal-request.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User routes
router.post('/', authenticate, createWithdrawalRequest);
router.get('/my-requests', authenticate, getUserWithdrawalRequests);
router.get('/reward-summary', authenticate, getUserRewardSummary);
router.get('/tier-upgrade-eligibility', authenticate, checkTierUpgradeEligibility);

// Admin routes
router.get('/all', authenticate, isAdmin, getAllWithdrawalRequests);
router.put('/:requestId/process', authenticate, isAdmin, processWithdrawalRequest);

export default router;
