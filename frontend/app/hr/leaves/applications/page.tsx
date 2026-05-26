"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Users, Calendar, Plus, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { api } from "@/lib";

interface Employee {
  _id: string;
  empId: string;
  firstName: string;
  lastName: string;
  employeeType?: string;
  // Add other relevant fields
}

interface LeaveApplication {
  _id: string;
  empId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  appliedAt: string;
  reason?: string;
}

export default function LeaveApplicationsPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);

  // Debug state changes
  useEffect(() => {
    console.log('Applications state changed:', applications.length);
  }, [applications]);

  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // For filtering applications
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState(""); // For filtering employees in dropdown
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      await fetchEmployees();
      await fetchLeaveApplications();
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedEmployee || selectedEmployee.trim() === '' || !startDate || !endDate) {
      setOverlapWarning("");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const overlap = applications.some(app =>
      app.empId === selectedEmployee &&
      app.status === 'Approved' &&
      start <= new Date(app.endDate) && end >= new Date(app.startDate)
    );
    if (overlap) {
      setOverlapWarning("Already on leave for one or more selected dates. Cannot add another leave.");
    } else {
      setOverlapWarning("");
    }
  }, [selectedEmployee, startDate, endDate, applications]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/v1/employees/getAllEmployees');
      const data = await response.json();
      if (data.success) {
        const employeesData = data.employees || [];
        setEmployees(employeesData);
      } else {
        // Handle case where success is false but we still have employees
        const employeesData = data.employees && Array.isArray(data.employees)
          ? data.employees
          : [];
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]); // Set empty array on error to avoid undefined
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      setLoading(true);

      // Fetch applications for the current year by default
      const currentYear = new Date().getFullYear();

      // Get token from localStorage
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`/api/v1/leave/applications?year=${currentYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Extract applications from the ApiResponse structure
        const applicationsData = data.data || data.applications || [];

        // Sort applications by appliedAt date (newest first)
        const sortedApplications = (applicationsData || []).sort((a: LeaveApplication, b: LeaveApplication) => {
          return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        });

        setApplications(sortedApplications);
      }
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    } finally {
      setLoading(false);
      // Reset to first page when data changes
      setCurrentPage(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || !leaveType || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmissionError(null); // Clear previous errors
      // Fixed the URL to use 'leave' (singular) instead of 'leaves' (plural)
      const response = await api.post(`/leave/apply/${selectedEmployee}/${new Date().getFullYear()}`, {
        leaveType,
        startDate,
        endDate,
        reason
      });

      const data = response.data;

      if (data.success) {
        toast({
          title: "Leave Applied",
          description: "Leave application added successfully.",
          variant: "default"
        });
        // Reset form
        setSelectedEmployee('');
        setLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
        setOverlapWarning(null);
        // Refresh applications
        fetchLeaveApplications();
      } else {
        const errorMessage = data.message || "Failed to add leave application";
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
      console.error('Error adding leave application:', error);
      const errorMessage = `Failed to add leave application: ${error.response?.data?.message || error.message}`;
      setSubmissionError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredEmployees = employees.filter(emp => {
    // Ensure emp is a valid object
    if (!emp || typeof emp !== 'object') {
      return false;
    }

    // Check required fields
    const hasValidEmpId = emp.empId && typeof emp.empId === 'string' && emp.empId.trim() !== '';
    const hasName = (emp.firstName && typeof emp.firstName === 'string' && emp.firstName.trim() !== '') ||
      (emp.lastName && typeof emp.lastName === 'string' && emp.lastName.trim() !== '');

    if (!hasValidEmpId || !hasName) {
      return false;
    }

    // Check if employee matches search term
    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      emp.empId.toLowerCase().includes(searchLower) ||
      (emp.firstName && emp.firstName.toLowerCase().includes(searchLower)) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(searchLower)) ||
      (emp.firstName && emp.lastName &&
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower)
      )
    );
  });

  // Filter applications based on search term
  const filteredApplications = searchTerm.trim() === '' ? applications :
    applications.filter(app => {
      const result = (app.empId && app.empId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.employeeName && app.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.leaveType && app.leaveType.toLowerCase().includes(searchTerm.toLowerCase()));
      return result;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplications = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

  // Pagination controls
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset selected employee when search term changes significantly
  useEffect(() => {
    if (employeeSearchTerm.length > 2 && selectedEmployee && !filteredEmployees.find(emp => emp.empId === selectedEmployee)) {
      // If the selected employee is no longer in the filtered list, clear the selection
      setSelectedEmployee("");
    }
  }, [employeeSearchTerm, filteredEmployees, selectedEmployee]);

  return (
    <SidebarInset>
      {/* Modern HR Header */}
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Leave Applications</h1>
          <p className="text-sm text-muted-foreground">Add, review, and manage leave applications for employees</p>
        </div>
      </header>
      <div className="flex-1 p-6 space-y-6">
        {/* Header Section with stats */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Leave Application Entry</h2>
            <p className="text-muted-foreground">Add new leave applications and review existing ones</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {employees.length} Employees
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {applications.length} Applications
            </Badge>
          </div>
        </div>
        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add Leave Application Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Leave Application
              </CardTitle>
              {overlapWarning && (
                <div className="text-red-600 text-sm font-semibold mt-2">{overlapWarning}</div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee *</label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search employees..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      />
                      {loading ? (
                        <div className="text-muted-foreground text-sm">
                          Loading employees...
                        </div>
                      ) : (
                        <div className="relative">
                          <Select value={selectedEmployee || undefined} onValueChange={setSelectedEmployee}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => (
                                  <SelectItem key={emp.empId} value={emp.empId}>
                                    {emp.empId} - {emp.firstName || ''} {emp.lastName || ''} ({emp.employeeType || 'N/A'})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_employees__" disabled>
                                  {employeeSearchTerm ? "No employees found" : "No employees available"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {selectedEmployee && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedEmployee("");
                                setEmployeeSearchTerm("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Leave Type *</label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PL">PL (Paid Leave)</SelectItem>
                        <SelectItem value="CL">CL (Casual Leave)</SelectItem>
                        <SelectItem value="SL">SL (Sick Leave)</SelectItem>
                        <SelectItem value="LWP">LWP (Leave Without Pay)</SelectItem>
                        <SelectItem value="COFF">COFF (Compensatory Off)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date *</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">End Date *</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for leave..."
                    rows={3}
                  />
                </div>

                {submissionError && (
                  <div className="text-red-500 text-sm py-2">
                    {submissionError}
                  </div>
                )}

                <Button type="submit" className="flex items-center gap-2" disabled={!!overlapWarning}>
                  <Plus className="h-4 w-4" />
                  Add Leave Application
                </Button>
              </form>
            </CardContent>
          </Card>
          {/* Applications Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Leave Applications
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchLeaveApplications}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <p className="text-muted-foreground">No leave applications found</p>
              ) : (
                <div className="space-y-4">
                  {paginatedApplications.map((app) => (
                    <div key={app._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{app.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{app.empId}</p>
                        </div>
                        <Badge className={getLeaveTypeColor(app.leaveType)}>
                          {app.leaveType}
                        </Badge>
                        <div className="text-sm">
                          <p>{formatDate(app.startDate)} - {formatDate(app.endDate)}</p>
                          <p className="text-muted-foreground">{app.days} day(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(app.status)}>
                          {app.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(app.appliedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Pagination Controls - Always visible */}
                  <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredApplications.length)} of {filteredApplications.length} applications
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      {/* Page numbers */}
                      <div className="flex space-x-1">
                        {[...Array(totalPages)].map((_, index) => {
                          const page = index + 1;
                          // Show first, last, current, and nearby pages
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(page)}
                                className={currentPage === page ? "bg-blue-500 text-white" : ""}
                              >
                                {page}
                              </Button>
                            );
                          }
                          // Show ellipsis for skipped pages
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <span key={page} className="px-2 py-1 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}