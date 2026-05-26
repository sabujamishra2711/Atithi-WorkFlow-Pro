import express from 'express';
import auditController from '../controllers/audit.controller.js';

const router = express.Router();

// Leave audit route - admin only
router.use('/', auditController);

export default router;