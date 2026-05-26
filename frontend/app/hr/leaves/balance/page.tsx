"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User, FileText, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/apiClient';
import { Input } from '@/components/ui/input';

interface Employee {
  empId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
}

interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
}

// Main page to list all employees with their leave balances
function LeaveBalancesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true);
        // Fetch all employees
        const response = await api.get('/employees/getAllEmployees');
        const employeesData = response.data.employees || response.data;
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
      } catch (error: any) {
        console.error('Error fetching employees:', error);
        setError(error.response?.data?.message || "Failed to fetch employees");
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.toLowerCase();
    return (
      emp.empId.toLowerCase().includes(term) ||
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      (emp.designation && emp.designation.toLowerCase().includes(term))
    );
  });

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
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">

          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Error</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/hr/leaves">Back to Leave Dashboard</Link>
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
        <h1 className="text-lg font-semibold">Employee Leave Balances</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">Leave Balances</h2>
          <p className="text-muted-foreground">View leave balances for all employees</p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, ID, department, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Employees List */}
        <Card>
          <CardHeader>
            <CardTitle>All Employees ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEmployees.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {searchTerm ? "No employees found matching your search." : "No employees found."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.empId} className="border rounded-lg hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{employee.firstName} {employee.lastName}</h3>
                          <p className="text-sm text-muted-foreground">{employee.empId}</p>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/hr/leaves/balance?employeeId=${employee.empId}`}>
                            View Balance
                          </Link>
                        </Button>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center text-sm">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{employee.department || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{employee.designation || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

// Individual employee leave balance page
function EmployeeLeaveBalancePage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('employeeId');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeaveBalanceData() {
      if (!employeeId) {
        setError("Employee ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch employee details
        const employeeResponse = await api.get(`/employees/${employeeId}`);
        setEmployee(employeeResponse.data);

        // Fetch leave balance
        const balanceResponse = await api.get(`/leave/balance/${employeeId}`);
        // Transform the object response to an array for mapping
        const balanceData = balanceResponse.data.data;
        const balanceArray = Object.keys(balanceData).map(leaveType => ({
          leaveType,
          allocated: balanceData[leaveType].allocated,
          used: balanceData[leaveType].used,
          balance: balanceData[leaveType].balance
        }));
        setLeaveBalances(balanceArray);
      } catch (error: any) {
        console.error('Error fetching leave balance data:', error);
        setError(error.response?.data?.message || "Failed to fetch leave balance data");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaveBalanceData();
  }, [employeeId]);

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
            <p className="text-gray-600">Loading leave balance...</p>
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
              <Link href="/hr/leaves/balance">Back to Leave Balances</Link>
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
        <Link href="/hr/leaves/balance" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Employee Leave Balance</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">Leave Balance for {employee.firstName} {employee.lastName}</h2>
          <p className="text-muted-foreground">Employee ID: {employee.empId}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveBalances.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No leave balances found for this employee.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveBalances.map((balance, index) => (
                  <Card key={index} className="border rounded-lg">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{balance.leaveType}</h3>
                          <p className="text-sm text-muted-foreground">Leave Type</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(balance.leaveType)}`}>
                          {balance.leaveType}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Allocated</span>
                          <span className="font-medium">{balance.allocated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Used</span>
                          <span className="font-medium">{balance.used}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-sm font-medium">Balance</span>
                          <span className="font-bold text-lg">{balance.balance}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

// Main component that decides which page to show
export default function LeaveBalancePage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('employeeId');

  // If employeeId is provided, show individual employee page
  // Otherwise, show the list of all employees
  if (employeeId) {
    return <EmployeeLeaveBalancePage />;
  } else {
    return <LeaveBalancesListPage />;
  }
}