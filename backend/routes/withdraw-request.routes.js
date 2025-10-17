import express from 'express';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';
import {
    createWithdrawRequest,
    getAllWithdrawRequests,
    getMyWithdrawRequests,
    getWithdrawRequestById,
    approveWithdrawRequest,
    rejectWithdrawRequest
} from '../controllers/withdraw-request.controller.js';

const router = express.Router();

// User routes
router.post('/create', authMiddleware, createWithdrawRequest);
router.get('/my-requests', authMiddleware, getMyWithdrawRequests);

// Admin routes (must come before /:requestId to avoid conflicts)
router.get('/all', authMiddleware, adminMiddleware, getAllWithdrawRequests);

// User routes (must come after specific routes)
router.get('/:requestId', authMiddleware, getWithdrawRequestById);

// Admin routes
router.put('/:requestId/approve', authMiddleware, adminMiddleware, approveWithdrawRequest);
router.put('/:requestId/reject', authMiddleware, adminMiddleware, rejectWithdrawRequest);

export default router;
