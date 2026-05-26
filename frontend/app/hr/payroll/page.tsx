"use client";
import { useState, useEffect, useMemo } from "react";
import api from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Download,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  UserCheck,
  UserX,
  Filter,
  X,
  Loader2,
  Info,
  User,
  ChevronDown,
  Eye
} from "lucide-react";
import { exportPayrollToPDF } from "@/utils/pdfExport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];



interface Payroll {
  empId: string;
  name: string;
  workerType: string;
  presentDays: number;
  absentDays: number;
  otHours: number;
  otSalary: number;
  cOffEarned: number;
  phPaid: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  plEligible: boolean;
  department?: string;
  leaveBreakdown?: { PL?: number; LWP?: number; COFF?: number; OTHER?: number };
  error?: string; // Added for error records
  phOtDays?: number; // Added for PH OT
  phNoPay?: number; // Added for PH Not Paid
  // Simplified payroll fields
  calculationType?: string; // 'FULL_SALARY' or 'PROPORTIONAL'
  standardWorkingDays?: number;
  fixedSalary?: number;
  // Individual deductions
  deductions?: Array<{
    name: string;
    amount: number;
    type: string;
    description?: string;
  }>;
}

export default function PayrollPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingPayslip, setDownloadingPayslip] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedWorkerType, setSelectedWorkerType] = useState<string>("All");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [salaryRange, setSalaryRange] = useState<{ min: string; max: string }>({ min: "", max: "" });

  // Employee selection states (new)
  const [selectedEmployee, setSelectedEmployee] = useState<Payroll | null>(null);
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");

  useEffect(() => {
    async function fetchPayroll() {
      setPayroll([]); // 🔥 CRITICAL: prevents stale carryover
      setLoading(true);
      setError("");
      try {
        const monthParam = getMonthParam(year, month);
        const res = await api.get(
          `/hr/payroll/fast?month=${encodeURIComponent(monthParam)}&year=${encodeURIComponent(String(year))}`
        );

        // EXACT LOGGING AS REQUESTED IN STEP 1
        console.log(
          '🔥 PAYROLL DEBUG — FIRST RECORD 🔥',
          JSON.stringify(
            Array.isArray(res?.data)
              ? res.data[0]
              : res?.data?.records?.[0],
            null,
            2
          )
        );

        const body = res?.data;
        // Helpful debug log (remove in production)
        if (!body) console.info("Payroll response empty:", res);

        let payrollData: any[] = [];

        // Many possible shapes — try them in a safe order
        if (Array.isArray(body)) {
          // API returned an array directly
          payrollData = body;
        } else if (Array.isArray(body.records)) {
          payrollData = body.records;
        } else if (Array.isArray(body.data)) {
          payrollData = body.data;
        } else if (Array.isArray(body.data?.records)) {
          payrollData = body.data.records;
        } else if (Array.isArray(body.payroll)) {
          payrollData = body.payroll;
        } else if (Array.isArray(body.rows)) {
          payrollData = body.rows;
        } else if (body && typeof body.records === "object" && !Array.isArray(body.records)) {
          // object map keyed by empId -> convert to array
          payrollData = Object.values(body.records);
        } else if (body && typeof body === "object" && Object.keys(body).length) {
          // Last resort: try to infer an array in nested places
          const maybeArray = Object.values(body).find(v => Array.isArray(v));
          payrollData = Array.isArray(maybeArray) ? maybeArray : [];
        } else {
          payrollData = [];
        }

        // Normalize data with safe nullish coalescing and apply frontend invariant
        payrollData = payrollData.map(raw => {
          const emp = {
            ...raw,
            presentDays: Number(raw.presentDays ?? 0),
            absentDays: Number(raw.absentDays ?? 0),
            otHours: Number(raw.otHours ?? 0),
            otSalary: Number(raw.otSalary ?? 0),
            cOffEarned: Number(raw.cOffEarned ?? 0),
            phPaid: Number(raw.phPaid ?? 0),
            grossSalary: Number(raw.grossSalary ?? 0),
            totalDeduction: Number(raw.totalDeduction ?? 0),
            netSalary: Number(raw.netSalary ?? 0),
            phOtDays: Number(raw.phOtDays ?? 0),
            phNoPay: Number(raw.phNoPay ?? 0),
            fixedSalary: Number(raw.fixedSalary ?? 0),
            leaveBreakdown: raw.leaveBreakdown || { PL: 0, LWP: 0, COFF: 0, OTHER: 0 },
            deductions: Array.isArray(raw.deductions) ? raw.deductions : [],
          };

          return emp;
        });

        setPayroll(payrollData);
        if (payrollData.length === 0) {
          // Optionally surface friendly message if frontend expects it
          setError("No payroll records found for the selected filters.");
        }
      } catch (err: any) {
        console.error("Payroll fetch error:", err);
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch payroll";
        setError(errorMessage);
        setPayroll([]); // keep state consistent
      } finally {
        setLoading(false);
      }
    }

    fetchPayroll();
  }, [month, year]);


  // Filter employees based on search term for the dropdown
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) return payroll;

    const term = employeeSearchTerm.toLowerCase().trim();
    return payroll.filter(emp => {
      if (!emp || emp.error || !emp.name || !emp.empId) {
        return false;
      }

      const matches = (
        emp.empId.toLowerCase().includes(term) ||
        emp.name.toLowerCase().includes(term) ||
        (emp.department && emp.department.toLowerCase().includes(term)) ||
        (emp.workerType && emp.workerType.toLowerCase().includes(term))
      );
      return matches;
    });
  }, [payroll, employeeSearchTerm]);

  // Helper to format month as YYYY-MM
  function getMonthParam(year: number, month: number) {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  // Download payslip handler
  async function handleDownloadPayslip(empId: string) {
    // Validate selected month is not in future
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      alert('Cannot generate payslip for future months');
      return false;
    }

    setDownloadingPayslip(empId);

    const monthParam = getMonthParam(year, month);

    try {
      const res = await api.get(`/hr/payroll/payslip/${encodeURIComponent(empId)}`, {
        params: { month: monthParam },
        responseType: 'blob',
        timeout: 60_000 // 60s timeout; adjust if needed
      });

      // If server returned a non-OK status but still a blob, treat it as error below
      const okStatus = res.status >= 200 && res.status < 300;
      const contentType = res.headers['content-type'] || '';

      // If response is JSON (server might return JSON error with application/json content type)
      if (!okStatus || contentType.includes('application/json')) {
        // attempt to parse error blob
        const text = await res.data.text();
        try {
          const parsed = JSON.parse(text);
          alert(`Error: ${parsed.message || parsed.error || 'Failed to download payslip'}`);
        } catch {
          alert(`Error: ${text || 'Failed to download payslip'}`);
        }
        return false;
      }

      // Determine filename: prefer Content-Disposition header, fallback to generated name
      let filename = `payslip_${empId}_${monthParam}.pdf`;
      const cd = res.headers['content-disposition'] || res.headers['Content-Disposition'];
      if (cd) {
        const match = /filename\*?=(?:UTF-8''?)?["']?([^;"']+)["']?/i.exec(cd);
        if (match && match[1]) {
          // decode RFC5987 encoded filename if present
          try {
            filename = decodeURIComponent(match[1]);
          } catch {
            filename = match[1];
          }
        }
      }

      // Create blob and trigger download
      const blob = new Blob([res.data], { type: res.data.type || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // For Firefox: must append
      document.body.appendChild(a);
      a.click();

      // Clean up
      a.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (err: any) {
      console.error('Payslip download error:', err);

      // axios network or timeout error
      if (err?.code === 'ECONNABORTED') {
        alert('Request timed out while downloading payslip. Please try again.');
        return false;
      }

      // If server returned error and axios placed a Blob in err.response.data
      if (err?.response?.data) {
        try {
          // err.response.data could be a Blob or string
          const blobOrText = err.response.data;
          if (blobOrText instanceof Blob) {
            const text = await blobOrText.text();
            try {
              const parsed = JSON.parse(text);
              alert(`Error: ${parsed.message || parsed.error || 'Failed to download payslip'}`);
            } catch {
              alert(`Error: ${text || 'Failed to download payslip'}`);
            }
          } else if (typeof blobOrText === 'string') {
            try {
              const parsed = JSON.parse(blobOrText);
              alert(`Error: ${parsed.message || parsed.error || 'Failed to download payslip'}`);
            } catch {
              alert(`Error: ${blobOrText || 'Failed to download payslip'}`);
            }
          } else {
            alert('Failed to download payslip. Server returned an error.');
          }
        } catch (innerErr) {
          console.error('Error parsing error response blob/text:', innerErr);
          alert('Failed to download payslip');
        }
      } else {
        // generic network error
        alert('Failed to download payslip: ' + (err.message || 'Unknown error'));
      }

      return false;
    } finally {
      setDownloadingPayslip(null);
    }
  }

  // Preview payslip handler
  function handlePreviewPayslip(empId: string) {
    // Validate selected month is not in future
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      alert('Cannot generate payslip for future months');
      return false;
    }

    const monthParam = getMonthParam(year, month);
    // Open preview in a new window/tab
    const previewUrl = `/api/v1/hr/payroll/preview/${empId}?month=${monthParam}`;
    window.open(previewUrl, '_blank');
  }

  // Filtered payroll list with better error handling
  const filteredPayroll = useMemo(() => {
    // If an employee is selected, only show that employee
    if (selectedEmployee) {
      return payroll.filter(emp => emp.empId === selectedEmployee.empId);
    }

    return payroll.filter(emp => {
      // Skip error records or records with missing required fields
      if (!emp || emp.error || !emp.name || !emp.empId) {
        return false;
      }

      // Ensure all required numeric fields have default values
      const safeEmp = {
        ...emp,
        presentDays: Number(emp.presentDays) || 0,
        absentDays: Number(emp.absentDays) || 0,
        otHours: Number(emp.otHours) || 0,
        otSalary: Number(emp.otSalary) || 0,
        cOffEarned: Number(emp.cOffEarned) || 0,
        phPaid: Number(emp.phPaid) || 0,
        grossSalary: Number(emp.grossSalary) || 0,
        totalDeduction: Number(emp.totalDeduction) || 0,
        netSalary: Number(emp.netSalary) || 0,
        phOtDays: Number(emp.phOtDays) || 0,
        phNoPay: Number(emp.phNoPay) || 0,
        fixedSalary: Number(emp.fixedSalary) || 0,
        leaveBreakdown: emp.leaveBreakdown || { PL: 0, LWP: 0, COFF: 0, OTHER: 0 },
        deductions: Array.isArray(emp.deductions) ? emp.deductions : []
      };

      const q = search.toLowerCase();
      const nameMatch = safeEmp.name.toLowerCase().includes(q) || safeEmp.empId.toLowerCase().includes(q);

      const workerTypeMatch = selectedWorkerType === "All" || safeEmp.workerType === selectedWorkerType;

      const departmentMatch = selectedDepartment === "All" || safeEmp.department === selectedDepartment;

      const minSalary = salaryRange.min ? parseFloat(salaryRange.min) : -Infinity;
      const maxSalary = salaryRange.max ? parseFloat(salaryRange.max) : Infinity;
      const salaryMatch = safeEmp.netSalary >= minSalary && safeEmp.netSalary <= maxSalary;

      return nameMatch && workerTypeMatch && departmentMatch && salaryMatch;
    });
  }, [payroll, selectedEmployee, search, selectedWorkerType, selectedDepartment, salaryRange]);

  // Get unique worker types for filter
  const workerTypes = ["All", ...Array.from(new Set(payroll
    .map(emp => emp.workerType)
    .filter(type => type && type !== undefined && type !== null)
  ))];

  // Get unique departments for filter
  const departments = ["All", ...Array.from(new Set(payroll
    .map(emp => emp.department || "")
    .filter(dept => dept && dept !== undefined && dept !== null && dept !== 'N/A')
  ))];

  // Calculate summary statistics for filtered results
  const filteredTotalEmployees = filteredPayroll.length;
  const filteredTotalGrossSalary = filteredPayroll.reduce((sum, emp) => {
    const gross = Number(emp.grossSalary) || 0;
    return sum + gross;
  }, 0);
  const filteredTotalNetSalary = filteredPayroll.reduce((sum, emp) => {
    const net = Number(emp.netSalary) || 0;
    return sum + net;
  }, 0);
  const filteredTotalDeductions = filteredPayroll.reduce((sum, emp) => {
    const deduction = Number(emp.totalDeduction) || 0;
    return sum + deduction;
  }, 0);
  const filteredAvgSalary = filteredTotalEmployees > 0 ? filteredTotalNetSalary / filteredTotalEmployees : 0;

  // Calculate summary statistics
  const totalEmployees = payroll.length;
  const totalGrossSalary = payroll.reduce((sum, emp) => {
    const gross = Number(emp.grossSalary) || 0;
    return sum + gross;
  }, 0);
  const totalNetSalary = payroll.reduce((sum, emp) => {
    const net = Number(emp.netSalary) || 0;
    return sum + net;
  }, 0);
  const totalDeductions = payroll.reduce((sum, emp) => {
    const deduction = Number(emp.totalDeduction) || 0;
    return sum + deduction;
  }, 0);

  // Clear employee selection
  const clearEmployeeSelection = () => {
    setSelectedEmployee(null);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setSelectedWorkerType("All");
    setSalaryRange({ min: "", max: "" });
    setSelectedDepartment("All");
    setSelectedEmployee(null);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return search || selectedWorkerType !== "All" || salaryRange.min || salaryRange.max || selectedDepartment !== "All" || selectedEmployee;
  };

  const exportTableToPDF = async (): Promise<void> => {
    setExporting(true);
    try {
      await exportPayrollToPDF(filteredPayroll, months[month - 1], year.toString());
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setExporting(false);
    }
  };

  function injectPdfExportVisibilityStyles() {
    const style = document.createElement('style');
    style.id = 'pdf-export-visibility-style';
    style.innerHTML = `
      .pdf-export .pdf-export-only { display: inline !important; }
      .pdf-export .web-only { display: none !important; }
      .pdf-export .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 1rem !important; margin-bottom: 2rem !important; }
      .pdf-export .Card { border: 1px solid #e5e7eb !important; border-radius: 0.5rem !important; padding: 1rem !important; }
      .pdf-export .CardHeader { margin-bottom: 0.5rem !important; }
      .pdf-export .CardTitle { font-size: 0.875rem !important; font-weight: 500 !important; }
      .pdf-export .CardContent { text-align: center !important; }
      .pdf-export .text-2xl { font-size: 1.5rem !important; font-weight: bold !important; }
      .pdf-export .text-xs { font-size: 0.75rem !important; }
      
      /* PDF Table Optimization - Full width table */
      .pdf-export table { 
        width: 100% !important; 
        table-layout: fixed !important; 
        font-size: 9px !important;
        border-collapse: collapse !important;
        margin: 0 !important;
        padding: 0 !important;
        page-break-inside: auto !important;
      }
      .pdf-export th, .pdf-export td { 
        padding: 5px 3px !important; /* Balanced padding */
        font-size: 8px !important;
        line-height: 1.2 !important;
        word-wrap: break-word !important;
        overflow: hidden !important;
        margin: 0 !important;
        vertical-align: middle !important;
        white-space: nowrap !important; /* Prevent text wrapping */
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .pdf-export th { 
        font-weight: bold !important; 
        background-color: #f3f4f6 !important;
        font-size: 7px !important;
      }
      
      /* Add extra padding to rows for better separation */
      .pdf-export tr {
        padding: 1px 0 !important;
        page-break-inside: auto !important;
      }
      
      /* Margin for subsequent tables */
      .pdf-export table:not(:first-of-type) {
        margin-top: 1rem !important;
      }
      
      /* Ensure table headers repeat on new pages */
      .pdf-export thead {
        display: table-header-group !important;
        margin: 0 !important;
        padding: 0 !important;
        page-break-inside: avoid !important;
      }
      
      /* Prevent page breaks inside table header row */
      .pdf-export thead tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Allow page breaks between table rows but not inside them */
      .pdf-export tbody tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: auto !important;
      }
      
      /* Prevent page breaks inside table cells */
      .pdf-export td, .pdf-export th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Prevent page breaks between header section and summary cards */
      .pdf-export .pdf-header-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      
      /* Prevent page breaks inside summary cards section */
      .pdf-export .pdf-summary-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      
      /* Prevent page breaks inside table section */
      .pdf-export .pdf-table-section {
        page-break-inside: auto !important;
        break-inside: auto !important;
        page-break-before: auto !important;
        break-before: auto !important;
      }
      
      /* Prevent page breaks between header section and summary section */
      .pdf-export .pdf-header-section + .pdf-summary-section {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }
      
      /* Prevent page breaks between summary section and table section */
      .pdf-export .pdf-summary-section + .pdf-table-section {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }
      
      /* Prevent page breaks between table header and first row */
      .pdf-export thead + tbody tr:first-child {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }
      
      /* Optimized column widths for full table width */
      .pdf-export th:nth-child(1), .pdf-export td:nth-child(1) { width: 7% !important; } /* Employee Name & ID */
      .pdf-export th:nth-child(2), .pdf-export td:nth-child(2) { width: 4% !important; } /* Worker Type */
      .pdf-export th:nth-child(3), .pdf-export td:nth-child(3) { width: 3% !important; } /* Present */
      .pdf-export th:nth-child(4), .pdf-export td:nth-child(4) { width: 3% !important; } /* Absent */
      .pdf-export th:nth-child(5), .pdf-export td:nth-child(5) { width: 3% !important; } /* OT Hours */
      .pdf-export th:nth-child(6), .pdf-export td:nth-child(6) { width: 5% !important; } /* OT Pay */
      .pdf-export th:nth-child(7), .pdf-export td:nth-child(7) { width: 3% !important; } /* PH Paid */
      .pdf-export th:nth-child(8), .pdf-export td:nth-child(8) { width: 3% !important; } /* PH OT */
      .pdf-export th:nth-child(9), .pdf-export td:nth-child(9) { width: 4% !important; } /* PH Not Paid */
      .pdf-export th:nth-child(10), .pdf-export td:nth-child(10) { width: 3% !important; } /* PL Used */
      .pdf-export th:nth-child(11), .pdf-export td:nth-child(11) { width: 3% !important; } /* LWP Used */
      .pdf-export th:nth-child(12), .pdf-export td:nth-child(12) { width: 4% !important; } /* Other Leaves */
      .pdf-export th:nth-child(13), .pdf-export td:nth-child(13) { width: 7% !important; } /* Gross Salary */
      .pdf-export th:nth-child(14), .pdf-export td:nth-child(14) { width: 7% !important; } /* Total Deductions */
      .pdf-export th:nth-child(15), .pdf-export td:nth-child(15) { width: 10% !important; } /* Deduction Details */
      .pdf-export th:nth-child(16), .pdf-export td:nth-child(16) { width: 7% !important; } /* Net Salary */
      .pdf-export th:nth-child(17), .pdf-export td:nth-child(17) { display: none !important; } /* Hide Payslip column in PDF */
      
      /* Hide tooltips and interactive elements in PDF */
      .pdf-export .tooltip, .pdf-export [data-tooltip] { display: none !important; }
      .pdf-export button { display: none !important; }
      .pdf-export .lucide { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function removePdfExportVisibilityStyles() {
    const style = document.getElementById('pdf-export-visibility-style');
    if (style) style.remove();
  }

  return (
    <SidebarInset>
      {/* Modern Header with Month Selector */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-lg font-semibold">Payroll Management</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="month-selector" className="text-sm font-medium">Select Month:</Label>
            <input
              type="month"
              id="month-selector"
              value={`${year}-${month.toString().padStart(2, '0')}`}
              onChange={(e) => {
                const [newYear, newMonth] = e.target.value.split('-').map(Number);
                setYear(newYear);
                setMonth(newMonth);
              }}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </header>
      <div className="flex-1 p-6 space-y-8">
        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{hasActiveFilters() ? "Filtered" : "Total"} Employees</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{hasActiveFilters() ? filteredTotalEmployees : totalEmployees}</div>
              <p className="text-xs text-muted-foreground">{hasActiveFilters() ? "Filtered results" : "Active payroll records"}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{hasActiveFilters() ? "Filtered" : "Total"} Gross Salary</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">₹{(hasActiveFilters() ? filteredTotalGrossSalary : totalGrossSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Gross salary for selected period</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{hasActiveFilters() ? "Filtered" : "Total"} Deductions</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">₹{(hasActiveFilters() ? filteredTotalDeductions : totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Total deductions</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{hasActiveFilters() ? "Filtered" : "Total"} Net Salary</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">₹{(hasActiveFilters() ? filteredTotalNetSalary : totalNetSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Net salary paid</p>
            </CardContent>
          </Card>
        </div>
        {/* Filter/Search Bar */}
        <Card className="p-4 flex flex-col gap-4 border-2 border-dashed border-gray-200">
          {/* Employee Selection Dropdown */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Popover open={employeeSelectorOpen} onOpenChange={setEmployeeSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between pl-3 pr-2">
                    {selectedEmployee ? (
                      <div className="flex items-center gap-2 w-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left truncate">
                          {selectedEmployee.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {selectedEmployee.empId}
                        </Badge>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Select employee...</span>
                        <ChevronDown className="h-4 w-4 opacity-50 ml-auto" />
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <CommandInput
                        placeholder="Search employees..."
                        value={employeeSearchTerm}
                        onValueChange={setEmployeeSearchTerm}
                        className="pl-10"
                      />
                    </div>
                    <CommandList>
                      {filteredEmployees.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map((emp: Payroll) => (
                          <CommandItem
                            key={emp.empId}
                            onSelect={() => {
                              setSelectedEmployee({ ...emp });
                              setEmployeeSelectorOpen(false);
                              setEmployeeSearchTerm("");
                            }}
                            className="flex items-center gap-2"
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {emp.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {emp.empId} • {emp.workerType}
                              </div>
                            </div>
                          </CommandItem>
                        ))
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Clear selection button when employee is selected */}
              {selectedEmployee && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-5 w-5 p-0"
                  onClick={clearEmployeeSelection}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Traditional Search Input */}
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <Label htmlFor="search">Search Employee</Label>
              <Input
                id="search"
                placeholder="Search by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workerType">Worker Type</Label>
              <Select value={selectedWorkerType} onValueChange={setSelectedWorkerType}>
                <SelectTrigger id="workerType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workerTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="department">Department</Label>
              <Select value={selectedDepartment} onValueChange={v => setSelectedDepartment(v || "")}>
                <SelectTrigger id="department" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Salary Range (Net)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={salaryRange.min}
                  onChange={e => setSalaryRange(r => ({ ...r, min: e.target.value }))}
                  className="w-1/2"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={salaryRange.max}
                  onChange={e => setSalaryRange(r => ({ ...r, max: e.target.value }))}
                  className="w-1/2"
                />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters()} className="border border-gray-300">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button onClick={exportTableToPDF} disabled={exporting || filteredPayroll.length === 0} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Export Table as PDF
              </Button>
            </div>
          </div>
        </Card>
        {/* Payroll Table */}
        <Card className="overflow-x-auto border-2 border-gray-100 shadow-sm">
          <div id="payroll-table">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center font-semibold">Employee</TableHead>
                  <TableHead className="text-center font-semibold">Worker Type</TableHead>
                  <TableHead className="text-center font-semibold">Present</TableHead>
                  <TableHead className="text-center font-semibold">Absent</TableHead>
                  <TableHead className="text-center font-semibold">OT Hours</TableHead>
                  <TableHead className="text-center font-semibold">OT Pay</TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      PH Paid
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Number of Paid Holidays credited to this employee for the month.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      PH OT
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Number of Paid Holidays where the employee worked and received OT pay.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      PH Not Paid
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Number of Paid Holidays not credited because the employee was absent both before and after the holiday.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">PL Used</TableHead>
                  <TableHead className="text-center font-semibold">LWP Used</TableHead>
                  <TableHead className="text-center font-semibold">Other Leaves</TableHead>
                  <TableHead className="text-center font-semibold">Gross Salary</TableHead>
                  <TableHead className="text-center font-semibold">Total Deductions</TableHead>
                  <TableHead className="text-center font-semibold">Net Salary</TableHead>
                  <TableHead className="text-center font-semibold">Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8">
                      <span className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="animate-spin h-6 w-6" /> Loading payroll data...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-red-500">
                      Error: Server not connected {error}
                    </TableCell>
                  </TableRow>
                ) : filteredPayroll.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      No payroll records found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayroll.map(emp => {
                    return (
                      <TableRow key={emp.empId} className="hover:bg-blue-50">
                        <TableCell className="text-center font-medium">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-blue-900">{emp.name}</span>
                            <span className="text-xs text-muted-foreground">{emp.empId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="pdf-export-only hidden">{emp.workerType}</span>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full font-semibold web-only">
                            {emp.workerType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-700 font-semibold">{emp.presentDays}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-600 font-semibold">{emp.absentDays}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono">{emp.otHours}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-green-700 font-bold">₹{emp.otSalary?.toLocaleString() || '0'}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono">{emp.phPaid ?? 0}</TableCell>
                        <TableCell className="text-center font-mono">{emp.phOtDays ?? 0}</TableCell>
                        <TableCell className="text-center font-mono">{emp.phNoPay ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-blue-700 font-semibold">{emp.leaveBreakdown?.PL || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-blue-700 font-semibold">{emp.leaveBreakdown?.LWP || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-blue-700 font-semibold">{emp.leaveBreakdown?.OTHER || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-blue-900 font-bold">₹{emp.grossSalary.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-orange-700 font-bold">₹{emp.totalDeduction.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-purple-900 font-bold">₹{emp.netSalary.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="outline" onClick={() => handlePreviewPayslip(emp.empId)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </SidebarInset>
  );
}