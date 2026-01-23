import express from 'express';
import {
    submitVerificationRequest,
    getMyVerificationRequests,
    getAllVerificationRequests,
    getVerificationRequestById,
    fetchBlockchainData,
    approveVerificationRequest,
    rejectVerificationRequest,
    getVerificationStatistics
} from '../controllers/wallet-verification.controller.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User routes (authenticated)
router.post('/', authMiddleware, submitVerificationRequest);
router.get('/my-requests', authMiddleware, getMyVerificationRequests);

// Admin routes (authenticated + admin)
router.get('/', authMiddleware, adminMiddleware, getAllVerificationRequests);

router.get('/statistics', authMiddleware, adminMiddleware, getVerificationStatistics);

router.get('/:id', authMiddleware, adminMiddleware, getVerificationRequestById);

router.post('/:id/fetch-blockchain', authMiddleware, adminMiddleware, fetchBlockchainData);

router.put('/:id/approve', authMiddleware, adminMiddleware, approveVerificationRequest);

router.put('/:id/reject', authMiddleware, adminMiddleware, rejectVerificationRequest);

export default router;
