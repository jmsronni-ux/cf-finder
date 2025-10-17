import express from 'express';
import authMiddleware, { adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Migration endpoint (Admin only)
router.post('/run-reward-migrations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('🚀 Manual migration triggered by admin');
    
    // Import and run the migration script
    const { runMigrations } = await import('../scripts/run-migrations.js');
    await runMigrations();
    
    res.status(200).json({
      success: true,
      message: 'Reward migrations completed successfully'
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

export default router;
