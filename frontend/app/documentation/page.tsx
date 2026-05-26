"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, Clock, Calendar, DollarSign, Heart, Headphones, FileText, BookOpen, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DocumentationPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("introduction");

  const sections = [
    { id: "introduction", title: "Introduction", icon: FileText },
    { id: "profile", title: "Employee Profile Management", icon: Users },
    { id: "attendance", title: "Attendance Management", icon: Clock },
    { id: "leave", title: "Leave Management", icon: Calendar },
    { id: "payroll", title: "Payroll and Salary", icon: DollarSign },
    { id: "health", title: "Health and Safety", icon: Heart },
    { id: "training", title: "Training and Development", icon: GraduationCap },
    { id: "support", title: "Feedback and Support", icon: Headphones },
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">User Documentation</h1>
            <Button onClick={() => router.push("/")} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-1/4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`flex items-center w-full text-left px-3 py-2 rounded-md transition-colors ${activeSection === section.id
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {section.title}
                    </button>
                  );
                })}
              </nav>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Documentation Version: 1.0.1
                  <br />
                  Last Updated: September 1, 2025
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4 space-y-12">
          {/* Introduction Section */}
          <section id="introduction" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Overview of the HRMS</h3>
                  <p>
                    Atithi WorkFlow Pro is a comprehensive Human Resource Management System designed to streamline HR operations for organizations.
                    The system provides a centralized platform for managing employee data, attendance tracking, leave management, payroll processing,
                    and performance evaluation.
                  </p>

                  <h3>Benefits of Using the System</h3>
                  <ul>
                    <li><strong>Centralized Data Management</strong>: All employee information in one secure location</li>
                    <li><strong>Automated Processes</strong>: Streamlined attendance, leave, and payroll calculations</li>
                    <li><strong>Real-time Analytics</strong>: Dashboard with key HR metrics and trends</li>
                    <li><strong>Role-based Access</strong>: Secure access based on user roles (Admin, HR, Employee)</li>
                    <li><strong>Mobile-friendly Interface</strong>: Accessible from any device with a web browser</li>
                  </ul>

                  <h3>Accessing the HRMS</h3>
                  <ol>
                    <li>Open your preferred web browser (Chrome, Firefox, Safari, or Edge)</li>
                    <li>Navigate to the HRMS login page</li>
                    <li>Enter your email and password</li>
                    <li>Click "Login" to access your dashboard</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Employee Profile Management */}
          <section id="profile" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Employee Profile Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Viewing and Updating Personal Information</h3>
                  <p>
                    Access your profile through the "My Profile" section in the navigation menu. View your personal details,
                    contact information, and employment data. Click "Edit" to update information such as:
                  </p>
                  <ul>
                    <li>Personal details (name, date of birth, address)</li>
                    <li>Contact information (email, phone numbers)</li>
                    <li>Emergency contacts</li>
                    <li>Educational qualifications</li>
                    <li>Work experience</li>
                  </ul>

                  <h3>Uploading and Updating Profile Images</h3>
                  <ol>
                    <li>Navigate to your profile page</li>
                    <li>Click on your current profile image</li>
                    <li>Select "Upload New Image"</li>
                    <li>Choose an image from your device (JPG, PNG format recommended)</li>
                    <li>Crop and adjust as needed</li>
                    <li>Click "Save" to update your profile picture</li>
                  </ol>

                  <h3>Managing Emergency Contacts and References</h3>
                  <p>
                    Access the "Emergency Contacts" tab in your profile. Add or update contact information for family members
                    or close contacts. Include name, relationship, phone number, and address. Maintain at least two emergency
                    contacts for workplace safety.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Attendance Management */}
          <section id="attendance" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Attendance Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Marking Attendance</h3>
                  <p>
                    Employees can mark attendance through the "Punch" section. Click "Punch In" when arriving and "Punch Out"
                    when leaving. The system automatically records timestamps. HR personnel can view attendance records in real-time.
                  </p>

                  <h3>Attendance Policies</h3>
                  <ul>
                    <li><strong>Working Hours</strong>: Standard workday is 9 hours (including 1 hour lunch break)</li>
                    <li><strong>Late Arrival</strong>: After 9:15 AM is considered late</li>
                    <li><strong>Early Departure</strong>: Before 6:15 PM is considered early leave</li>
                    <li><strong>Overtime</strong>: Work beyond 9 hours is counted as overtime</li>
                  </ul>

                  <h3>Viewing Attendance Records</h3>
                  <p>
                    Access your attendance history through the "Attendance" section in your dashboard. You can view:
                  </p>
                  <ul>
                    <li>Daily attendance records</li>
                    <li>Monthly summaries</li>
                    <li>Overtime hours</li>
                    <li>Late arrivals and early departures</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Leave Management */}
          <section id="leave" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Leave Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Leave Types and Policies</h3>
                  <p>
                    The system supports multiple leave types with different policies:
                  </p>
                  <ul>
                    <li><strong>Casual Leave (CL)</strong>: For personal reasons, typically 12 days per year</li>
                    <li><strong>Sick Leave (SL)</strong>: For illness or medical appointments, typically 12 days per year</li>
                    <li><strong>Earned Leave (EL)</strong>: Accumulated paid time off based on attendance</li>
                    <li><strong>Leave Without Pay (LWP)</strong>: Unpaid leave for extended absences</li>
                    <li><strong>Compensatory Off (COFF)</strong>: For working on holidays or weekends</li>
                  </ul>

                  <h3>Applying for Leaves</h3>
                  <ol>
                    <li>Navigate to the "Leave Management" section</li>
                    <li>Click "Apply for Leave"</li>
                    <li>Select leave type:
                      <ul>
                        <li><strong>Casual Leave (CL)</strong>: For personal reasons</li>
                        <li><strong>Sick Leave (SL)</strong>: For illness or medical appointments</li>
                        <li><strong>Earned Leave (EL)</strong>: Accumulated paid time off</li>
                        <li><strong>Leave Without Pay (LWP)</strong>: Unpaid leave</li>
                        <li><strong>Compensatory Off (COFF)</strong>: For working on holidays</li>
                      </ul>
                    </li>
                    <li>Specify start and end dates</li>
                    <li>Provide reason for leave</li>
                    <li>Submit application for approval</li>
                  </ol>

                  <h3>Viewing Leave Balances and History</h3>
                  <p>
                    Access "Leave Balance" to see remaining allocations for each leave type. View "Leave History" to track past
                    applications. All applications are treated as approved by default and can be removed at any time.
                  </p>

                  <h3>Leave Application Workflow</h3>
                  <ol>
                    <li>Employee submits leave application through the system</li>
                    <li>Application is sent to the reporting manager for approval</li>
                    <li>Manager reviews and approves/rejects the application</li>
                    <li>Employee receives notification of approval status</li>
                    <li>Leave balance is automatically updated</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Payroll and Salary Information */}
          <section id="payroll" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Payroll and Salary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Accessing Payslips</h3>
                  <ol>
                    <li>Navigate to the "Payroll" section</li>
                    <li>Select the month and year for which you need the payslip</li>
                    <li>Click "Download Payslip" to view or save the PDF document</li>
                    <li>Payslips include:
                      <ul>
                        <li>Gross salary components</li>
                        <li>Deductions (taxes, provident fund, etc.)</li>
                        <li>Net pay amount</li>
                        <li>Attendance details</li>
                      </ul>
                    </li>
                  </ol>

                  <h3>Understanding Salary Components</h3>
                  <ul>
                    <li><strong>Basic Salary</strong>: Fixed component of your compensation</li>
                    <li><strong>House Rent Allowance (HRA)</strong>: For accommodation expenses</li>
                    <li><strong>Dearness Allowance (DA)</strong>: Cost of living adjustment</li>
                    <li><strong>Special Allowance</strong>: Performance-based or other allowances</li>
                    <li><strong>Professional Tax</strong>: State-specific tax deduction</li>
                    <li><strong>Income Tax</strong>: Government tax based on income slabs</li>
                  </ul>

                  <h3>Payroll Processing Timeline</h3>
                  <p>
                    Payroll is processed monthly with the following timeline:
                  </p>
                  <ul>
                    <li>1st-5th: Attendance and leave data consolidation</li>
                    <li>6th-10th: Salary calculation and verification</li>
                    <li>11th-15th: Payslip generation and distribution</li>
                    <li>16th: Salary credited to bank accounts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Health and Safety */}
          <section id="health" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Health and Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Updating Health Information</h3>
                  <p>
                    Access the "Health" tab in your profile. Provide information about:
                  </p>
                  <ul>
                    <li>Major illnesses or chronic conditions</li>
                    <li>Physical disabilities or limitations</li>
                    <li>Allergies or medical sensitivities</li>
                  </ul>
                  <p>
                    This information helps ensure workplace safety accommodations.
                  </p>

                  <h3>Reporting Workplace Injuries or Hazards</h3>
                  <ol>
                    <li>Navigate to "Safety" section</li>
                    <li>Click "Report Incident"</li>
                    <li>Describe the incident or hazard</li>
                    <li>Include date, time, and location</li>
                    <li>Add photos if applicable</li>
                    <li>Submit report for investigation</li>
                  </ol>

                  <h3>Emergency Procedures</h3>
                  <p>
                    In case of emergency:
                  </p>
                  <ul>
                    <li>Contact security immediately (extension 911)</li>
                    <li>Follow evacuation procedures posted in your area</li>
                    <li>Assemble at designated safe zones</li>
                    <li>Report injuries to the first aid station</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Training and Development */}
          <section id="training" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Training and Development
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Enrolling in Training Programs</h3>
                  <ul>
                    <li>HR announces available training programs in the "Training" section</li>
                    <li>Click "Enroll" for programs relevant to your role</li>
                    <li>Receive confirmation and schedule details via email</li>
                    <li>Track enrollment status in your training dashboard</li>
                  </ul>

                  <h3>Tracking Training History and Certifications</h3>
                  <p>
                    View completed training programs in "Training History"
                  </p>
                  <ul>
                    <li>Download certificates for completed courses</li>
                    <li>Maintain records of professional development activities</li>
                    <li>Update certifications that require renewal</li>
                  </ul>

                  <h3>Professional Development</h3>
                  <p>
                    The organization supports continuous learning through:
                  </p>
                  <ul>
                    <li>Tuition reimbursement for job-related courses</li>
                    <li>Conference attendance opportunities</li>
                    <li>Internal workshops and seminars</li>
                    <li>Mentorship programs</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Support and Feedback */}
          <section id="support" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Headphones className="w-5 h-5 mr-2" />
                  Feedback and Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Providing Feedback on HRMS Features</h3>
                  <ul>
                    <li>Use the "Feedback" option in the help menu</li>
                    <li>Rate your experience with different modules</li>
                    <li>Suggest improvements or new features</li>
                    <li>Report any issues or bugs encountered</li>
                  </ul>

                  <h3>Contacting Support for Assistance</h3>
                  <p>
                    Access "Help & Support" from the main navigation:
                  </p>
                  <ul>
                    <li>Submit a support ticket with your query</li>
                    <li>Include screenshots if relevant to your issue</li>
                    <li>Check "FAQ" section for common questions</li>
                    <li>Live chat available during business hours (9 AM - 6 PM)</li>
                  </ul>

                  <h3>Training Resources</h3>
                  <p>
                    Additional resources for learning the system:
                  </p>
                  <ul>
                    <li>Video tutorials available in the Learning Center</li>
                    <li>Quick reference guides for each module</li>
                    <li>Monthly webinars for new features</li>
                    <li>One-on-one training sessions by appointment</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <div className="py-8 text-center text-gray-500 text-sm">
            <p>Documentation Version: 1.0.1</p>
            <p>Last Updated: September 1, 2025</p>
            <p className="mt-2">© 2025 Atithi Paper LLP. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}