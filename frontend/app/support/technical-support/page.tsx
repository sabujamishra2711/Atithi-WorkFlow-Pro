"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Headphones, Mail, Phone, Clock, MessageCircle, Bug, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TechnicalSupportPage() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // In a real application, this would submit to an API
    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Technical Support</h1>
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
              <Headphones className="w-6 h-6 mr-3 text-blue-600" />
              Technical Support Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700">
                Need help with system issues, bugs, or performance optimization? Our technical support team is available 24/7 to assist you.
              </p>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <h3 className="font-bold text-green-800">24/7 Technical Support</h3>
                <p className="text-green-700">
                  24/7 technical support for system issues, bugs, and performance optimization.
                </p>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-4">Support Channels</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 border-blue-100 text-center">
                  <CardContent className="p-6">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">Email Support</h4>
                    <p className="text-gray-600 mb-4">
                      Submit a detailed support ticket via email for non-urgent issues.
                    </p>
                    <Button 
                      onClick={() => window.location.href = "mailto:tech-support@atithi.com?subject=Technical Support Request"}
                      className="w-full"
                    >
                      Send Email
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100 text-center">
                  <CardContent className="p-6">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">Phone Support</h4>
                    <p className="text-gray-600 mb-4">
                      Call our support hotline for immediate assistance with critical issues.
                    </p>
                    <Button 
                      onClick={() => window.location.href = "tel:+919876543211"}
                      className="w-full"
                    >
                      Call Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-100 text-center">
                  <CardContent className="p-6">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">Live Chat</h4>
                    <p className="text-gray-600 mb-4">
                      Chat with our support representatives during business hours (9 AM - 6 PM).
                    </p>
                    <Button 
                      onClick={() => alert("Live chat would open here in a real implementation")}
                      className="w-full"
                    >
                      Start Chat
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-semibold mt-8 mb-4">Common Technical Issues</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                  <Bug className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Login Issues</h4>
                    <p className="text-sm text-gray-600">Trouble signing in or session timeouts</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Performance Problems</h4>
                    <p className="text-sm text-gray-600">Slow loading or system unresponsiveness</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                  <Bug className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Display Issues</h4>
                    <p className="text-sm text-gray-600">Layout problems or missing information</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Data Sync Errors</h4>
                    <p className="text-sm text-gray-600">Information not updating correctly</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mt-8 mb-4">Submit a Support Request</h3>
              
              {isSubmitted ? (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-6 text-center">
                    <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-bold text-lg mb-2 text-green-800">Request Submitted!</h4>
                    <p className="text-green-700">
                      Thank you for your submission. Our support team will contact you within 24 hours.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your employee ID"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Category</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Select an issue category</option>
                          <option>Login Issues</option>
                          <option>Performance Problems</option>
                          <option>Display Issues</option>
                          <option>Data Sync Errors</option>
                          <option>Feature Request</option>
                          <option>Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Please describe your issue in detail..."
                          required
                        ></textarea>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="urgent"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="urgent" className="ml-2 block text-sm text-gray-700">
                          Mark as urgent (response within 2 hours)
                        </label>
                      </div>
                      
                      <Button type="submit" className="w-full py-3">
                        <Mail className="w-5 h-5 mr-2" />
                        Submit Support Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <h3 className="text-xl font-semibold mt-8 mb-4">Support Hours</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Support Level</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">Monday - Friday</td>
                      <td className="px-6 py-4 whitespace-nowrap">9:00 AM - 6:00 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Full Support
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">Saturday - Sunday</td>
                      <td className="px-6 py-4 whitespace-nowrap">10:00 AM - 4:00 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Limited Support
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">Holidays</td>
                      <td className="px-6 py-4 whitespace-nowrap">Closed</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Emergency Only
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
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