import express from 'express';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';
import {
    createWithdrawRequest,
    getAllWithdrawRequests,
    getMyWithdrawRequests,
    approveWithdrawRequest,
    rejectWithdrawRequest
} from '../controllers/withdraw-request.controller.js';

const router = express.Router();

// User routes
router.post('/create', authMiddleware, createWithdrawRequest);
router.get('/my-requests', authMiddleware, getMyWithdrawRequests);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllWithdrawRequests);
router.put('/:requestId/approve', authMiddleware, adminMiddleware, approveWithdrawRequest);
router.put('/:requestId/reject', authMiddleware, adminMiddleware, rejectWithdrawRequest);

export default router;
