"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Mail, Phone, Clock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountRecoveryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Account Recovery</h1>
            <Button onClick={() => router.push("/support")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Key className="w-6 h-6 mr-3 text-blue-600" />
              Account Recovery Assistance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700">
                Forgot your password or having trouble accessing your account? Follow these steps to recover your account.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <h3 className="font-bold text-yellow-800">Account Recovery Options</h3>
                <p className="text-yellow-700">
                  Use the password reset feature or contact support for account recovery assistance.
                </p>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-4">Password Reset Process</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">1. Initiate Reset</h4>
                        <p className="text-gray-600">
                          On the login page, click "Forgot Password" and enter your registered email address.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <ShieldAlert className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">2. Email Verification</h4>
                        <p className="text-gray-600">
                          Check your email for a password reset link. The link will expire in 24 hours.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Key className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">3. Create New Password</h4>
                        <p className="text-gray-600">
                          Click the reset link and create a new password that meets security requirements.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">4. Login with New Password</h4>
                        <p className="text-gray-600">
                          Return to the login page and sign in with your new password.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-semibold mt-8 mb-4">Password Requirements</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span>Minimum 8 characters long</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span>Include at least one uppercase letter</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span>Include at least one lowercase letter</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span>Include at least one number</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span>Include at least one special character</span>
                </li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-8">
                <h3 className="font-bold text-red-800">Still Having Issues?</h3>
                <p className="text-red-700">
                  If you're unable to reset your password using the self-service option, contact our support team for assistance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="border-2 border-green-100">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Mail className="w-5 h-5 mr-2 text-green-600" />
                      Email Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">
                      Send an email to our support team with your details:
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => window.location.href = "mailto:support@atithi.com?subject=Account Recovery Request"}
                    >
                      support@atithi.com
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Phone className="w-5 h-5 mr-2 text-green-600" />
                      Phone Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">
                      Call our support hotline for immediate assistance:
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => window.location.href = "tel:+919876543210"}
                    >
                      +91 98765 43210
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <Button 
                  size="lg" 
                  onClick={() => router.push("/forgot-password")}
                  className="text-lg px-8 py-6"
                >
                  <Key className="w-5 h-5 mr-2" />
                  Reset Password Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Support Version: 1.0.0</p>
          <p>Last Updated: September 1, 2025</p>
        </div>
      </div>
    </div>
  );
}