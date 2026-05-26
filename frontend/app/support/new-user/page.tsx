"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, ShieldCheck, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewUserSetupPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">New User Setup</h1>
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
              <UserPlus className="w-6 h-6 mr-3 text-blue-600" />
              Getting Started with Atithi WorkFlow Pro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700">
                Welcome to Atithi WorkFlow Pro! This guide will help you get started with setting up your account and accessing the system.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h3 className="font-bold text-blue-800">New User Setup Process</h3>
                <p className="text-blue-700">
                  Contact your system administrator for account creation and initial configuration.
                </p>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-4">Account Setup Steps</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">1. Account Creation</h4>
                        <p className="text-gray-600">
                          Your system administrator will create your account in the HRMS system and assign you the appropriate role and permissions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">2. Welcome Email</h4>
                        <p className="text-gray-600">
                          You will receive a welcome email with your login credentials and instructions to access the system.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">3. First Login</h4>
                        <p className="text-gray-600">
                          Navigate to the login page and enter your credentials. You'll be prompted to change your password on first login.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Phone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">4. Profile Setup</h4>
                        <p className="text-gray-600">
                          Complete your profile information including contact details, emergency contacts, and upload your profile picture.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-semibold mt-8 mb-4">System Requirements</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span><strong>Browser</strong>: Latest versions of Chrome, Firefox, Safari, or Edge</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span><strong>Internet Connection</strong>: Stable broadband connection recommended</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span><strong>Screen Resolution</strong>: Minimum 1024x768</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">✓</span>
                  <span><strong>JavaScript</strong>: Must be enabled in your browser</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold mt-8 mb-4">Need Help?</h3>
              <p>
                If you encounter any issues during the setup process:
              </p>
              <ul className="mt-2 space-y-1">
                <li>• Contact your system administrator for account-related questions</li>
                <li>• Visit our <Button variant="link" onClick={() => router.push("/support/technical-support")} className="p-0 h-auto">Technical Support</Button> page for system issues</li>
                <li>• Check our <Button variant="link" onClick={() => router.push("/documentation")} className="p-0 h-auto">User Documentation</Button> for detailed guides</li>
              </ul>

              <div className="bg-gray-50 p-6 rounded-lg mt-8">
                <h4 className="font-bold text-lg mb-3">Login Page Preview</h4>
                <div className="border rounded-lg p-6 bg-white">
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <div className="mx-auto bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center mb-3" />
                      <h3 className="text-xl font-bold">Work Flow Pro</h3>
                      <p className="text-gray-500">HR Management System</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="h-10 bg-gray-100 rounded-md border border-gray-300"></div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="h-10 bg-gray-100 rounded-md border border-gray-300"></div>
                      </div>
                      <Button className="w-full" disabled>
                        Sign In
                      </Button>
                    </div>
                    <div className="mt-4 text-center">
                      <a href="#" className="text-sm text-blue-600 hover:underline">Forgot Password?</a>
                    </div>
                  </div>
                </div>
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