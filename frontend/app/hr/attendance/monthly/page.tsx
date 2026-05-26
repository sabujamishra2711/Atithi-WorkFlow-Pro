"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, Line, LineChart, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
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
import api from '@/lib/apiClient';
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { exportMonthlyAttendanceToPDF } from "@/utils/pdfExport"

import PDFHeader from "@/components/pdf-header";

// Add CSS styles to prevent page breaks inside table rows
const styles = `
  @media print {
    .no-break-table tr,
    .no-break-table tr.no-break-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: table-row !important;
      /* Additional properties for maximum compatibility */
      page-break-after: auto !important;
      -webkit-column-break-inside: avoid !important;
      -moz-column-break-inside: avoid !important;
    }
    
    .no-break-table td,
    .no-break-table th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      /* Additional properties for maximum compatibility */
      -webkit-column-break-inside: avoid !important;
      -moz-column-break-inside: avoid !important;
    }
    
    .no-break-table,
    .no-break-table tbody,
    .no-break-table thead,
    .no-break-table tfoot {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      /* Additional properties for maximum compatibility */
      -webkit-column-break-inside: avoid !important;
      -moz-column-break-inside: avoid !important;
    }
    
    .no-break-table {
      page-break-after: auto !important;
    }
    
    .no-break-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: table-row !important;
      /* Additional properties for maximum compatibility */
      page-break-after: auto !important;
      -webkit-column-break-inside: avoid !important;
      -moz-column-break-inside: avoid !important;
    }
  }
  
  /* Also apply styles when exporting to PDF */
  .pdf-export .no-break-table tr,
  .pdf-export .no-break-table tr.no-break-row {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: table-row !important;
    /* Additional properties for maximum compatibility */
    page-break-after: auto !important;
    -webkit-column-break-inside: avoid !important;
    -moz-column-break-inside: avoid !important;
  }
  
  .pdf-export .no-break-table td,
  .pdf-export .no-break-table th {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    /* Additional properties for maximum compatibility */
    -webkit-column-break-inside: avoid !important;
    -moz-column-break-inside: avoid !important;
  }
  
  .pdf-export .no-break-table,
  .pdf-export .no-break-table tbody,
  .pdf-export .no-break-table thead,
  .pdf-export .no-break-table tfoot {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    /* Additional properties for maximum compatibility */
    -webkit-column-break-inside: avoid !important;
    -moz-column-break-inside: avoid !important;
  }
  
  .pdf-export .no-break-table {
    page-break-after: auto !important;
  }
  
  .pdf-export .no-break-row {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: table-row !important;
    /* Additional properties for maximum compatibility */
    page-break-after: auto !important;
    -webkit-column-break-inside: avoid !important;
    -moz-column-break-inside: avoid !important;
  }
  
  /* Additional styles for better compatibility */
  .no-break-table,
  .pdf-export .no-break-table {
    overflow: hidden !important;
    /* Ensure table stays together */
    widows: 0 !important;
    orphans: 0 !important;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}

const chartConfig = {
  present: {
    label: "Present",
    color: "#22c55e",
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
  },
} satisfies ChartConfig

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

// Add these helper functions at the top (after imports)
function injectPdfExportVisibilityStyles() {
  const style = document.createElement('style');
  style.id = 'pdf-export-visibility-style';
  style.innerHTML = `
    .pdf-export .pdf-export-only { display: inline !important; }
    .pdf-export .web-only { display: none !important; }
  `;
  document.head.appendChild(style);
}

function removePdfExportVisibilityStyles() {
  const style = document.getElementById('pdf-export-visibility-style');
  if (style) style.remove();
}


export default function MonthlyAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState("June 2024")
  const [selectedDepartment, setSelectedDepartment] = useState("All")
  const [summary, setSummary] = useState<any>(null)
  const [trend, setTrend] = useState<any[]>([])
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<{ month: string; label: string }[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [attendanceFilter, setAttendanceFilter] = useState("All") // New state for attendance filter
  const [exportLoading, setExportLoading] = useState(false) // Add this state for export button loading

  // On mount, fetch available months and departments
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [monthsRes, employeesRes] = await Promise.all([
          api.get('/punch/monthly/months'),
          api.get('/employees/getAllEmployees')
        ])

        setMonths(monthsRes.data.months || [])
        if (monthsRes.data.months && monthsRes.data.months.length > 0) {
          setSelectedMonth(monthsRes.data.months[0].label)
        }

        // Extract unique departments from employees
        const employees = employeesRes.data.employees || []
        const uniqueDepartments = Array.from(new Set(
          employees.map((emp: any) => emp.department).filter((dept: any): dept is string => Boolean(dept))
        )) as string[]
        setDepartments(uniqueDepartments)
      } catch (err) {
        setMonths([])
        setDepartments([])
      }
    }
    fetchInitialData()
  }, [])

  // Convert UI month to YYYY-MM
  const getMonthParam = (monthLabel: string) => {
    const found = months.find(m => m.label === monthLabel)
    return found ? found.month : ""
  }

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      const monthParam = getMonthParam(selectedMonth)
      if (!monthParam) {
        setError("Please select a valid month.")
        setLoading(false)
        return
      }

      console.log('Fetching data for month:', monthParam, 'department:', selectedDepartment)

      try {
        const [summaryRes, trendRes, empRes] = await Promise.all([
          api.get(`/punch/monthly/summary?month=${monthParam}&department=${selectedDepartment}`),
          api.get(`/punch/monthly/trend`),
          api.get(`/punch/monthly/employees?month=${monthParam}&department=${selectedDepartment}`),
        ])

        console.log('Summary data:', summaryRes.data)
        console.log('Trend data:', trendRes.data)
        console.log('Employee data:', empRes.data)

        // Debug: Log individual employee data
        if (empRes.data.employees) {
          empRes.data.employees.forEach((emp: any) => {
            console.log(`Employee ${emp.empId}: present=${emp.present}, absent=${emp.absent}, rate=${emp.attendanceRate}%, workingDays=${emp.totalDays}`)
          })
        }

        setSummary(summaryRes.data)
        setTrend(trendRes.data.trend || [])
        setEmployeeAttendance(empRes.data.employees || [])
      } catch (err: any) {
        console.error('Error fetching monthly data:', err)
        setError(err?.response?.data?.error || "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [selectedMonth, selectedDepartment])

  const exportTableToPDF = async (): Promise<void> => {
    setExportLoading(true);
    try {
      const data = filteredEmployees.map(emp => ({
        empId: emp.empId,
        name: emp.name,
        department: emp.department,
        presentDays: emp.present,
        absentDays: emp.absent,
        leaveDays: emp.leave,
        otHours: emp.otHours,
        workingDays: emp.workingDays
      }));
      await exportMonthlyAttendanceToPDF(data, selectedMonth);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // New function to download images in a grid format (4 per row)
  const downloadImagesGrid = async (): Promise<void> => {
    // Note: Monthly attendance doesn't typically have individual punch images
    // This is a placeholder for consistency with other pages
    console.log("Monthly attendance report doesn't include individual punch images. This feature is available for daily attendance reports.");
  };

  // Filter employees based on search and attendance filter
  const filteredEmployees = employeeAttendance.filter(employee => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.empId.toLowerCase().includes(searchLower) ||
      employee.department.toLowerCase().includes(searchLower)
    )

    // Apply attendance filter
    let matchesAttendance = true
    if (attendanceFilter === "Present") {
      matchesAttendance = parseFloat(employee.attendanceRate) >= 90
    } else if (attendanceFilter === "Good") {
      const rate = parseFloat(employee.attendanceRate)
      matchesAttendance = rate >= 80 && rate < 90
    } else if (attendanceFilter === "Poor") {
      matchesAttendance = parseFloat(employee.attendanceRate) < 80
    } else if (attendanceFilter === "Partial") {
      matchesAttendance = employee.partial > 0 // Show employees with partial attendance
    }

    return matchesSearch && matchesAttendance
  })

  // Calculate additional statistics based on actual data from backend
  const totalEmployees = summary?.totalEmployees || employeeAttendance.length;
  const onTimeCount = summary?.onTime || 0;
  const onLeaveCount = summary?.onLeave || 0;
  const absentCount = summary?.totalAbsences || 0;
  const partialCount = summary?.partial || 0;
  const averageAttendance = summary?.avgAttendance || 0;

  // Fix: Use the corrected percentages from the backend response instead of calculating them locally
  // This prevents percentages from exceeding 100% 
  const presentPercentage = summary?.presentPercentage || 0;
  const absentPercentage = summary?.absentPercentage || 0;
  const leavePercentage = summary?.leavePercentage || 0;

  // Prepare pie chart data using the actual attendance data from backend
  const pieData = [
    { name: 'Present', value: onTimeCount, color: '#22c55e' },
    { name: 'Absent', value: absentCount, color: '#ef4444' },
    { name: 'On Leave', value: onLeaveCount, color: '#f59e0b' },
    { name: 'Partial', value: partialCount, color: '#3b82f6' }
  ];

  return (
    <SidebarInset>
      {/* Modern Header */}
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Monthly Attendance Analytics</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading monthly attendance data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Monthly Attendance Overview</h2>
                <p className="text-muted-foreground">
                  Comprehensive analytics and insights for {selectedMonth}
                  {loading && (
                    <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      Updating...
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Select value={selectedMonth} onValueChange={(value) => {
                  console.log('Month changed from', selectedMonth, 'to', value)
                  setSelectedMonth(value)
                }}>
                  <SelectTrigger className={`w-48 ${loading ? 'opacity-50' : ''}`}>
                    <SelectValue />
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>}
                  </SelectTrigger>
                  <SelectContent>
                    {months.length === 0 ? (
                      <SelectItem value="none" disabled>No months available</SelectItem>
                    ) : (
                      months.map(m => (
                        <SelectItem key={m.month} value={m.label}>{m.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={exportTableToPDF}
                  disabled={exportLoading} // Disable button during export
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg"
                >
                  {exportLoading ? ( // Show loader when export is in progress
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <Card className="border-2 border-dashed border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Options
                  </CardTitle>
                  <CardDescription>Refine your monthly attendance view</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Department</label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Departments</SelectItem>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Attendance Status</label>
                      <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Employees</SelectItem>
                          <SelectItem value="Present">Excellent (≥90%)</SelectItem>
                          <SelectItem value="Good">Good (80-89%)</SelectItem>
                          <SelectItem value="Poor">Poor (&lt;80%)</SelectItem>
                          <SelectItem value="Partial">Partial (IN or OUT only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search Employees</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, ID, or department..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Employees</p>
                      <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Present</p>
                      <p className="text-2xl font-bold text-green-900">{onTimeCount} <span className="text-lg">({presentPercentage}%)</span></p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">On Leave</p>
                      <p className="text-2xl font-bold text-yellow-900">{onLeaveCount} <span className="text-lg">({leavePercentage}%)</span></p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">Absent</p>
                      <p className="text-2xl font-bold text-red-900">{absentCount} <span className="text-lg">({absentPercentage}%)</span></p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Partial</p>
                      <p className="text-2xl font-bold text-orange-900">{partialCount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Breakdown Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Attendance Breakdown
                </CardTitle>
                <CardDescription>Summary of employee attendance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Present</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{onTimeCount}</div>
                    <div className="text-sm text-green-700">{presentPercentage}% of total employees</div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Absent</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">{absentCount}</div>
                    <div className="text-sm text-red-700">{absentPercentage}% of total employees</div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">On Leave</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">{onLeaveCount}</div>
                    <div className="text-sm text-yellow-700">{leavePercentage}% of total employees</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-800">Attendance Rate:</span>
                      <div className="text-2xl font-bold text-blue-900">{averageAttendance}%</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    6-Month Attendance Trend
                  </CardTitle>
                  <CardDescription>Monthly attendance patterns over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={trend}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="present" fill="var(--color-present)" />
                      <Bar dataKey="absent" fill="var(--color-absent)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Attendance Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Attendance Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of employee attendance performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Attendance Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Employee Attendance Summary
                    </CardTitle>
                    <CardDescription>
                      Individual attendance records for {selectedMonth} • Showing {filteredEmployees.length} of {employeeAttendance.length} employees
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedDepartment === "All" ? "All Departments" : selectedDepartment}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No employees found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
                  </div>
                ) : (
                  <div id="monthly-attendance-table" className="rounded-md border overflow-hidden">
                    {/* PDF Header - Only visible in PDF exports */}
                    <div className="pdf-export-only hidden">
                      <PDFHeader
                        title="Monthly Attendance Report"
                        subtitle={`${selectedMonth} - ${selectedDepartment === "All" ? "All Departments" : selectedDepartment}`}
                      />
                    </div>
                    <Table className="no-break-table">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Employee</div></TableHead>
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Department</div></TableHead>
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Present Days</div></TableHead>
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Absent Days</div></TableHead>
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Attendance Rate</div></TableHead>
                          <TableHead className="font-semibold text-center"><div className="flex justify-center items-center w-full">Performance</div></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                          <TableRow key={employee.empId} className="hover:bg-muted/30 no-break-row">
                            <TableCell>
                              <div className="flex justify-start items-center h-full w-full gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="" alt={employee.name} />
                                  <AvatarFallback className="text-xs">
                                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-muted-foreground">{employee.empId}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center justify-center w-full h-full">
                                <span className="text-sm text-muted-foreground">{employee.department}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="flex justify-center items-center h-full w-full">
                                <span className="text-green-600 font-semibold">{employee.present}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="flex justify-center items-center h-full w-full">
                                <span className="text-red-600 font-semibold">{employee.absent}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center justify-center w-full h-full">
                                <span className="font-mono text-sm text-muted-foreground">{employee.attendanceRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center items-center h-full w-full">
                                <div className="flex items-center gap-2">
                                  {employee.trend === "up" ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {employee.trend === "up" ? "Improving" : "Declining"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SidebarInset>
  )
}
