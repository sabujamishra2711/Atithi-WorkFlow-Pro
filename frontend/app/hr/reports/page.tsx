"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { generateReport, exportAttendanceSheet, exportBankSheet } from "@/utils/reportUtils"
import {
  exportAttendanceSheetToPDF,
  exportSalarySheetToPDF,
  exportBankSheetToPDF,
  exportPayrollSummaryToPDF,
  exportPayrollToPDF,
  exportMonthlyAttendanceToPDF,
  exportContractorAttendanceToPDF,
  exportDailyAttendanceToPDF
} from "@/utils/pdfExport"
import {
  FileText,
  Download,
  FileSpreadsheet,
  File,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  Clock,
  Shield,
  Award,
  PieChart,
  Building,
  CalendarDays
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ExportType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  format: "PDF" | "Excel"
  category: "attendance" | "payroll" | "reports"
  features: string[]
  estimatedTime: string
}

const exportTypes: ExportType[] = [
  {
    id: "attendance-sheet-excel",
    name: "Attendance Sheet",
    description: "Detailed Excel sheet with daily attendance records for payroll processing",
    icon: <FileSpreadsheet className="h-6 w-6" />,
    color: "from-purple-500 to-purple-600",
    format: "Excel",
    category: "attendance",
    features: ["Daily records", "Payroll ready", "Leave tracking", "OT calculations"],
    estimatedTime: "2-3 seconds"
  },
  {
    id: "salary-sheet-excel",
    name: "Salary Sheet",
    description: "Comprehensive Excel salary sheet for accounting and bank processing",
    icon: <FileSpreadsheet className="h-6 w-6" />,
    color: "from-teal-500 to-teal-600",
    format: "Excel",
    category: "payroll",
    features: ["Bank ready", "Account details", "Net amounts", "Batch processing"],
    estimatedTime: "2-3 seconds"
  },
  {
    id: "bank-sheet-excel",
    name: "Bank Transfer Sheet",
    description: "Bank transfer sheet with employee account details for salary disbursement",
    icon: <Shield className="h-6 w-6" />,
    color: "from-indigo-500 to-indigo-600",
    format: "Excel",
    category: "payroll",
    features: ["Account numbers", "IFSC codes", "Transfer amounts", "Bank format"],
    estimatedTime: "2-3 seconds"
  },
  {
    id: "payroll-summary",
    name: "Payroll Summary",
    description: "Category-wise payroll summary for accounting purposes",
    icon: <PieChart className="h-6 w-6" />,
    color: "from-amber-500 to-amber-600",
    format: "Excel",
    category: "reports",
    features: ["Category breakdown", "Salary summary", "Accounting ready"],
    estimatedTime: "2-3 seconds"
  },
  {
    id: "payroll-pdf",
    name: "Payroll Report",
    description: "Complete payroll report with all employee salaries, deductions and net pay",
    icon: <File className="h-6 w-6" />,
    color: "from-rose-500 to-rose-600",
    format: "PDF",
    category: "payroll",
    features: ["Print ready", "All employees", "Salary details", "Deductions"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "attendance-sheet-pdf",
    name: "Attendance Sheet",
    description: "PDF attendance report with present/absent days, leaves and OT hours",
    icon: <File className="h-6 w-6" />,
    color: "from-violet-500 to-violet-600",
    format: "PDF",
    category: "attendance",
    features: ["Print ready", "Present/Absent", "Leave tracking", "OT hours"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "salary-sheet-pdf",
    name: "Salary Sheet",
    description: "Detailed salary breakdown with fixed, earned, deductions and net salary",
    icon: <File className="h-6 w-6" />,
    color: "from-emerald-500 to-emerald-600",
    format: "PDF",
    category: "payroll",
    features: ["Print ready", "Fixed salary", "Earned salary", "All deductions"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "bank-sheet-pdf",
    name: "Bank Transfer Sheet",
    description: "PDF bank transfer report with account details for approval",
    icon: <File className="h-6 w-6" />,
    color: "from-blue-500 to-blue-600",
    format: "PDF",
    category: "payroll",
    features: ["Print ready", "Bank details", "IFSC codes", "Net amounts"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "payroll-summary-pdf",
    name: "Payroll Summary",
    description: "Summary report with totals for gross, deductions, and net payable",
    icon: <File className="h-6 w-6" />,
    color: "from-orange-500 to-orange-600",
    format: "PDF",
    category: "reports",
    features: ["Print ready", "Total summary", "Breakdown", "Management review"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "monthly-attendance-pdf",
    name: "Monthly Attendance",
    description: "Monthly attendance summary for all employees with department breakdown",
    icon: <CalendarDays className="h-6 w-6" />,
    color: "from-cyan-500 to-cyan-600",
    format: "PDF",
    category: "attendance",
    features: ["Print ready", "Department wise", "Present/Absent", "Working days"],
    estimatedTime: "3-5 seconds"
  },
  {
    id: "contractor-attendance-pdf",
    name: "Contractor Attendance",
    description: "Contractor-wise attendance summary with employee counts",
    icon: <Building className="h-6 w-6" />,
    color: "from-pink-500 to-pink-600",
    format: "PDF",
    category: "attendance",
    features: ["Print ready", "Contractor wise", "Employee count", "Total days"],
    estimatedTime: "3-5 seconds"
  }
];

export default function ReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const categories = [
    { id: "all", name: "All Reports", icon: <FileText className="h-4 w-4" /> },
    { id: "attendance", name: "Attendance", icon: <Users className="h-4 w-4" /> },
    { id: "payroll", name: "Payroll", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "reports", name: "Analytics", icon: <BarChart3 className="h-4 w-4" /> }
  ];

  const handleExport = async (exportType: ExportType) => {
    setDownloading(exportType.id);
    setDownloadProgress(0);

    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const [year, monthNum] = month.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(monthNum) - 1];

      let result;

      if (exportType.format === "PDF") {
        const response = await fetch(`/api/v1/hr/payroll/fast?month=${month}`);
        const json = await response.json();
        const data = json.records || [];

        if (!data.length) {
          throw new Error('No data available for the selected month');
        }

        if (exportType.id === 'payroll-pdf') {
          result = await exportPayrollToPDF(data, monthName, year);
        } else if (exportType.id === 'attendance-sheet-pdf') {
          result = await exportAttendanceSheetToPDF(data, monthName, year);
        } else if (exportType.id === 'salary-sheet-pdf') {
          result = await exportSalarySheetToPDF(data, monthName, year);
        } else if (exportType.id === 'bank-sheet-pdf') {
          result = await exportBankSheetToPDF(data, monthName, year);
        } else if (exportType.id === 'payroll-summary-pdf') {
          result = await exportPayrollSummaryToPDF(data, monthName, year);
        } else if (exportType.id === 'monthly-attendance-pdf') {
          const formattedData = data.map((emp: Record<string, unknown>) => ({
            empId: emp.empId,
            name: emp.name,
            department: emp.department || 'General',
            presentDays: emp.presentDays,
            absentDays: emp.absentDays,
            leaveDays: ((emp.leaveBreakdown as Record<string, number>)?.PL || 0) + ((emp.leaveBreakdown as Record<string, number>)?.LWP || 0),
            otHours: emp.otHours,
            workingDays: ((emp.presentDays as number) || 0) + ((emp.absentDays as number) || 0)
          }));
          result = await exportMonthlyAttendanceToPDF(formattedData, `${monthName} ${year}`);
        } else if (exportType.id === 'contractor-attendance-pdf') {
          const contractorMap = new Map<string, {
            contractorName: string;
            totalEmployees: number;
            totalPresentDays: number;
            totalAbsentDays: number;
            totalLeaveDays: number;
            totalDays: number;
            totalOtHours: number;
          }>();
          
          data.forEach((emp: Record<string, unknown>) => {
            const contractor = (emp.contractorName as string) || 'Direct Employee';
            if (!contractorMap.has(contractor)) {
              contractorMap.set(contractor, {
                contractorName: contractor,
                totalEmployees: 0,
                totalPresentDays: 0,
                totalAbsentDays: 0,
                totalLeaveDays: 0,
                totalDays: 0,
                totalOtHours: 0
              });
            }
            const entry = contractorMap.get(contractor)!;
            entry.totalEmployees += 1;
            entry.totalPresentDays += (emp.presentDays as number) || 0;
            entry.totalAbsentDays += (emp.absentDays as number) || 0;
            entry.totalLeaveDays += ((emp.leaveBreakdown as Record<string, number>)?.PL || 0) + ((emp.leaveBreakdown as Record<string, number>)?.LWP || 0);
            entry.totalDays += ((emp.presentDays as number) || 0) + ((emp.absentDays as number) || 0);
            entry.totalOtHours += (emp.otHours as number) || 0;
          });

          result = await exportContractorAttendanceToPDF(Array.from(contractorMap.values()), `${monthName} ${year}`);
        } else {
          throw new Error('Unknown PDF export type');
        }
      } else if (exportType.id === "attendance-sheet-excel") {
        result = await exportAttendanceSheet(month);
      } else if (exportType.id === "bank-sheet-excel") {
        result = await exportBankSheet(month);
      } else {
        const filters = { month };
        result = await generateReport(exportType.id, filters);
      }

      if (result?.success) {
        setDownloadProgress(100);
        toast.success(result.message || `${exportType.name} exported successfully!`);
      } else {
        throw new Error(result?.error || 'Report generation failed');
      }
    } catch (error: unknown) {
      console.error("Export error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to export report. Please try again.";
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setDownloading(null);
        setDownloadProgress(0);
      }, 1000);
    }
  };

  const excelReports = exportTypes.filter(e => e.format === "Excel");
  const pdfReports = exportTypes.filter(e => e.format === "PDF");

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold tracking-tight">Export Center</h1>
      </header>

      <div className="flex-1 p-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reports & Exports</h2>
            <p className="text-muted-foreground">Download payroll, attendance and summary reports in Excel or PDF format.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Excel Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {excelReports.map((exportType) => (
              <Card
                key={exportType.id}
                className="group hover:shadow-lg transition-all duration-300 border shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${exportType.color} text-white shadow`}>
                      {exportType.icon}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Excel
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold mt-2">
                    {exportType.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {exportType.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {downloading === exportType.id && (
                    <div className="space-y-1">
                      <Progress value={downloadProgress} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    onClick={() => handleExport(exportType)}
                    disabled={downloading === exportType.id}
                    size="sm"
                    className={`w-full bg-gradient-to-r ${exportType.color} hover:opacity-90 text-white border-0`}
                  >
                    {downloading === exportType.id ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <File className="h-5 w-5 text-red-600" />
            PDF Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pdfReports.map((exportType) => (
              <Card
                key={exportType.id}
                className="group hover:shadow-lg transition-all duration-300 border shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${exportType.color} text-white shadow`}>
                      {exportType.icon}
                    </div>
                    <Badge variant="default" className="text-xs bg-red-500">
                      PDF
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold mt-2">
                    {exportType.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {exportType.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {downloading === exportType.id && (
                    <div className="space-y-1">
                      <Progress value={downloadProgress} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    onClick={() => handleExport(exportType)}
                    disabled={downloading === exportType.id}
                    size="sm"
                    className={`w-full bg-gradient-to-r ${exportType.color} hover:opacity-90 text-white border-0`}
                  >
                    {downloading === exportType.id ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-900">{exportTypes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Excel Reports</p>
                  <p className="text-2xl font-bold text-green-900">{excelReports.length}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">PDF Reports</p>
                  <p className="text-2xl font-bold text-red-900">{pdfReports.length}</p>
                </div>
                <File className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Categories</p>
                  <p className="text-2xl font-bold text-orange-900">{categories.length - 1}</p>
                </div>
                <Award className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  )
}
