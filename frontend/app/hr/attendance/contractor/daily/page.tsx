"use client";

import { useEffect, useState, useMemo } from "react";
import axios from 'axios'; // Import axios directly
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarInset } from "@/components/ui/sidebar";
import { EnhancedExportButton } from "@/components/ui/EnhancedExportButton";
import { toast } from "sonner";
import { AttendanceTable } from "@/components/hr-attendance/AttendanceTable";
import { StatisticsCards } from "@/components/hr-attendance/StatisticsCards";
import { ContractorFilters } from "@/components/hr-attendance/ContractorFilters";
import { DateSelector } from "@/components/hr-attendance/DateSelector";
import { Filter } from "lucide-react";
import html2pdf from 'html2pdf.js';

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

// Update the PunchRecord type to include contractor information
type PunchRecord = {
  _id: string;
  contractorId: string;
  contractorEmployeeId: string;
  employeeName: string;
  punchType: "IN" | "OUT";
  imageUrl: string;
  timestamp: string;
  createdAt?: string;
  reason?: string;
};

// Add a new type for daily attendance with contractor information
type DailyAttendanceRecord = {
  empId: string; // Changed to match AttendanceRecord type
  name: string; // Changed to match AttendanceRecord type
  department: string; // Added to match AttendanceRecord type
  designation?: string; // Added to match AttendanceRecord type
  checkIn: string;
  checkOut: string;
  checkInDisplay: string;
  checkOutDisplay: string;
  status: string;
  leaveReason?: string;
  isNightShift: boolean;
  checkInFromPreviousDay: boolean;
  imageUrl?: string;
  inPunchId?: string;
  outPunchId?: string;
  sessionId?: string; // Add sessionId for session-based records
  otHours?: number;
};

export default function ContractorDailyAttendancePage() {
  const [contractors, setContractors] = useState<{
    _id: string;
    name: string;
  }[]>([]);
  const [contractorEmployees, setContractorEmployees] = useState<{
    contractorEmployeeId: string;
    employeeName: string;
    contractorId: string;
    contractorName: string;
  }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [grouped, setGrouped] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [contractorFilter, setContractorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Combine filters into a single object for easier handling
  const filters = useMemo(() => ({
    contractor: contractorFilter,
    status: statusFilter
  }), [contractorFilter, statusFilter]);

  // Debug: Log all state changes
  useEffect(() => {
    // Removed debug logging
  }, [selectedDate, searchTerm, contractorFilter, statusFilter, dailyAttendance]);

  // Compute filtered records based on search and filters
  const filteredRecords = useMemo(() => {
    // Removed debug logging

    if (!Array.isArray(dailyAttendance)) {
      return [];
    }

    // If no data, return empty array
    if (dailyAttendance.length === 0) {
      return [];
    }

    // If no filters applied at all, return all records
    const isSearchEmpty = !searchTerm || searchTerm.trim() === '';
    const isContractorFilterAll = !contractorFilter || contractorFilter === "All" || contractorFilter === "";
    const isStatusFilterAll = !statusFilter || statusFilter === "All" || statusFilter === "";

    if (isSearchEmpty && isContractorFilterAll && isStatusFilterAll) {
      return dailyAttendance;
    }

    const result = dailyAttendance.filter((record, index) => {
      // Search filter
      if (!isSearchEmpty) {
        const searchLower = (searchTerm || '').toLowerCase().trim();
        const nameMatch = (record.name || '').toLowerCase().includes(searchLower);
        const idMatch = (record.empId || '').toLowerCase().includes(searchLower);
        if (!nameMatch && !idMatch) {
          return false;
        }
      }

      // Contractor filter - exact matching
      if (!isContractorFilterAll && contractorFilter) {
        const recordContractor = (record.department || '').trim();
        const filterContractor = contractorFilter.trim();
        const match = recordContractor === filterContractor;
        if (!match) {
          return false;
        }
      }

      // Status filter - exact matching
      if (!isStatusFilterAll && statusFilter) {
        const recordStatus = (record.status || '').trim();
        const filterStatus = statusFilter.trim();
        const match = recordStatus === filterStatus;
        if (!match) {
          return false;
        }
      }

      return true;
    });

    return result;
  }, [dailyAttendance, searchTerm, contractorFilter, statusFilter]);

  // Debugging useEffect to monitor filtered records
  useEffect(() => {
    // Removed debug logging
  }, [filteredRecords]);

  // Compute statistics based on filtered records
  const stats = useMemo(() => {
    const total = Array.isArray(contractorEmployees) ? contractorEmployees.length : 0;
    const present = Array.isArray(filteredRecords) ? filteredRecords.filter(r => r.status === 'Present').length : 0;
    const partial = Array.isArray(filteredRecords) ? filteredRecords.filter(r => r.status === 'IN Only' || r.status === 'OUT Only').length : 0;
    const leave = Array.isArray(filteredRecords) ? filteredRecords.filter(r => r.status === 'On Leave').length : 0;
    const absent = Array.isArray(filteredRecords) ? filteredRecords.filter(r => r.status === 'Absent').length : 0;

    // Calculate total OT hours
    const totalOtHours = Array.isArray(filteredRecords) ? filteredRecords.reduce((sum, record) => {
      // Ensure otHours is a number
      const otHours = typeof record.otHours === 'number' ? record.otHours : 0;
      return sum + otHours;
    }, 0) : 0;

    return {
      total,
      present,
      partial,
      leave,
      absent,
      otHours: totalOtHours.toFixed(1)
    };
  }, [filteredRecords, contractorEmployees]);

  useEffect(() => {
    async function fetchContractors() {
      try {
        const res = await api.get("/contractors"); // Using direct axios instance
        // Ensure we're getting an array from the response
        const contractorsData = Array.isArray(res.data) ? res.data :
          (res.data?.data && Array.isArray(res.data.data)) ? res.data.data : [];
        // Filter out invalid contractor objects
        const validContractors = contractorsData.filter((contractor: any) =>
          contractor && contractor._id && contractor.name
        );
        setContractors(validContractors);
      } catch (err: any) {
        // Silently handle error
        toast.error("Failed to load contractors: " + (err.response?.data?.message || err.message));
        setContractors([]);
      }
    }

    fetchContractors();
  }, []);

  // Fetch contractor employees
  useEffect(() => {
    async function fetchContractorEmployees() {
      try {
        // First fetch all contractors
        const contractorsRes = await api.get("/contractors"); // Using direct axios instance
        // Ensure we're getting an array from the response
        const contractorsData = Array.isArray(contractorsRes.data) ? contractorsRes.data :
          (contractorsRes.data?.data && Array.isArray(contractorsRes.data.data)) ? contractorsRes.data.data : [];

        // If no contractors, set empty array and return early
        if (contractorsData.length === 0) {
          setContractorEmployees([]);
          return;
        }

        // Then fetch employees for each contractor
        const allEmployees = [];
        for (const contractor of contractorsData) {
          // Validate contractor object
          if (!contractor || !contractor._id || !contractor.name) {
            continue;
          }

          try {
            const employeesRes = await api.get("/punch/contractor/employees", { // Using direct axios instance
              params: {
                contractorId: contractor._id
              }
            });

            // Ensure we're getting an array from the response
            const employeesData = Array.isArray(employeesRes.data) ? employeesRes.data :
              (employeesRes.data?.data && Array.isArray(employeesRes.data.data)) ? employeesRes.data.data : [];

            // Add contractor info to each employee
            const employeesWithContractorInfo = employeesData.map((emp: any, index: number) => {
              // Validate employee object
              if (!emp || typeof emp !== 'object') {
                return {
                  contractorEmployeeId: `invalid-${index}`,
                  employeeName: `Invalid Employee ${index + 1}`,
                  contractorId: contractor._id,
                  contractorName: contractor.name
                };
              }

              return {
                ...emp,
                contractorId: contractor._id,
                contractorName: contractor.name
              };
            });
            allEmployees.push(...employeesWithContractorInfo);
          } catch (err: any) {
            // Silently handle error
            toast.error(`Error fetching employees for contractor ${contractor.name}: ` + (err.response?.data?.message || err.message));
            // Continue with other contractors even if one fails
          }
        }

        setContractorEmployees(allEmployees);
      } catch (err: any) {
        // Silently handle error
        toast.error("Failed to load contractor employees: " + (err.response?.data?.message || err.message));
        setContractorEmployees([]); // Set empty array on error
      }
    }

    fetchContractorEmployees();
  }, []);

  // Always fetch daily attendance for contractors
  useEffect(() => {
    if (!selectedDate) {
      setDailyAttendance([]); // Clear attendance when no date is selected
      return;
    }

    setLoading(true);
    const fetchDailyAttendance = async () => {
      try {
        const dateStr = selectedDate.toISOString().slice(0, 10);
        // Use the new endpoint for contractor daily attendance with night shift handling
        const res = await api.get(`/punch/daily-attendance-contractor?date=${dateStr}`); // Using direct axios instance

        // Check if response is valid
        if (res.data && res.data.data) {
          // Set the attendance data directly since it's already in the correct format
          setDailyAttendance(res.data.data || []);
        } else {
          setDailyAttendance([]);
        }
      } catch (err: any) {
        // Silently handle error
        toast.error(err?.response?.data?.error || "Failed to fetch contractor daily attendance");
        setDailyAttendance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDailyAttendance();
  }, [selectedDate]);

  const handleDeletePunch = async (punchId: string) => {
    // Validate punchId
    if (!punchId || typeof punchId !== 'string') {
      toast.error("Invalid session ID");
      return;
    }

    try {
      // Use the correct endpoint for deleting contractor sessions
      await api.delete(`/punch/contractor/session/${punchId}`); // Using direct axios instance
      toast.success("Session deleted successfully");

      // Refresh the data after deletion
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().slice(0, 10);
        // Use the new endpoint for contractor daily attendance with night shift handling
        const res = await api.get(`/punch/daily-attendance-contractor?date=${dateStr}`); // Using direct axios instance

        // Check if response is valid
        if (res.data && res.data.data) {
          // Set the attendance data directly since it's already in the correct format
          setDailyAttendance(res.data.data || []);
        } else {
          setDailyAttendance([]);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete session");
    }
  };

  const getStatusBadge = (status: string, leaveReason?: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>;
      case 'in only':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">IN Only</Badge>;
      case 'out only':
        return <Badge className="bg-orange-500 hover:bg-orange-600">OUT Only</Badge>;
      case 'on leave':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600" title={leaveReason}>
            On Leave{leaveReason ? `: ${leaveReason}` : ''}
          </Badge>
        );
      case 'week off':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Week Off</Badge>;
      case 'holiday':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">Holiday</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>;
    }
  };

  // Add export to CSV function
  const exportToCSV = () => {
    if (!selectedDate || !Array.isArray(filteredRecords) || filteredRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const headers = [
      "Employee ID",
      "Name",
      "Contractor",
      "Check In",
      "Check Out",
      "Status",
      "Night Shift"
    ].join(",");

    const rows = filteredRecords.map(record => {
      return [
        `"${record.empId || ''}"`,
        `"${record.name || ''}"`,
        `"${record.department || ''}"`,
        `"${record.checkIn || ''}"`,
        `"${record.checkOut || ''}"`,
        `"${record.status || ''}"`,
        `"${record.isNightShift ? 'Yes' : 'No'}"`
      ].join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contractor-daily-attendance-${selectedDate.toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully!");
  };

  // Helper function to convert image URL to base64
  const convertImageToBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        // If it's already base64, return it
        if (url.startsWith('data:')) {
          resolve(url);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Preserve aspect ratio with larger dimensions for better quality in enlarged PDF
            const maxWidth = 600;
            const maxHeight = 600;
            let { width, height } = img;

            // Calculate new dimensions while preserving aspect ratio
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            if (ctx) {
              // Draw image with better quality settings
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const base64 = canvas.toDataURL('image/jpeg', 0.8); // Slightly reduced quality for better performance
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

        // Clear any existing timeout handlers to prevent memory leaks
        let timeoutId: NodeJS.Timeout | null = null;

        timeoutId = setTimeout(() => {
          // Clean up event listeners to prevent memory leaks
          img.onload = null;
          img.onerror = null;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve(null);
        }, 20000); // Increased timeout to 20 seconds

        img.src = url;
      } catch (error) {
        resolve(null);
      }
    });
  };

  // Add export to PDF function (without images)
  const exportToPDF = async () => {
    if (!selectedDate || !Array.isArray(filteredRecords) || filteredRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      toast.info("Generating PDF...");
      const { exportDailyAttendanceToPDF } = await import('@/utils/pdfExport');
      await exportDailyAttendanceToPDF(filteredRecords, selectedDate.toISOString().slice(0, 10));
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  // New function to download images in a grid format (3 per row) with pagination
  const downloadImagesGrid = async () => {
    if (!selectedDate || !Array.isArray(filteredRecords) || filteredRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      toast.loading("Preparing image grid PDF...", {
        description: "Converting images and generating PDF report"
      });

      // Filter records with images
      const recordsWithImages = filteredRecords.filter(record => record.imageUrl);

      if (recordsWithImages.length === 0) {
        toast.error("No records with images to export");
        return;
      }

      // Dynamically import html2pdf - moved outside of try/catch to ensure it loads properly
      let html2pdf;
      try {
        html2pdf = (await import('html2pdf.js')).default;
      } catch (importError) {
        toast.error("Failed to load PDF generator. Please try again.");
        return;
      }

      // Convert all images to base64 first with better error handling
      // Process images with a concurrency limit to prevent overwhelming the browser
      const CONCURRENT_LIMIT = 3;
      const results: any[] = [];

      for (let i = 0; i < recordsWithImages.length; i += CONCURRENT_LIMIT) {
        const batch = recordsWithImages.slice(i, i + CONCURRENT_LIMIT);
        const batchPromises = batch.map(async (record) => {
          if (record.imageUrl) {
            const base64 = await convertImageToBase64(record.imageUrl);
            return { ...record, base64Image: base64 };
          }
          return { ...record, base64Image: null };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Update progress
        const processed = Math.min(i + CONCURRENT_LIMIT, recordsWithImages.length);
        toast.loading(`Converting images... ${processed}/${recordsWithImages.length}`, {
          description: `Processed ${processed} of ${recordsWithImages.length} images`
        });
      }

      const recordsWithBase64 = results;
      const successfulConversions = recordsWithBase64.filter(r => r.base64Image).length;
      const failedConversions = recordsWithBase64.length - successfulConversions;

      // Even if some images failed, we'll still include the successful ones
      if (successfulConversions === 0) {
        toast.error("No images could be converted. Please check image URLs and try again.");
        return;
      }

      // Update loading toast
      toast.loading("Generating PDF...", {
        description: `Successfully converted ${successfulConversions} images, creating PDF`
      });

      // Create HTML content with images in a 3-column grid with pagination
      // Filter out records without base64 images to avoid empty grid items
      const validRecords = recordsWithBase64.filter(record => record.base64Image);

      // Build HTML content with proper pagination - create pages with 9 items each (3x3 grid)
      const ITEMS_PER_PAGE = 9;
      const totalPages = Math.ceil(validRecords.length / ITEMS_PER_PAGE);

      let pagesHtml = '';
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const startIndex = pageNum * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, validRecords.length);
        const pageRecords = validRecords.slice(startIndex, endIndex);

        // Build grid items for this page
        let gridItemsHtml = '';
        for (let i = 0; i < pageRecords.length; i++) {
          const record = pageRecords[i];
          gridItemsHtml += `
            <div style="text-align: center; break-inside: avoid; padding: 10px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 10px; color: #666; margin-bottom: 3px;">#${startIndex + i + 1}</div>
              <img src="${record.base64Image}" 
                   style="max-width: 100%; height: 120px; object-fit: cover; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" 
                   alt="Punch Image" />
              <div style="font-size: 12px; margin-top: 5px;">
                <div style="font-weight: bold; color: #333; margin-bottom: 2px; font-size: 14px;">${record.name || 'N/A'}</div>
                <div style="color: #555; margin-bottom: 1px;">${record.department || 'N/A'}</div>
                <div style="color: #555; margin-bottom: 1px; font-weight: 500;">${record.empId || 'N/A'}</div>
              </div>
            </div>
          `;
        }

        // Add page to document
        pagesHtml += `
          <div style="page-break-after: ${pageNum < totalPages - 1 ? 'always' : 'auto'};">
            ${pageNum === 0 ? `
            <h1 style="text-align: center; color: #8B0000; font-size: 24px; margin-bottom: 8px;">ATITHI LLP - Contractor Attendance Photos</h1>
            <p style="text-align: center; font-size: 16px; margin-bottom: 4px;">Date: ${selectedDate.toLocaleDateString()}</p>
            <p style="text-align: center; font-size: 12px; color: #666; margin-bottom: 4px;">Generated: ${new Date().toLocaleString()}</p>
            <p style="text-align: center; font-size: 16px; margin-bottom: 20px; font-weight: bold;">
              Total Images: ${successfulConversions}${failedConversions > 0 ? ` (${failedConversions} failed to load)` : ''}
            </p>
            ` : `
            <h2 style="text-align: center; color: #8B0000; font-size: 18px; margin-bottom: 15px;">
              Contractor Attendance Photos (Page ${pageNum + 1} of ${totalPages})
            </h2>
            <p style="text-align: center; font-size: 14px; margin-bottom: 15px;">Date: ${selectedDate.toLocaleDateString()}</p>
            `}
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
              ${gridItemsHtml}
            </div>
            
            <p style="text-align: center; font-size: 10px; color: #999; margin-top: 20px;">
              Page ${pageNum + 1} of ${totalPages}
            </p>
          </div>
        `;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          ${pagesHtml}
        </div>
      `;

      // Generate PDF with timeout protection
      const pdfGenerationPromise = html2pdf()
        .set({
          margin: [0.3, 0.3, 0.3, 0.3], // Reduced margins for better space utilization
          filename: `contractor-attendance-images-${selectedDate.toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.7 }, // Reduced quality for better performance
          html2canvas: {
            scale: 2, // Scale for better image quality
            useCORS: true,
            logging: false,
            imageTimeout: 20000 // Increased timeout
          },
          jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait',
            compress: true // Enable compression for better performance
          }
        })
        .from(htmlContent)
        .save();

      // Add timeout protection for PDF generation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('PDF generation timeout'));
        }, 60000); // Increased timeout to 60 seconds for PDF generation
      });

      // Wait for either the PDF generation to complete or timeout
      await Promise.race([pdfGenerationPromise, timeoutPromise]);

      toast.success(`Image Grid PDF exported successfully! Images: ${successfulConversions} converted${failedConversions > 0 ? `, ${failedConversions} failed` : ''}`);
    } catch (error) {
      toast.error("Failed to export Image Grid PDF. Please try again.");
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Contractor Daily Attendance</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Daily Attendance</h2>
            <p className="text-muted-foreground">Track contractor attendance records</p>
          </div>
          <div className="flex items-center gap-2">
            <EnhancedExportButton
              onExport={exportToCSV}
              disabled={!selectedDate}
              estimatedTime="1-2 seconds"
            >
              Export CSV
            </EnhancedExportButton>
            <EnhancedExportButton
              onExport={exportToPDF}
              disabled={!selectedDate}
              estimatedTime="2-3 seconds"
            >
              Export PDF
            </EnhancedExportButton>
            <EnhancedExportButton
              onExport={downloadImagesGrid}
              disabled={!selectedDate}
              estimatedTime="2-3 seconds"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg"
            >
              Image Grid PDF
            </EnhancedExportButton>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DateSelector
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:col-span-2 lg:col-span-1"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <ContractorFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={filters}
            setFilters={{
              setContractorFilter: setContractorFilter,
              setStatusFilter: setStatusFilter
            }}
            contractors={(() => {
              // Get unique contractor names from the dailyAttendance data
              // This ensures we only show contractors that actually have attendance records
              if (!Array.isArray(dailyAttendance)) {
                return [];
              }

              const contractorNames = Array.from(
                new Set(
                  dailyAttendance
                    .filter(record => record && record.department)
                    .map(record => {
                      return record.department;
                    })
                )
              ).filter(name => {
                return name && typeof name === 'string' && name.trim() !== '';
              });

              return contractorNames;
            })()}
          />
        )}

        <StatisticsCards stats={stats} />

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {selectedDate
                ? `Attendance records for ${selectedDate.toDateString()}`
                : "Please select a date to view attendance records"}
              {filteredRecords.length > 0 && ` (${filteredRecords.length} records)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found for the selected date and filters.
              </div>
            ) : (
              <AttendanceTable
                records={filteredRecords}
                onDeletePunch={handleDeletePunch}
                getStatusBadge={getStatusBadge}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}