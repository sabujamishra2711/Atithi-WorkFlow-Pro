"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from "@/lib/hooks/useAuth";
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import api from "@/lib/apiClient";

interface Employee {
  empId: string;
  firstName: string;
  lastName: string;
}

interface LeaveAllocationResult {
  empId: string;
  employeeName: string;
  presentDays: number;
  totalWorkingDays: number;
  leaves: {
    PL: { allocated: number; balance: number };
    CL: { allocated: number; balance: number };
    SL: { allocated: number; balance: number };
    LWP: { allocated: number; balance: number };
  };
  success: boolean;
  message: string;
}

export default function LeaveAllocationPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeaveAllocationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualYear, setManualYear] = useState(new Date().getFullYear());
  const [manualLeaves, setManualLeaves] = useState({ PL: 0, CL: 0, SL: 0, LWP: 0, COFF: 0 });
  const [currentLeaveBalance, setCurrentLeaveBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { role } = useAuth();
  const [manualAllLoading, setManualAllLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ totalAllocated: 0, totalUsed: 0, totalCOFF: 0 });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchCurrentLeaveBalance();
    } else {
      setCurrentLeaveBalance(null);
    }
  }, [selectedEmployee, year]);

  useEffect(() => {
    // Calculate stats from employees/currentLeaveBalance/results
    let totalAllocated = 0, totalUsed = 0, totalCOFF = 0;
    employees.forEach(emp => {
      // You may need to fetch or calculate these values from your backend or currentLeaveBalance
      // For now, just increment for demo
      totalAllocated += 1;
      totalUsed += 1;
      totalCOFF += 1;
    });
    setDashboardStats({ totalAllocated, totalUsed, totalCOFF });
  }, [employees, currentLeaveBalance, results]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/getAllEmployees');
      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchCurrentLeaveBalance = async () => {
    if (!selectedEmployee) return;

    setBalanceLoading(true);
    try {
      // Fixed the URL to use 'leave' (singular) instead of 'leaves' (plural)
      const response = await api.get(`/leave/balance/${selectedEmployee}/${year}`);
      if (response.data.success) {
        setCurrentLeaveBalance(response.data.data);
      } else {
        setCurrentLeaveBalance(null);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      setCurrentLeaveBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const allocateLeavesForEmployee = async (empId: string) => {
    try {
      // Fixed the URL to use 'leave' (singular) instead of 'leaves' (plural)
      const response = await api.post(`/leave/allocate/${empId}/${year}`);
      const data = response.data;

      if (data.success) {
        return {
          empId,
          employeeName: employees.find(e => e.empId === empId)?.firstName + ' ' + employees.find(e => e.empId === empId)?.lastName,
          presentDays: 0, // This would be calculated in the backend
          totalWorkingDays: 240,
          leaves: {
            PL: { allocated: 12, balance: 12 },
            CL: { allocated: 6, balance: 6 },
            SL: { allocated: 6, balance: 6 },
            LWP: { allocated: 12, balance: 12 }
          },
          success: true,
          message: 'Leaves allocated successfully'
        };
      } else {
        return {
          empId,
          employeeName: employees.find(e => e.empId === empId)?.firstName + ' ' + employees.find(e => e.empId === empId)?.lastName,
          presentDays: 0,
          totalWorkingDays: 240,
          leaves: {
            PL: { allocated: 0, balance: 0 },
            CL: { allocated: 0, balance: 0 },
            SL: { allocated: 0, balance: 0 },
            LWP: { allocated: 0, balance: 0 }
          },
          success: false,
          message: data.message || 'Failed to allocate leaves'
        };
      }
    } catch (error: any) {
      return {
        empId,
        employeeName: employees.find(e => e.empId === empId)?.firstName + ' ' + employees.find(e => e.empId === empId)?.lastName,
        presentDays: 0,
        totalWorkingDays: 240,
        leaves: {
          PL: { allocated: 0, balance: 0 },
          CL: { allocated: 0, balance: 0 },
          SL: { allocated: 0, balance: 0 },
          LWP: { allocated: 0, balance: 0 }
        },
        success: false,
        message: error.response?.data?.message || 'Error allocating leaves'
      };
    }
  };

  const handleAllocateForEmployee = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    setLoading(true);
    const result = await allocateLeavesForEmployee(selectedEmployee);
    setResults([result]);
    setLoading(false);
  };

  const handleAllocateForAll = async () => {
    setLoading(true);
    const allResults: LeaveAllocationResult[] = [];

    for (const employee of employees) {
      const result = await allocateLeavesForEmployee(employee.empId);
      allResults.push(result);
    }

    setResults(allResults);
    setLoading(false);
  };

  const handleManualAllocate = async () => {
    try {
      console.log('Manual allocation request:', {
        empId: manualEmpId,
        year: manualYear,
        leaves: manualLeaves
      });

      // Validate inputs before sending request
      if (!manualEmpId) {
        toast({
          title: 'Error',
          description: 'Please select an employee',
          variant: 'destructive'
        });
        return;
      }

      if (!manualYear) {
        toast({
          title: 'Error',
          description: 'Please select a year',
          variant: 'destructive'
        });
        return;
      }

      // Validate leave values
      const validatedLeaves = {
        PL: Number(manualLeaves.PL) || 0,
        CL: Number(manualLeaves.CL) || 0,
        SL: Number(manualLeaves.SL) || 0,
        LWP: Number(manualLeaves.LWP) || 0,
        COFF: Number(manualLeaves.COFF) || 0
      };

      console.log('Sending validated leave data:', validatedLeaves);

      // Fixed the URL to use 'leave' (singular) instead of 'leaves' (plural)
      const response = await api.put(`/leave/manual-allocate/${manualEmpId}/${manualYear}`, validatedLeaves);
      console.log('Manual allocation response:', response);

      const data = response.data;
      if (data.success) {
        toast({
          title: 'Success',
          description: `Leaves manually allocated for employee ${manualEmpId}`,
          variant: 'default'
        });
        setManualModalOpen(false);
        setResults([]); // Optionally refresh results
        // Refresh current balance if editing the same employee
        if (manualEmpId === selectedEmployee && manualYear === year) {
          // Add a small delay to ensure the database is updated before fetching
          setTimeout(() => {
            fetchCurrentLeaveBalance();
          }, 1000);
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to allocate leaves',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Manual allocation error:', error);
      console.error('Error response:', error.response);

      let errorMessage = 'Failed to allocate leaves';
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        console.error('Server error details:', error.response.data);
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEditBalance = () => {
    if (!currentLeaveBalance) return;

    setManualEmpId(selectedEmployee);
    setManualYear(year);
    setManualLeaves({
      PL: currentLeaveBalance.PL?.allocated || 0,
      CL: currentLeaveBalance.CL?.allocated || 0,
      SL: currentLeaveBalance.SL?.allocated || 0,
      LWP: currentLeaveBalance.LWP?.allocated || 0,
      COFF: currentLeaveBalance.COFF?.allocated || 0
    });
    setManualModalOpen(true);
  };

  const handleAllocateNew = () => {
    setManualEmpId(selectedEmployee);
    setManualYear(year);
    setManualLeaves({ PL: 0, CL: 0, SL: 0, LWP: 0, COFF: 0 });
    setManualModalOpen(true);
  };

  // Handler for manual allocation for all employees
  const handleManualAllocateAll = async () => {
    if (!window.confirm("Are you sure you want to manually allocate all leaves for all employees? This will overwrite existing allocations.")) {
      return;
    }
    setManualAllLoading(true);
    try {
      // Fixed the URL to use 'leave' (singular) instead of 'leaves' (plural)
      const response = await api.post("/leave/allocate/all");
      const data = response.data;
      if (data.success) {
        toast({ title: 'Success', description: 'All leaves allocated successfully for all employees.', variant: 'default' });
        setResults([]); // Optionally refresh results
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to allocate all leaves.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to allocate all leaves.', variant: 'destructive' });
    } finally {
      setManualAllLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'PL': return 'bg-blue-100 text-blue-800';
      case 'CL': return 'bg-green-100 text-green-800';
      case 'SL': return 'bg-orange-100 text-orange-800';
      case 'LWP': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <SidebarInset>
      {/* Modern HR Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Leave Allocation</h1>
          <p className="text-sm text-muted-foreground">Allocate, review, and manage leave balances for all employees</p>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        {/* 3. Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-900">{employees.length}</span>
              </div>
              <div className="text-xs text-blue-700 mt-1">Total Employees</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-green-900">{dashboardStats.totalAllocated}</span>
              </div>
              <div className="text-xs text-green-700 mt-1">Total Allocated</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-orange-600" />
                <span className="text-lg font-semibold text-orange-900">{dashboardStats.totalUsed}</span>
              </div>
              <div className="text-xs text-orange-700 mt-1">Total Used</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-purple-600" />
                <span className="text-lg font-semibold text-purple-900">{dashboardStats.totalCOFF}</span>
              </div>
              <div className="text-xs text-purple-700 mt-1">Total COFF</div>
            </CardContent>
          </Card>
        </div>
        {/* 4. Section Title and Description */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Leave Allocation</h2>
          <p className="text-muted-foreground mb-4">Allocate, review, and manage leave balances for all employees. Use the controls below to allocate leaves automatically or manually.</p>
        </div>
        {/* 5. Rules Card */}
        <Card className="shadow-md bg-white rounded-xl border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"> <Calendar className="h-5 w-5" /> Leave Allocation Rules </CardTitle>
            <CardDescription>Rules for each leave type and their allocation policies.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">PL (Paid Leave)</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Allocated when employee has 20+ present days</li>
                  <li>Maximum 12 PL per year</li>
                  <li>Valid for 3 years (carry forward)</li>
                  <li>Reserved for next year if 240+ working days</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">CL (Casual Leave)</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Fixed 6 CL per year</li>
                  <li>1 leave per month</li>
                  <li>Valid for 1 year</li>
                  <li>Lapses after 1 year</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-600">SL (Sick Leave)</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Fixed 6 SL per year</li>
                  <li>1 leave per month</li>
                  <li>Valid for 1 year</li>
                  <li>Lapses after 1 year</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-purple-600">COFF (Compensatory Off)</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Only for employees with "Weekly Off with C Off" type</li>
                  <li>1 COFF for each Sunday worked</li>
                  <li>Valid for 6 months</li>
                  <li>Lapses after 6 months</li>
                  <li>Based on Sunday attendance</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600">LWP (Leave Without Pay)</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Same rules as PL</li>
                  <li>Unpaid leave</li>
                  <li>Valid for 3 years</li>
                  <li>Carry forward allowed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 6. Controls Card */}
        <Card className="shadow-md bg-white rounded-xl border">
          <CardHeader>
            <CardTitle>Allocate Leaves</CardTitle>
            <CardDescription>Select year and employee, then allocate leaves as needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Employee</label>
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.map(emp => (
                      <SelectItem key={emp.empId} value={emp.empId}>
                        {emp.empId} - {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAllocateForEmployee}
                disabled={loading || !selectedEmployee}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Allocate for Selected Employee
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* 7. Current Leave Balance Card */}
        {selectedEmployee && (
          <Card className="shadow-md bg-white rounded-xl border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"> <Users className="h-5 w-5" /> Current Leave Balance for {employees.find(e => e.empId === selectedEmployee)?.firstName} {employees.find(e => e.empId === selectedEmployee)?.lastName} ({selectedEmployee}) </CardTitle>
              <CardDescription>Review and edit the current leave balance for the selected employee.</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading leave balance...</p>
                  </div>
                </div>
              ) : currentLeaveBalance ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['PL', 'CL', 'SL', 'LWP', 'COFF'].map(type => {
                      const leaveData = currentLeaveBalance[type];
                      return (
                        <div key={type} className="text-center p-3 border rounded-lg">
                          <Badge className={getLeaveTypeColor(type)}>
                            {type}
                          </Badge>
                          <div className="mt-2 space-y-1 text-sm">
                            <div>Allocated: {leaveData?.allocated || 0}</div>
                            <div>Used: {leaveData?.used || 0}</div>
                            <div>Balance: {leaveData?.balance || 0}</div>
                            {leaveData?.carriedForward && (
                              <div>Carried: {leaveData.carriedForward}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleEditBalance} className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Edit Balance
                    </Button>
                    <Button onClick={handleAllocateNew} variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Allocate New
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No leave balance found for this employee in {year}</p>
                  <Button onClick={handleAllocateNew} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Allocate New Leaves
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* 8. Results Table/Grid */}
        {results.length > 0 && (
          <Card className="shadow-md bg-white rounded-xl border">
            <CardHeader>
              <CardTitle>Allocation Results</CardTitle>
              <CardDescription>Summary of the most recent allocation operation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{result.employeeName}</h3>
                        <p className="text-sm text-muted-foreground">{result.empId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <Badge className={result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => {
                          setManualEmpId(result.empId);
                          setManualYear(year);
                          setManualLeaves({
                            PL: result.leaves.PL.allocated,
                            CL: result.leaves.CL.allocated,
                            SL: result.leaves.SL.allocated,
                            LWP: result.leaves.LWP.allocated,
                            COFF: (result.leaves as any).COFF ? (result.leaves as any).COFF.allocated : 0
                          });
                          setManualModalOpen(true);
                        }}>
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(result.leaves).map(([type, data]) => (
                        <div key={type} className="text-center">
                          <Badge className={getLeaveTypeColor(type)}>
                            {type}
                          </Badge>
                          <div className="mt-2 space-y-1 text-sm">
                            <div>Allocated: {data.allocated}</div>
                            <div>Balance: {data.balance}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!result.success && (
                      <p className="text-red-600 text-sm mt-2">{result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* 9. Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Allocating leaves...</p>
            </div>
          </div>
        )}
        {/* 10. Manual Modal */}
        {manualModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Manual Leave Allocation for {manualEmpId} ({manualYear})</h2>
              <div className="space-y-2">
                {['PL', 'CL', 'SL', 'LWP', 'COFF'].map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <label className="w-16">{type}</label>
                    <input
                      type="number"
                      min={0}
                      value={manualLeaves[type as keyof typeof manualLeaves]}
                      onChange={e => setManualLeaves({ ...manualLeaves, [type]: Number(e.target.value) })}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleManualAllocate}>Save</Button>
                <Button variant="outline" onClick={() => setManualModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  );
} 