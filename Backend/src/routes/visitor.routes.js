import express from 'express';
import * as visitorController from '../controllers/visitor.controller.js';
import { verifyJWT, isAdmin } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.middleware.js';

const router = express.Router();

// Optional auth middleware for visitor creation (allows both authenticated and unauthenticated access)
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    // If token exists, verify it
    verifyJWT(req, res, next);
  } else {
    // If no token, continue without authentication
    next();
  }
};

router.post('/', optionalAuth, upload.single('photo'), visitorController.addVisitor);
router.get('/', optionalAuth, visitorController.listVisitors);
router.delete('/:id', verifyJWT, isAdmin, visitorController.deleteVisitor);

export default router; 