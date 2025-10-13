import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
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
router.get('/all', authMiddleware, getAllWithdrawRequests);
router.put('/:requestId/approve', authMiddleware, approveWithdrawRequest);
router.put('/:requestId/reject', authMiddleware, rejectWithdrawRequest);

export default router;
