"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info } from 'lucide-react';

interface PaymentOverlayProps {
  paymentStatus: 'overdue' | 'reminder' | 'current';
  daysRemaining?: number;
  daysOverdue?: number;
}

export default function PaymentOverlay({ 
  paymentStatus, 
  daysRemaining, 
  daysOverdue 
}: PaymentOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  // Don't show overlay on support pages
  const isSupportPage = typeof window !== 'undefined' && 
    (window.location.pathname.includes('/support') || 
     window.location.pathname.includes('/forgot-password'));

  useEffect(() => {
    // Hide overlay on support pages
    if (isSupportPage) {
      setIsVisible(false);
    }
  }, [isSupportPage]);

  if (!isVisible || isSupportPage) {
    return null;
  }

  const handleVisitWebsite = () => {
    window.open('https://ms-coders.web.app', '_blank');
  };

  const handleContactUs = () => {
    router.push('/support');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleOk = () => {
    setIsVisible(false);
  };

  // Render nothing if payment is current
  if (paymentStatus === 'current') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
        {/* Close button for reminder only */}
        {paymentStatus === 'reminder' && (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="text-center">
          {paymentStatus === 'overdue' ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Overdue</h3>
              <p className="text-gray-600 mb-6">
                Your payment is {daysOverdue} days overdue. Please renew your subscription to continue using the service.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <Info className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Reminder</h3>
              <p className="text-gray-600 mb-6">
                Your subscription will expire in {daysRemaining} days. Please renew now to avoid service interruption.
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleVisitWebsite}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Visit Website
            </Button>
            <Button 
              onClick={handleContactUs}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg"
            >
              Contact Us
            </Button>
            {paymentStatus === 'reminder' && (
              <Button 
                onClick={handleOk}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
              >
                OK
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}