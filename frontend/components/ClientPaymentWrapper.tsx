"use client";

import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import PaymentOverlay from "@/components/PaymentOverlay";

export default function ClientPaymentWrapper() {
  const { paymentStatusCheck, loading, error } = usePaymentStatus();

  if (loading) {
    return null;
  }

  if (error) {
    console.error('Error fetching payment status:', error);
    return null;
  }

  // If we don't have payment status data or status is unknown, don't show anything
  if (!paymentStatusCheck || paymentStatusCheck.status === 'unknown') {
    return null;
  }

  // Don't show overlay if payment is current
  if (paymentStatusCheck.status === 'current') {
    return null;
  }

  // Show the payment overlay with the appropriate status
  return (
    <PaymentOverlay 
      paymentStatus={paymentStatusCheck.status as 'overdue' | 'reminder' | 'current'} 
      daysRemaining={paymentStatusCheck.daysRemaining}
      daysOverdue={paymentStatusCheck.daysOverdue}
    />
  );
}