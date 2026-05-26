import express from 'express';
import migrationController from '../controllers/migration.controller.js';

const router = express.Router();

// Leave data migration route
router.use('/', migrationController);

export default router;