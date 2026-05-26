"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/apiClient';

interface Employee {
  empId: string;
  firstName: string;
  lastName: string;
  employeeType: string;
}

interface LeaveBalance {
  PL: number;
  CL: number;
  SL: number;
  LWP: number;
  COFF: number;
}

export default function LeaveApplyPage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('employeeId');
  const year = searchParams.get('year');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [days, setDays] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployeeData() {
      if (!employeeId || !year) {
        setError("Employee ID or Year not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch employee details
        const employeeResponse = await api.get(`/employees/${employeeId}`);
        setEmployee(employeeResponse.data);

        // Fetch leave balance
        const balanceResponse = await api.get(`/leave/balance/${employeeId}/${year}`);
        setLeaveBalance(balanceResponse.data);
      } catch (error: any) {
        console.error('Error fetching employee data:', error);
        setError(error.response?.data?.message || "Failed to fetch employee data");
      } finally {
        setLoading(false);
      }
    }

    fetchEmployeeData();
  }, [employeeId, year]);

  useEffect(() => {
    if (startDate && endDate) {
      // Calculate number of days between start and end date
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDays(diffDays);
    }
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !year || !leaveType || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionError(null); // Clear previous errors
      const response = await api.post(`/leave/apply/${employeeId}/${year}`, {
        leaveType,
        startDate,
        endDate,
        reason
      });

      const data = response.data;

      if (data.success) {
        toast({
          title: "Leave Applied",
          description: "Leave application submitted successfully.",
          variant: "default"
        });
        // Reset form
        setLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
        setDays(1);
      } else {
        const errorMessage = data.message || "Failed to submit leave application";
        setSubmissionError(errorMessage);

        if (data.message && data.message.includes("Leave balance not found")) {
          toast({
            title: "Leave Balance Not Found",
            description: data.message || "Please allocate leaves first. Go to Leave Allocation page.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Error submitting leave application:', error);
      const errorMessage = `Failed to submit leave application: ${error.response?.data?.message || error.message}`;
      setSubmissionError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'PL': return 'bg-blue-100 text-blue-800';
      case 'CL': return 'bg-green-100 text-green-800';
      case 'SL': return 'bg-orange-100 text-orange-800';
      case 'LWP': return 'bg-red-100 text-red-800';
      case 'COFF': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            <p className="text-gray-600">Loading employee data...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error || !employee) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">

          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Employee Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
            <p className="text-gray-600 mb-4">{error || "The requested employee does not exist."}</p>
            <Button asChild>
              <Link href="/hr/leaves">Back to Leaves</Link>
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
        <Link href="/hr/leaves" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Apply for Leave</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">Leave Application</h2>
          <p className="text-muted-foreground">Applying for {employee.firstName} {employee.lastName} ({employee.empId})</p>
        </div>

        {leaveBalance && (
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(leaveBalance).map(([type, balance]) => (
                  <div key={type} className="text-center">
                    <Badge className={getLeaveTypeColor(type)}>
                      {type}
                    </Badge>
                    <p className="text-2xl font-bold mt-2">{balance}</p>
                    <p className="text-sm text-muted-foreground">days</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Leave Application Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Leave Type</label>
                  <Select value={leaveType} onValueChange={setLeaveType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PL">PL (Privilege Leave)</SelectItem>
                      <SelectItem value="CL">CL (Casual Leave)</SelectItem>
                      <SelectItem value="SL">SL (Sick Leave)</SelectItem>
                      <SelectItem value="LWP">LWP (Leave Without Pay)</SelectItem>
                      <SelectItem value="COFF">COFF (Compensatory Off)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <Input
                    type="text"
                    value={year || ''}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Number of Days</label>
                <Input
                  type="number"
                  value={days}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave"
                  required
                />
              </div>

              {submissionError && (
                <div className="text-red-500 text-sm py-2">
                  {submissionError}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]">
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}