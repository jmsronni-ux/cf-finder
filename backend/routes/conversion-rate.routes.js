import express from 'express';
import { 
  getConversionRates, 
  getConversionRate, 
  updateConversionRates, 
  updateSingleRate 
} from '../controllers/conversion-rate.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getConversionRates); // Get all conversion rates
router.get('/:network', getConversionRate); // Get specific network rate

// Admin routes (protected)
router.put('/', authMiddleware, adminMiddleware, updateConversionRates); // Bulk update rates
router.put('/:network', authMiddleware, adminMiddleware, updateSingleRate); // Update single rate

export default router;

