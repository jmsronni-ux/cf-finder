import express from 'express';
import {
    submitAnalysisRequest,
    getAllAnalysisRequests,
    getAnalysisRequestById,
    updateAnalysisRequestStatus,
    deleteAnalysisRequest,
    getAnalysisStatistics
} from '../controllers/blockchain-analysis.controller.js';
import { authMiddleware as authenticateToken } from '../middlewares/auth.middleware.js';

const blockchainAnalysisRouter = express.Router();

// Public route for JotForm submissions (no authentication required)
blockchainAnalysisRouter.post('/submit', submitAnalysisRequest);

// Protected routes (require authentication)
blockchainAnalysisRouter.get('/', authenticateToken, getAllAnalysisRequests);
blockchainAnalysisRouter.get('/statistics', authenticateToken, getAnalysisStatistics);
blockchainAnalysisRouter.get('/:id', authenticateToken, getAnalysisRequestById);
blockchainAnalysisRouter.put('/:id/status', authenticateToken, updateAnalysisRequestStatus);
blockchainAnalysisRouter.delete('/:id', authenticateToken, deleteAnalysisRequest);

export default blockchainAnalysisRouter;

