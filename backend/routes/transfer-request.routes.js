import express from 'express';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';
import {
    createTransferRequest,
    getMyTransferRequests,
    getAllTransferRequests,
    approveTransferRequest,
    rejectTransferRequest
} from '../controllers/transfer-request.controller.js';

const router = express.Router();

// User routes
router.post('/create', authMiddleware, createTransferRequest);
router.get('/my-requests', authMiddleware, getMyTransferRequests);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllTransferRequests);
router.put('/:requestId/approve', authMiddleware, adminMiddleware, approveTransferRequest);
router.put('/:requestId/reject', authMiddleware, adminMiddleware, rejectTransferRequest);

export default router;
