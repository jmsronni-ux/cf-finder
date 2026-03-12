import express from 'express';
import { getLevels, getLevelById, updateLevel, createLevel, deleteLevel, getTemplates, cloneTemplate } from '../controllers/level.controller.js';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes (for frontend)
router.get('/', getLevels); // Get all levels
router.get('/templates', getTemplates); // Get all unique template names
router.get('/:levelId', getLevelById); // Get specific level

// Admin routes (protected) - static paths BEFORE wildcard /:levelId
router.post('/clone', authMiddleware, adminMiddleware, cloneTemplate); // Clone template - MUST be before /:levelId
router.post('/', authMiddleware, adminMiddleware, createLevel); // Create new level
router.put('/:levelId', authMiddleware, adminMiddleware, updateLevel); // Update level
router.delete('/:levelId', authMiddleware, adminMiddleware, deleteLevel); // Delete level

export default router;
