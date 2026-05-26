"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
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
}

interface LeaveApplication {
  _id: string;
  empId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export default function LeaveApplicationDetailPage() {
  const searchParams = useSearchParams();
  const empId = searchParams.get('empId');
  const applicationId = searchParams.get('applicationId');
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [application, setApplication] = useState<LeaveApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    async function fetchApplicationData() {
      if (!empId || !applicationId) {
        setError("Employee ID or Application ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch employee details
        const employeeResponse = await api.get(`/employees/${empId}`);
        setEmployee(employeeResponse.data);
        
        // Fetch leave application details
        const applicationResponse = await api.get(`/leave/applications/${applicationId}`);
        setApplication(applicationResponse.data);
      } catch (error: any) {
        console.error('Error fetching application data:', error);
        setError(error.response?.data?.message || "Failed to fetch application data");
      } finally {
        setLoading(false);
      }
    }

    fetchApplicationData();
  }, [empId, applicationId]);

  const handleApprove = async () => {
    if (!application) return;
    
    setIsApproving(true);
    try {
      const response = await api.put(`/leave/applications/${application._id}/approve`, {
        reason: approvalReason
      });
      
      setApplication(response.data);
      setApprovalReason("");
      toast({
        title: "Leave Approved",
        description: "Leave application has been approved successfully.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error approving leave:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve leave application",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!application) return;
    
    setIsRejecting(true);
    try {
      const response = await api.put(`/leave/applications/${application._id}/reject`, {
        reason: approvalReason
      });
      
      setApplication(response.data);
      setApprovalReason("");
      toast({
        title: "Leave Rejected",
        description: "Leave application has been rejected.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject leave application",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
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
            <p className="text-gray-600">Loading leave application...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error || !employee || !application) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Application Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Application Not Found</h2>
            <p className="text-gray-600 mb-4">{error || "The requested leave application does not exist."}</p>
            <Button asChild>
              <Link href="/hr/leaves/applications">Back to Applications</Link>
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
        <Link href="/hr/leaves/applications" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Leave Application Details</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Leave Application for {employee.firstName} {employee.lastName}</h2>
            <p className="text-muted-foreground">Application ID: {application._id}</p>
          </div>
          <div className="flex gap-2">
            {application.status === "Pending" && (
              <>
                <Button 
                  onClick={handleReject} 
                  disabled={isApproving || isRejecting}
                  variant="destructive"
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </Button>
                <Button 
                  onClick={handleApprove} 
                  disabled={isApproving || isRejecting}
                  className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]"
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                {application.status}
              </span>
              {application.status === "Approved" && application.approvedAt && (
                <p className="text-sm text-muted-foreground">
                  Approved on {formatDateTime(application.approvedAt)}
                  {application.approvedBy && ` by ${application.approvedBy}`}
                </p>
              )}
              {application.status === "Rejected" && application.approvedAt && (
                <p className="text-sm text-muted-foreground">
                  Rejected on {formatDateTime(application.approvedAt)}
                  {application.approvedBy && ` by ${application.approvedBy}`}
                </p>
              )}
            </div>
            {application.status === "Rejected" && application.rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <h4 className="font-medium text-red-800">Rejection Reason</h4>
                <p className="text-red-700">{application.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{employee.firstName} {employee.lastName}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Employee ID</p>
                  <p className="text-sm text-muted-foreground">{employee.empId}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <p className="text-sm text-muted-foreground">{employee.department}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Designation</p>
                  <p className="text-sm text-muted-foreground">{employee.designation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Leave Type</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(application.leaveType)}`}>
                    {application.leaveType}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(application.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
          <p className="text-sm text-muted-foreground">{formatDate(application.endDate)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Days</p>
                  <p className="text-sm text-muted-foreground">{application.days} days</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Applied On</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(application.appliedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reason for Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{application.reason || "No reason provided"}</p>
          </CardContent>
        </Card>

        {application.status === "Pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Approve/Reject Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason (Optional)</label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  placeholder="Enter reason for approval or rejection..."
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleReject} 
                  disabled={isApproving || isRejecting}
                  variant="destructive"
                >
                  {isRejecting ? "Rejecting..." : "Reject Application"}
                </Button>
                <Button 
                  onClick={handleApprove} 
                  disabled={isApproving || isRejecting}
                  className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]"
                >
                  {isApproving ? "Approving..." : "Approve Application"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  );
}