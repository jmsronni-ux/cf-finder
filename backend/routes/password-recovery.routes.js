import express from 'express';
import {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    changePassword
} from '../controllers/password-recovery.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const passwordRecoveryRouter = express.Router();

// Public routes
passwordRecoveryRouter.post('/forgot-password', requestPasswordReset);
passwordRecoveryRouter.get('/verify-token/:token', verifyResetToken);
passwordRecoveryRouter.post('/reset-password', resetPassword);

// Protected route - requires authentication
passwordRecoveryRouter.post('/change-password', authMiddleware, changePassword);

export default passwordRecoveryRouter;
