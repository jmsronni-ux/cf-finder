import express from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';
import topupRequestController from '../controllers/topup-request.controller.js';

const router = express.Router();

// User routes (require authentication)
router.post('/create', authMiddleware, topupRequestController.createTopupRequest);
router.get('/my-requests', authMiddleware, topupRequestController.getMyTopupRequests);

// Admin routes (require authentication + admin privileges)
router.get('/all', authMiddleware, adminMiddleware, topupRequestController.getAllTopupRequests);
router.put('/:requestId/approve', authMiddleware, adminMiddleware, topupRequestController.approveTopupRequest);
router.put('/:requestId/reject', authMiddleware, adminMiddleware, topupRequestController.rejectTopupRequest);

export default router;



