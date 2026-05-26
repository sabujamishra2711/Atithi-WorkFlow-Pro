import express from 'express';
import { runLeaveMigration } from '../services/leaveMigration.service.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Run leave data migration - admin only
router.get('/leave-migration', verifyJWT, async (req, res) => {
  try {
    const results = await runLeaveMigration();
    res.status(200).json(results);
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to complete leave data migration' });
  }
});

export default router;