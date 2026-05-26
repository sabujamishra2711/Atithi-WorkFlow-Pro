"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertCircle,
} from "lucide-react"
import axios from 'axios'; // Import axios directly
import { Input } from "@/components/ui/input"
import { EnhancedExportButton } from "@/components/ui/EnhancedExportButton"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

// Create a direct axios instance with the base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ?
      `${window.location.origin}/api/v1` :
      'http://localhost:8000/api/v1'),
  withCredentials: true,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== "undefined") {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

interface ContractorMonthlyAttendance {
  contractorEmployeeId: string
  employeeName: string
  contractorId: string
  contractorName: string
  presentDays: number
  absentDays: number
  leaveDays: number
  totalDays: number
  otHours: number
  status: string
}

// Grouped contractor data type
interface GroupedContractorData {
  contractorId: string
  contractorName: string
  totalEmployees: number
  totalPresentDays: number
  totalAbsentDays: number
  totalLeaveDays: number
  totalDays: number
  totalOtHours: number
}

export default function ContractorMonthlyAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  })
  const [selectedContractor, setSelectedContractor] = useState("All")
  const [attendanceData, setAttendanceData] = useState<ContractorMonthlyAttendance[]>([])
  const [groupedData, setGroupedData] = useState<GroupedContractorData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Fetch contractors
  useEffect(() => {
    async function fetchContractors() {
      try {
        const res = await api.get("/contractors"); // Using direct axios instance
        // Handle different response formats
        let contractorsData: any[] = [];
        if (Array.isArray(res.data)) {
          contractorsData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          contractorsData = res.data.data;
        } else if (res.data && res.data.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
          // Handle case where data is an object with ApiResponse structure
          contractorsData = Array.isArray(res.data.data) ? res.data.data : [];
        }

        const contractorList = Array.isArray(contractorsData)
          ? contractorsData.map((c: any) => ({ id: c._id, name: c.name }))
          : [];
        setContractors([{ id: "All", name: "All Contractors" }, ...contractorList]);
      } catch (err) {
        console.error("Error fetching contractors", err);
        toast.error("Failed to load contractors");
        setContractors([{ id: "All", name: "All Contractors" }]);
      }
    }

    fetchContractors();
  }, []);

  // Fetch monthly attendance data
  useEffect(() => {
    async function fetchMonthlyAttendance() {
      setLoading(true);
      try {
        // First, get all contractors
        const contractorsRes = await api.get("/contractors"); // Using direct axios instance
        const contractorsData = Array.isArray(contractorsRes.data) ? contractorsRes.data :
          (contractorsRes.data?.data && Array.isArray(contractorsRes.data.data)) ? contractorsRes.data.data : [];

        // Then get all contractor employees
        const allEmployees = [];
        for (const contractor of contractorsData) {
          try {
            const employeesRes = await api.get("/punch/contractor/employees", { // Using direct axios instance
              params: {
                contractorId: contractor._id
              }
            });

            const employeesData = Array.isArray(employeesRes.data) ? employeesRes.data :
              (employeesRes.data?.data && Array.isArray(employeesRes.data.data)) ? employeesRes.data.data : [];

            allEmployees.push(...employeesData);
          } catch (err) {
            console.error(`Error fetching employees for contractor ${contractor._id}:`, err);
          }
        }

        // Now get the session data for the selected month
        // Make sure we're sending the month in the correct format
        const res = await api.get(`/punch/contractor/detailed?month=${selectedMonth}`); // Using direct axios instance

        // Log the raw response for debugging
        console.log("Raw API response:", res.data);

        // Process the session data - the API returns grouped data when no specific employee is requested
        let sessionsData: any[] = [];
        if (res.data && res.data.data) {
          // Check if data is grouped (object with employee IDs as keys)
          if (typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
            // Flatten the grouped data
            Object.values(res.data.data).forEach((sessions: any) => {
              if (Array.isArray(sessions)) {
                sessionsData = sessionsData.concat(sessions);
              }
            });
          } else if (Array.isArray(res.data.data)) {
            // Data is already an array
            sessionsData = res.data.data;
          }
        } else if (Array.isArray(res.data)) {
          sessionsData = res.data;
        }

        // Log the processed sessions data for debugging
        console.log("Processed sessions data:", sessionsData);

        // Get the number of days in the selected month
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        // Create a map of sessions by contractorEmployeeId for easier lookup
        const sessionsMap: { [key: string]: any[] } = {};
        sessionsData.forEach((session: any) => {
          // Ensure we have a contractorEmployeeId
          const empId = session.contractorEmployeeId || session.employeeId;
          if (empId) {
            if (!sessionsMap[empId]) {
              sessionsMap[empId] = [];
            }
            sessionsMap[empId].push(session);
          }
        });

        // Process each employee to calculate their monthly attendance
        const attendanceData: ContractorMonthlyAttendance[] = allEmployees.map((employee: any) => {
          // Use the correct employee ID field
          const employeeId = employee.contractorEmployeeId || employee.employeeId;
          const employeeSessions = sessionsMap[employeeId] || [];

          // Log sessions for this employee
          console.log(`Employee ${employeeId} sessions:`, employeeSessions);

          // Initialize with default values
          const attendance: ContractorMonthlyAttendance = {
            contractorEmployeeId: employeeId,
            employeeName: employee.employeeName || employee.name,
            contractorId: employee.contractorId || employee.contractor_id,
            contractorName: employee.contractorName || employee.contractor_name,
            presentDays: 0,
            absentDays: daysInMonth, // Initially assume all days are absent
            leaveDays: 0,
            totalDays: daysInMonth,
            otHours: 0,
            status: 'Absent'
          };

          // Process each session for this employee
          employeeSessions.forEach((session: any) => {
            // Log each session being processed
            console.log("Processing session:", session);

            // Check different possible status fields
            const status = session.status || session.punchStatus || 'Absent';

            // Any session with an inTime represents a present day
            // This includes both CLOSED sessions (complete days) and OPEN sessions (incomplete days)
            if (session.inTime) {
              attendance.presentDays += 1;

              // Update status based on session completeness
              // We prioritize the most significant status:
              // Present (complete session) > In Only (incomplete session) > current status
              if (status === 'CLOSED' && session.outTime) {
                // This is a complete session
                // Only update status if it's not already 'Present' (to maintain the most significant status)
                if (attendance.status !== 'Present') {
                  attendance.status = 'Present';
                }

                // Calculate OT hours if available
                const inTime = new Date(session.inTime);
                const outTime = new Date(session.outTime);
                const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
                // Assuming 8 hours is a standard work day, anything above is OT
                const otHours = Math.max(0, hours - 8);
                attendance.otHours += otHours;

                console.log(`Added present day for complete session. Present days now: ${attendance.presentDays}`);
              } else if (status === 'OPEN' || !session.outTime) {
                // This is an incomplete session (IN only)
                // Only update status if it's currently 'Absent' (to maintain the most significant status)
                if (attendance.status === 'Absent') {
                  attendance.status = 'In Only';
                }
                console.log(`Added present day (IN only) for incomplete session. Present days now: ${attendance.presentDays}`);
              }
            }
            // Check if this session represents a leave day (has a reason indicating leave)
            else if (session.reason &&
              (session.reason.toLowerCase().includes('leave') ||
                session.reason.toLowerCase().includes('holiday') ||
                session.reason.toLowerCase().includes('off'))) {
              attendance.leaveDays += 1;
              // Only update status if it's currently 'Absent' (to maintain the most significant status)
              if (attendance.status === 'Absent') {
                attendance.status = 'Leave';
              }
              console.log(`Added leave day. Leave days now: ${attendance.leaveDays}`);
            }
          });

          // Recalculate absent days - absent days are days with no sessions at all
          // We calculate absent days as total possible days minus present and leave days
          attendance.absentDays = Math.max(0, attendance.totalDays - attendance.presentDays - attendance.leaveDays);

          console.log(`Final attendance for ${employeeId}:`, attendance);

          return attendance;
        });

        setAttendanceData(attendanceData);
      } catch (err: any) {
        console.error("Error fetching monthly attendance data", err);
        toast.error("Failed to load monthly attendance data: " + (err.message || "Unknown error"));
        setAttendanceData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthlyAttendance();
  }, [selectedMonth]);

  // Group data by contractor
  useEffect(() => {
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
      setGroupedData([]);
      return;
    }

    // Group by contractor
    const grouped: { [key: string]: GroupedContractorData } = {};

    attendanceData.forEach(employee => {
      const contractorId = employee.contractorId;

      if (!grouped[contractorId]) {
        grouped[contractorId] = {
          contractorId: employee.contractorId,
          contractorName: employee.contractorName, // Fix: Use contractorName instead of employeeName
          totalEmployees: 0,
          totalPresentDays: 0,
          totalAbsentDays: 0,
          totalLeaveDays: 0,
          totalDays: 0,
          totalOtHours: 0
        };
      }

      // Increment employee count
      grouped[contractorId].totalEmployees += 1;

      // Add stats
      grouped[contractorId].totalPresentDays += employee.presentDays;
      grouped[contractorId].totalAbsentDays += employee.absentDays;
      grouped[contractorId].totalLeaveDays += employee.leaveDays;
      grouped[contractorId].totalDays += employee.totalDays;
      grouped[contractorId].totalOtHours += employee.otHours;
    });

    // Fix: Set the total days to the actual number of days in the month multiplied by number of employees
    // This ensures we have consistent total days across all contractors
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    Object.values(grouped).forEach(contractor => {
      contractor.totalDays = contractor.totalEmployees * daysInMonth;
    });

    // Convert to array
    setGroupedData(Object.values(grouped));
  }, [attendanceData, selectedMonth]);

  // Filtered and searched data (for grouped data)
  const filteredData = useMemo(() => {
    return groupedData.filter(record => {
      const matchesSearch = !searchTerm ||
        record.contractorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesContractor = selectedContractor === "All" ||
        record.contractorId === selectedContractor;

      return matchesSearch && matchesContractor;
    });
  }, [groupedData, searchTerm, selectedContractor]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredData.length;
    const totalEmployees = filteredData.reduce((sum, record) => sum + record.totalEmployees, 0);
    const totalPresentDays = filteredData.reduce((sum, record) => sum + record.totalPresentDays, 0);
    const totalAbsentDays = filteredData.reduce((sum, record) => sum + record.totalAbsentDays, 0);
    const totalLeaveDays = filteredData.reduce((sum, record) => sum + record.totalLeaveDays, 0);

    const totalOtHours = filteredData.reduce((sum, record) => sum + (record.totalOtHours || 0), 0);
    const avgOtHours = total > 0 ? (totalOtHours / total).toFixed(1) : "0.0";

    return {
      total,
      totalEmployees,
      totalPresentDays,
      totalAbsentDays,
      totalLeaveDays,
      otHours: totalOtHours.toFixed(1),
      avgOtHours
    };
  }, [filteredData]);

  // Helper function to convert image URL to base64
  const convertImageToBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        // If it's already base64, return it
        if (url.startsWith('data:')) {
          resolve(url);
          return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = 40;
            canvas.height = 40;

            if (ctx) {
              ctx.drawImage(img, 0, 0, 40, 40);
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              resolve(base64);
            } else {
              resolve(null);
            }
          } catch (canvasError) {
            resolve(null);
          }
        };

        img.onerror = () => {
          resolve(null);
        };

        setTimeout(() => {
          resolve(null);
        }, 10000);

        img.src = url;
      } catch (error) {
        resolve(null);
      }
    });
  };

  // PDF export function
  const exportTableToPDF = async (): Promise<void> => {
    try {
      if (filteredData.length === 0) {
        toast.error("No records to export");
        return;
      }

      const { exportContractorAttendanceToPDF } = await import('@/utils/pdfExport');
      await exportContractorAttendanceToPDF(filteredData, selectedMonth);
      toast.success("PDF exported successfully!");

    } catch (error) {
      console.error('💥 PDF export error:', error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Contractor Monthly Attendance</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Monthly Reports</h2>
            <p className="text-muted-foreground">View and export contractor monthly attendance reports</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <EnhancedExportButton
              onExport={exportTableToPDF}
              disabled={loading || filteredData.length === 0}
              estimatedTime="2-3 seconds"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg"
            >
              Export PDF
            </EnhancedExportButton>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Present Days</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPresentDays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Absent Days</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAbsentDays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaveDays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total OT Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.otHours}</div>
              <p className="text-xs text-muted-foreground">Avg: {stats.avgOtHours} hrs/contractor</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="search"
                      placeholder="Search by contractor name..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contractor">Contractor</Label>
                  <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id}>
                          {contractor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Input
                    id="month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Attendance Records</CardTitle>
            <CardDescription>
              Showing contractor attendance for {selectedMonth}
              {filteredData.length > 0 && ` (${filteredData.length} contractors)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="text-center">Total Employees</TableHead>
                      <TableHead className="text-center">Total Present Days</TableHead>
                      <TableHead className="text-center">Total Absent Days</TableHead>
                      <TableHead className="text-center">Total Leave Days</TableHead>
                      <TableHead className="text-center">Total Days</TableHead>
                      <TableHead className="text-center">Total OT Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.contractorId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <span>{record.contractorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{record.totalEmployees}</TableCell>
                        <TableCell className="text-center">{record.totalPresentDays}</TableCell>
                        <TableCell className="text-center">{record.totalAbsentDays}</TableCell>
                        <TableCell className="text-center">{record.totalLeaveDays}</TableCell>
                        <TableCell className="text-center">{record.totalDays}</TableCell>
                        <TableCell className="text-center">{record.totalOtHours?.toFixed(1) || '0.0'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}