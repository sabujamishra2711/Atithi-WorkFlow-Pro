import { Router } from 'express';
import { 
  getPaymentById,
  getFirstPayment,
  getPaymentStatus,
  updatePaymentVersion
} from '../controllers/payment.controller.js';

const router = Router();

// Routes (specific routes before parameterized routes)
router.get('/status', getPaymentStatus); // New endpoint to get payment status
router.get('/', getFirstPayment); // New endpoint to get the first payment record
router.get('/:id', getPaymentById);
router.put('/:id/version', updatePaymentVersion);

export default router;