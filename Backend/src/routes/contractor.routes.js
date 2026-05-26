import express from 'express';
const router = express.Router();
import { addContractor, editContractor, listContractors, getContractorById, deleteContractor, addContractorSession, updateContractorSession, getContractorByEmployeeId } from '../controllers/contractor.controller.js';
import { verifyJWT, isAdmin } from '../middlewares/auth.middleware.js';

router.post('/', verifyJWT, isAdmin, addContractor);
router.put('/:id', verifyJWT, isAdmin, editContractor);
router.get('/', verifyJWT, isAdmin, listContractors);
// Removed ID card routes since the functions were removed from the controller
router.get('/:id', verifyJWT, isAdmin, getContractorById);
router.delete('/:id', verifyJWT, isAdmin, deleteContractor);

// New endpoint to get contractor by employee ID
router.get('/employee/:employeeId', getContractorByEmployeeId);

// Session-based endpoints for contractors
router.post('/:id/session/in', verifyJWT, isAdmin, (req, res, next) => {
  req.body.contractorId = req.params.id;
  next();
}, addContractorSession);

router.post('/:id/session/out', verifyJWT, isAdmin, (req, res, next) => {
  req.body.contractorId = req.params.id;
  next();
}, updateContractorSession);

export default router;