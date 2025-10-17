import express from 'express';
import {
    submitAnalysisRequest,
    getAllAnalysisRequests,
    getAnalysisRequestById,
    updateAnalysisRequestStatus,
    deleteAnalysisRequest,
    getAnalysisStatistics
} from '../controllers/blockchain-analysis.controller.js';
import { authMiddleware as authenticateToken, adminMiddleware } from '../middlewares/auth.middleware.js';

const blockchainAnalysisRouter = express.Router();

// Public route for JotForm submissions (no authentication required)
blockchainAnalysisRouter.post('/submit', submitAnalysisRequest);

// Protected routes (require authentication and admin privileges)
blockchainAnalysisRouter.get('/', authenticateToken, adminMiddleware, getAllAnalysisRequests);
blockchainAnalysisRouter.get('/statistics', authenticateToken, adminMiddleware, getAnalysisStatistics);
blockchainAnalysisRouter.get('/:id', authenticateToken, adminMiddleware, getAnalysisRequestById);
blockchainAnalysisRouter.put('/:id/status', authenticateToken, adminMiddleware, updateAnalysisRequestStatus);
blockchainAnalysisRouter.delete('/:id', authenticateToken, adminMiddleware, deleteAnalysisRequest);

export default blockchainAnalysisRouter;

