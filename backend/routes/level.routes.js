import express from 'express';
import { getLevels, getLevelById, updateLevel, createLevel, deleteLevel } from '../controllers/level.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes (for frontend)
router.get('/', getLevels); // Get all levels
router.get('/:levelId', getLevelById); // Get specific level

// Admin routes (protected)
router.post('/', authenticate, isAdmin, createLevel); // Create new level
router.put('/:levelId', authenticate, isAdmin, updateLevel); // Update level
router.delete('/:levelId', authenticate, isAdmin, deleteLevel); // Delete level

export default router;
