"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Key, Headphones, BookOpen, Mail, Phone, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportHubPage() {
  const router = useRouter();

  const supportOptions = [
    {
      title: "New User Setup",
      description: "Getting started with your account and initial configuration",
      icon: UserPlus,
      path: "/support/new-user",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Account Recovery",
      description: "Password reset and account access assistance",
      icon: Key,
      path: "/support/account-recovery",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Technical Support",
      description: "System issues, bugs, and performance optimization",
      icon: Headphones,
      path: "/support/technical-support",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "User Documentation",
      description: "Comprehensive guides for all HRMS features",
      icon: BookOpen,
      path: "/documentation",
      color: "from-orange-500 to-orange-600",
    },
  ];

  const contactOptions = [
    {
      title: "Email Support",
      description: "Send us a detailed support ticket",
      icon: Mail,
      action: () => window.location.href = "mailto:contact.mscoders@gmail.com",
      buttonText: "contact.mscoders@gmail.com",
    },
    {
      title: "Phone Support",
      description: "Call for immediate assistance",
      icon: Phone,
      action: () => window.location.href = "tel:+919876543210",
      buttonText: "+91 94551 91756",
    },
    {
      title: "Live Chat",
      description: "Chat with support during business hours",
      icon: MessageCircle,
      action: () => alert("Live chat is under development"),
      buttonText: "Start Chat",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <Button onClick={() => router.push("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How Can We Help You?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to your questions, get help with account issues, or contact our support team for assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {supportOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg"
                onClick={() => router.push(option.path)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{option.title}</h3>
                  <p className="text-gray-600">{option.description}</p>
                  <Button variant="link" className="mt-4 p-0 h-auto group-hover:underline">
                    Learn more →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Contact Support Directly</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <Card key={index} className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{option.title}</h4>
                    <p className="text-gray-600 mb-4">{option.description}</p>
                    <Button 
                      onClick={option.action}
                      className="w-full"
                      variant="outline"
                    >
                      {option.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Immediate Assistance?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              For urgent issues requiring immediate attention, please call our 24/7 emergency support line.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              onClick={() => window.location.href = "tel:+919876543211"}
            >
              <Phone className="w-5 h-5 mr-2" />
              Emergency Support: +91 94551 91756
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Support Center Version: 1.0.0</p>
          <p>Last Updated: September 1, 2025</p>
        </div>
      </div>
    </div>
  );
}