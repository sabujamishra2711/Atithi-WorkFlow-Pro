"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User, FileText, Download, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/apiClient';

interface Employee {
  empId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  uanNumber: string;
}

interface PayrollRecord {
  _id: string;
  empId: string;
  month: number;
  year: number;
  employeeName: string;
  department: string;
  designation: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  medical: number;
  lta: number;
  otherAllowance: number;
  fixedSalary: number;
  presentDays: number;
  absentDays: number;
  otHours: number;
  otAmount: number;
  phDays: number;
  phAmount: number;
  totalEarnings: number;
  pf: number;
  esi: number;
  tds: number;
  leaveDeduction: number;
  otherDeduction: number;
  totalDeduction: number;
  netSalary: number;
  status: string;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PayslipPage() {
  const searchParams = useSearchParams();
  const empId = searchParams.get('empId');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewed, setPreviewed] = useState(false);

  useEffect(() => {
    async function fetchPayslipData() {
      if (!empId) {
        setError("Employee ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch employee details
        const employeeResponse = await api.get(`/employees/${empId}`);
        setEmployee(employeeResponse.data);

        // Fetch current month payslip
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
        const year = currentDate.getFullYear();

        const payslipResponse = await api.get(`/payroll/payslip/${empId}/${month}/${year}`);
        setPayslip(payslipResponse.data);
      } catch (error: any) {
        console.error('Error fetching payslip data:', error);
        setError(error.response?.data?.message || "Failed to fetch payslip data");
      } finally {
        setLoading(false);
      }
    }

    fetchPayslipData();
  }, [empId]);

  const handleDownload = async () => {
    if (!payslip) return;

    try {
      // Use the direct backend endpoint for download
      const downloadUrl = `/api/v1/hr/payroll/payslip/${payslip.empId}?month=${payslip.year}-${payslip.month.toString().padStart(2, '0')}`;

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = `payslip_${payslip.empId}_${payslip.year}-${payslip.month.toString().padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error downloading payslip:', error);
      toast({
        title: "Error",
        description: "Failed to download payslip: " + (error.message || "Unknown error"),
        variant: "destructive"
      });
    }
  };

  const handlePreview = async () => {
    if (!payslip) return;

    try {
      // Open preview in a new window/tab
      const previewUrl = `/api/v1/hr/payroll/preview/${payslip.empId}?month=${payslip.year}-${payslip.month.toString().padStart(2, '0')}`;
      window.open(previewUrl, '_blank');
      // Set previewed state to true after successful preview
      setPreviewed(true);
    } catch (error: any) {
      console.error('Error previewing payslip:', error);
      toast({
        title: "Error",
        description: "Failed to preview payslip: " + (error.message || "Unknown error"),
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month - 1); // month is 1-12, so subtract 1
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Loading...</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payslip...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error || !employee || !payslip) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Payslip Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Payslip Not Found</h2>
            <p className="text-gray-600 mb-4">{error || "The requested payslip does not exist."}</p>
            <Button asChild>
              <Link href="/hr/payroll">Back to Payroll</Link>
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Link href="/hr/payroll" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Payslip</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Payslip for {formatMonthYear(payslip.month, payslip.year)}</h2>
            <p className="text-muted-foreground">For {employee.firstName} {employee.lastName} ({employee.empId})</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            {previewed && (
              <Button onClick={handleDownload} className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            {/* Also allow download without preview for testing */}
            {!previewed && (
              <Button onClick={handleDownload} className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]">
                <Download className="h-4 w-4 mr-2" />
                Download PDF (Direct)
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Employee Name</p>
                <p className="text-sm text-muted-foreground">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Employee ID</p>
                <p className="text-sm text-muted-foreground">{employee.empId}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Department</p>
                <p className="text-sm text-muted-foreground">{employee.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Designation</p>
                <p className="text-sm text-muted-foreground">{employee.designation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span>₹{payslip.basicSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>HRA</span>
                  <span>₹{payslip.hra.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Allowance</span>
                  <span>₹{payslip.specialAllowance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conveyance</span>
                  <span>₹{payslip.conveyance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medical</span>
                  <span>₹{payslip.medical.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>LTA</span>
                  <span>₹{payslip.lta.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Allowance</span>
                  <span>₹{payslip.otherAllowance.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total Earnings</span>
                  <span>₹{payslip.totalEarnings.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>PF</span>
                  <span>₹{payslip.pf.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESI</span>
                  <span>₹{payslip.esi.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS</span>
                  <span>₹{payslip.tds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Leave Deduction</span>
                  <span>₹{payslip.leaveDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Deduction</span>
                  <span>₹{payslip.otherDeduction.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total Deductions</span>
                  <span>₹{payslip.totalDeduction.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Net Salary</p>
                <p className="text-2xl font-bold">₹{payslip.netSalary.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-lg font-semibold ${payslip.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                  {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                </p>
              </div>
              {payslip.paymentDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="text-lg">{formatDate(payslip.paymentDate)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}