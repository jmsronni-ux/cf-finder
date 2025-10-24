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
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User routes (authenticated)
router.post('/', authMiddleware, submitVerificationRequest);
router.get('/my-requests', authMiddleware, getMyVerificationRequests);

// Admin routes (authenticated + admin)
router.get('/', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getAllVerificationRequests);

router.get('/statistics', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getVerificationStatistics);

router.get('/:id', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getVerificationRequestById);

router.post('/:id/fetch-blockchain', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, fetchBlockchainData);

router.put('/:id/approve', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, approveVerificationRequest);

router.put('/:id/reject', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, rejectVerificationRequest);

export default router;
