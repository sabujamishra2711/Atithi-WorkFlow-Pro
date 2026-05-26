import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

interface PaymentStatus {
  _id: string;
  date: string;
  version: string;
  // Add other fields as needed
}

interface PaymentStatusCheck {
  status: 'overdue' | 'reminder' | 'current' | 'unknown' | 'error';
  dueDate?: string;
  daysRemaining?: number;
  daysOverdue?: number;
  message?: string;
}

export const usePaymentStatus = () => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentStatusCheck, setPaymentStatusCheck] = useState<PaymentStatusCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        
        // Fetch the first payment record
        const response = await apiClient.get('/payment');
        setPaymentStatus(response.data.data);
        
        // Fetch the payment status
        const statusResponse = await apiClient.get('/payment/status');
        setPaymentStatusCheck(statusResponse.data.data);
        
        setError(null);
      } catch (error: any) {
        console.error('Error fetching payment status:', error);
        // Set default values to prevent UI breaking
        setPaymentStatusCheck({
          status: 'unknown',
          message: 'Unable to fetch payment status'
        });
        // We don't set the error state here to avoid intrusive error logging in the component
        // instead we rely on the 'unknown' status
        setPaymentStatus(null);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch payment data in browser environment
    if (typeof window !== 'undefined') {
      fetchPaymentData();
    } else {
      // Set loading to false immediately on server side
      setLoading(false);
    }
  }, []);

  return { paymentStatus, paymentStatusCheck, loading, error };
};