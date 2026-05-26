"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Users, Calendar, Clock, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { api } from "@/lib";

interface Employee {
    _id: string;
    empId: string;
    firstName: string;
    lastName: string;
    employeeType?: string;
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

export default function AllLeaveApplicationsPage() {
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [applications, setApplications] = useState<LeaveApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [searchTerm, setSearchTerm] = useState(""); // For filtering applications
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState(""); // For filtering employees in dropdown
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            await fetchEmployees();
            // Fetch all applications on page load
            await fetchLeaveApplications();
        };
        fetchData();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/v1/employees/getAllEmployees');
            const data = await response.json();

            if (data.success) {
                const employeesData = data.employees || [];
                setEmployees(employeesData);
            } else {
                console.error('API returned error for employees:', data.message);
                setEmployees([]);
                toast({
                    title: "Error",
                    description: data.message || "Failed to fetch employees",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
            toast({
                title: "Error",
                description: "Failed to fetch employees",
                variant: "destructive"
            });
        }
    };

    const fetchLeaveApplications = async (empId?: string) => {
        try {
            setLoading(true);
            // Get the token from localStorage - using the same approach as other pages
            const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'

            // Fetch applications for the current year by default
            const currentYear = new Date().getFullYear();
            let url = `/api/v1/leave/applications?year=${currentYear}`;

            // If empId is provided, filter by employee
            if (empId) {
                url += `&empId=${empId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}` // Add the authorization header
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
            } else {
                console.error('API returned error for leave applications:', data.message);
                setApplications([]);
                toast({
                    title: "Error",
                    description: data.message || "Failed to fetch leave applications",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error fetching leave applications:', error);
            setApplications([]);
            toast({
                title: "Error",
                description: "Failed to fetch leave applications",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setCurrentPage(1);
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployee(empId);
        if (empId) {
            fetchLeaveApplications(empId);
        } else {
            // If no employee selected, show all applications
            fetchLeaveApplications();
        }
    };

    const handleRemoveApplication = async (empId: string, applicationId: string) => {
        // Confirm before deleting
        if (!window.confirm("Are you sure you want to remove this leave application? This action cannot be undone.")) {
            return;
        }

        try {
            // Get the access token from localStorage
            const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

            console.log('Attempting to delete leave application:', { empId, applicationId, token });

            const response = await fetch(`/api/v1/leave/application/${empId}/${applicationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
            });

            console.log('Delete response status:', response.status);
            console.log('Delete response headers:', [...response.headers.entries()]);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('Delete response data:', data);
            } else {
                const text = await response.text();
                console.log('Delete response text:', text);
                data = { error: 'Unexpected response format', text };
            }

            if (!response.ok) {
                console.log('Error response data:', data);
                throw new Error(data.message || data.text || `Failed to remove leave application: ${response.status} ${response.statusText}`);
            }

            if (data.success) {
                toast({
                    title: "Success",
                    description: "Leave application removed successfully.",
                    variant: "default"
                });
                // Refresh applications
                if (selectedEmployee) {
                    fetchLeaveApplications(selectedEmployee);
                } else {
                    // If no employee selected, refresh all applications
                    fetchLeaveApplications();
                }
            } else {
                toast({
                    title: "Error",
                    description: data.message || "Failed to remove leave application",
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            console.error('Error removing leave application:', error);
            toast({
                title: "Error",
                description: "Failed to remove leave application: " + (error.message || "Unknown error"),
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
        if (!emp || typeof emp !== 'object') {
            return false;
        }

        const hasValidEmpId = emp.empId && typeof emp.empId === 'string' && emp.empId.trim() !== '';
        const hasName = (emp.firstName && typeof emp.firstName === 'string' && emp.firstName.trim() !== '') ||
            (emp.lastName && typeof emp.lastName === 'string' && emp.lastName.trim() !== '');

        if (!hasValidEmpId || !hasName) {
            return false;
        }

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

    const filteredApplications = applications.filter(app =>
        (app.empId && app.empId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.employeeName && app.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.leaveType && app.leaveType.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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

    // Add this useEffect hook to reset selected employee when search term changes significantly
    useEffect(() => {
        if (employeeSearchTerm.length > 2 && selectedEmployee && !filteredEmployees.find(emp => emp.empId === selectedEmployee)) {
            // If the selected employee is no longer in the filtered list, clear the selection
            setSelectedEmployee("");
            setApplications([]);
        }
    }, [employeeSearchTerm, filteredEmployees, selectedEmployee]);

    return (
        <SidebarInset>
            {/* Modern HR Header */}
            <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">All Leave Applications</h1>
                    <p className="text-sm text-muted-foreground">View and remove leave applications for employees</p>
                </div>
            </header>
            <div className="flex-1 p-6 space-y-6">
                {/* Header Section with stats */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">All Leave Applications</h2>
                        <p className="text-muted-foreground">View and remove leave applications for employees</p>
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
                    {/* Employee Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Select Employee
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Employee</label>
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
                                                <Select value={selectedEmployee || undefined} onValueChange={handleEmployeeSelect}>
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
                                                            setApplications([]);
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Applications Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Leave Applications
                                </CardTitle>
                                {selectedEmployee ? (
                                    <Button variant="outline" size="sm" onClick={() => fetchLeaveApplications(selectedEmployee)}>
                                        Refresh
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => fetchLeaveApplications()}>
                                        Refresh
                                    </Button>
                                )}
                            </div>
                            <CardDescription>
                                {selectedEmployee
                                    ? `Showing applications for employee ${selectedEmployee}`
                                    : "Showing all leave applications"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!selectedEmployee ? (
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
                                                    Applied: {formatDate(app.appliedAt)}
                                                </p>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveApplication(app.empId, app._id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                            ) : loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                    <span className="ml-2">Loading applications...</span>
                                </div>
                            ) : filteredApplications.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No leave applications found for this employee</p>
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
                                                    Applied: {formatDate(app.appliedAt)}
                                                </p>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveApplication(app.empId, app._id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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