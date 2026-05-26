import { Payment } from '../models/payment.model.js';
import paymentService from '../services/payment.service.js';

// Get payment by _id (keeping for backward compatibility)
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

// Get the first payment record (since there's only one payment record in the database)
export const getFirstPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne().sort({ createdAt: -1 });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const status = await paymentService.checkPaymentStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message
    });
  }
};

// Update payment version by _id
export const updatePaymentVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    
    const payment = await Payment.findByIdAndUpdate(
      id,
      { version },
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment version updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment version:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment version',
      error: error.message
    });
  }
};