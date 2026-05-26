"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Download, Loader2, Clock, LogIn, LogOut, Calendar, User, Plus, UserPlus, FileText, CalendarDays, FileSpreadsheet, Filter } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
// @ts-ignore
import html2pdf from 'html2pdf.js';
import PDFHeader from "@/components/pdf-header";
import axios from 'axios'; // Import axios directly
import Link from "next/link";
import { ContractorFilters } from "@/components/hr-attendance/ContractorFilters";

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

// Add CSS styles to prevent page breaks inside table rows
const styles = `
  .no-break-table {
    page-break-inside: avoid;
  }
  
  .no-break-row {
    page-break-inside: avoid;
  }
  
  .pdf-export-only {
    display: none;
  }
  
  @media print {
    .pdf-export-only {
      display: block !important;
    }
    
    body * {
      visibility: hidden;
    }
    
    #contractor-attendance-table,
    #contractor-attendance-table * {
      visibility: visible;
    }
    
    #contractor-attendance-table {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    
    .no-break-table {
      page-break-inside: avoid;
    }
    
    .no-break-row {
      page-break-inside: avoid;
    }
    
    .pdf-image {
      width: 40px !important;
      height: 40px !important;
      object-fit: cover !important;
      border-radius: 4px !important;
    }
  }
`;

// Types
interface Contractor {
  _id: string;
  name: string;
}

interface PunchRecord {
  _id: string;
  punchType: string;
  imageUrl?: string;
  timestamp: string;
  createdAt?: string;
}

interface SessionRecord {
  _id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface ContractorEmployeeAttendanceDetail {
  contractorEmployeeId: string;
  employeeName: string;
  contractorId: string;
  contractorName: string;
  dayPunches: PunchRecord[];
  monthPunches: PunchRecord[];
  daySessions: SessionRecord[];
  monthSessions: SessionRecord[];
  dayStats: {
    firstIn: string | null;
    lastOut: string | null;
    totalHours: number;
    punchCount: number;
  };
  monthStats: {
    totalDays: number;
    totalHours: number;
    totalPunches: number;
  };
}

// Grouped contractor data type
interface GroupedContractorData {
  contractorId: string;
  contractorName: string;
  totalEmployees: number;
  totalDays: number;
  totalOtHours: number;
  totalPunches: number;
}

export default function ContractorAttendancePage() {
  // State
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<ContractorEmployeeAttendanceDetail[]>([]);
  const [filteredData, setFilteredData] = useState<ContractorEmployeeAttendanceDetail[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedContractorData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState({
    contractor: "All",
    status: "All"
  });

  // Fetch contractors
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const res = await api.get("/contractors"); // Using direct axios instance
        setContractors(res.data.data || []);
      } catch (err) {
        console.error("Error fetching contractors:", err);
        toast.error("Failed to fetch contractors");
      }
    };

    fetchContractors();
  }, []);

  // Fetch attendance data
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedContractor) return;

      setLoading(true);
      try {
        const res = await api.get(`/punch/contractor/detailed?contractorId=${selectedContractor}&date=${selectedDate}&month=${selectedMonth}`); // Using direct axios instance
        setData(res.data.data || []);
        setFilteredData(res.data.data || []);
      } catch (err) {
        console.error("Error fetching contractor attendance data:", err);
        toast.error("Failed to fetch attendance data");
        setData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedContractor, selectedDate, selectedMonth]);

  // Group data by contractor
  useEffect(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      setGroupedData([]);
      return;
    }

    // Group by contractor
    const grouped: { [key: string]: GroupedContractorData } = {};

    filteredData.forEach(employee => {
      const contractorId = employee.contractorId;

      if (!grouped[contractorId]) {
        grouped[contractorId] = {
          contractorId: employee.contractorId,
          contractorName: employee.contractorName,
          totalEmployees: 0,
          totalDays: 0,
          totalOtHours: 0,
          totalPunches: 0
        };
      }

      // Increment employee count
      grouped[contractorId].totalEmployees += 1;

      // Add monthly stats
      grouped[contractorId].totalDays += employee.monthStats?.totalDays || 0;
      grouped[contractorId].totalOtHours += employee.monthStats?.totalHours || 0;
      grouped[contractorId].totalPunches += employee.monthStats?.totalPunches || 0;
    });

    // Convert to array
    setGroupedData(Object.values(grouped));
  }, [filteredData]);

  // Format time
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Invalid Time";
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    const element = document.getElementById('contractor-attendance-table');
    if (!element) {
      toast.error("Table element not found");
      return;
    }

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const options = {
        margin: 10,
        filename: `contractor-attendance-${selectedDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(options).from(element).save();
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("Error exporting PDF:", err);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <SidebarInset>
      <style>{styles}</style>

      {/* Header */}
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Contractor Attendance</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/hr/attendance">
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Employee Attendance
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>

            <Select value={selectedContractor} onValueChange={setSelectedContractor}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map(contractor => (
                  <SelectItem key={contractor._id} value={contractor._id}>
                    {contractor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={loading || groupedData.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <ContractorFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={filters}
            setFilters={{
              setContractorFilter: (value: string) => setFilters(prev => ({ ...prev, contractor: value })),
              setStatusFilter: (value: string) => setFilters(prev => ({ ...prev, status: value }))
            }}
            contractors={Array.isArray(contractors) ? contractors.map(c => c.name) : []}
          />
        )}

        <Card className="overflow-x-auto">
          <div id="contractor-attendance-table">
            {/* PDF Header - Only visible in PDF exports */}
            <div className="pdf-export-only hidden">
              <PDFHeader
                title="Contractor Attendance Report"
                subtitle={`Date: ${selectedDate} | Month: ${selectedMonth}`}
              />
            </div>
            <Table className="no-break-table">
              <TableHeader>
                <TableRow className="no-break-row">
                  <TableHead className="w-48">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contractor
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Total Employees
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Monthly Summary ({selectedMonth})
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="no-break-row">
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="animate-spin inline-block mr-2" /> Loading...
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(groupedData) || groupedData.length === 0 ? (
                  <TableRow className="no-break-row">
                    <TableCell colSpan={3} className="text-center py-8">No contractor data found.</TableCell>
                  </TableRow>
                ) : (
                  groupedData.map((contractor, index) => (
                    <TableRow key={contractor.contractorId || `contractor-${index}`} className="hover:bg-gray-50 no-break-row">
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold">{contractor.contractorName || 'Unknown Contractor'}</div>
                            <div className="text-xs text-gray-500">{contractor.totalEmployees} employees</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Employees */}
                      <TableCell>
                        <div className="space-y-2">
                          <Badge variant="outline" className="text-xs">
                            {contractor.totalEmployees} employees
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Monthly Summary */}
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {contractor.totalDays} days
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {contractor.totalPunches} punches
                            </Badge>
                            {contractor.totalOtHours > 0 && (
                              <Badge variant="default" className="text-xs bg-blue-100 text-blue-700">
                                {contractor.totalOtHours.toFixed(1)}h total
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </SidebarInset>
  );
}