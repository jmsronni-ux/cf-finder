import express from 'express';
import { getGlobalSettings, updateGlobalSettings } from '../controllers/global-settings.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /global-settings - Public route, no auth required
router.get('/', getGlobalSettings);

// PUT /global-settings - Admin only
router.put('/', authMiddleware, updateGlobalSettings);

export default router;

