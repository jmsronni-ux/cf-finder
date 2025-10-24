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
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User routes (authenticated)
router.post('/', authenticateToken, submitVerificationRequest);
router.get('/my-requests', authenticateToken, getMyVerificationRequests);

// Admin routes (authenticated + admin)
router.get('/', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getAllVerificationRequests);

router.get('/statistics', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getVerificationStatistics);

router.get('/:id', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, getVerificationRequestById);

router.post('/:id/fetch-blockchain', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, fetchBlockchainData);

router.put('/:id/approve', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, approveVerificationRequest);

router.put('/:id/reject', authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
}, rejectVerificationRequest);

export default router;
