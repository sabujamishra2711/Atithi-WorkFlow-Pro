"use client"

import { useEffect, useState, useMemo } from "react"
import api from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset } from "@/components/ui/sidebar"
import { EnhancedExportButton } from "@/components/ui/EnhancedExportButton"
import { toast } from "sonner"
import { AttendanceTable } from "@/components/hr-attendance/AttendanceTable"
import { StatisticsCards } from "@/components/hr-attendance/StatisticsCards"
import { Filters } from "@/components/hr-attendance/Filters"
import { DateSelector } from "@/components/hr-attendance/DateSelector"
import { Filter, Users, UserCog } from "lucide-react"
import Link from "next/link"

// Update the PunchRecord type to include night shift information
type PunchRecord = {
  _id: string
  employeeId: string
  punchType: "IN" | "OUT" | "LEAVE"
  imageUrl: string
  timestamp: string
  createdAt?: string
  reason?: string
}

// Add a new type for daily attendance with night shift handling
type DailyAttendanceRecord = {
  empId: string; // Changed from employeeId to match AttendanceRecord type
  name: string;
  department: string;
  designation?: string;
  checkIn: string; // Removed null type to match AttendanceRecord
  checkOut: string; // Removed null type to match AttendanceRecord
  checkInDisplay: string;
  checkOutDisplay: string;
  status: string;
  leaveReason?: string;
  isNightShift: boolean;
  checkInFromPreviousDay: boolean;
  imageUrl?: string;
  inPunchId?: string;
  outPunchId?: string;
  otHours?: number; // Add OT hours field
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<{
    empId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    department?: string;
    designation?: string;
    shiftDetails?: { workHoursPerDay?: number };
  }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [punches, setPunches] = useState<PunchRecord[]>([])
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord[]>([])
  // Remove the useNightShiftMode state since we're always using night shift mode
  const [grouped, setGrouped] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    department: "All",
    designation: "All",
    status: "All"
  })

  // Compute filtered records based on search and filters
  const filteredRecords = useMemo(() => {
    return dailyAttendance.map((record, index) => ({
      ...record,
      // Ensure checkIn and checkOut are strings to match AttendanceRecord type
      checkIn: record.checkIn || '',
      checkOut: record.checkOut || ''
    })).filter(record => {
      // Search filter
      const matchesSearch = !searchTerm ||
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.empId.toLowerCase().includes(searchTerm.toLowerCase());

      // Department filter
      const matchesDepartment = filters.department === "All" ||
        record.department === filters.department;

      // Designation filter
      const matchesDesignation = filters.designation === "All" ||
        record.designation === filters.designation;

      // Status filter
      const matchesStatus = filters.status === "All" ||
        record.status === filters.status;

      return matchesSearch && matchesDepartment && matchesDesignation && matchesStatus;
    });
  }, [dailyAttendance, searchTerm, filters]);

  // Compute statistics based on filtered records
  const stats = useMemo(() => {
    const total = employees.length;
    const present = filteredRecords.filter(r => r.status === 'Present').length;
    const partial = filteredRecords.filter(r => r.status === 'IN Only' || r.status === 'OUT Only').length;
    const leave = filteredRecords.filter(r => r.status === 'On Leave').length;
    const absent = filteredRecords.filter(r => r.status === 'Absent').length;

    // Calculate total OT hours
    const totalOtHours = filteredRecords.reduce((sum, record) => {
      // If otHours is available in the record, add it to the sum
      // Otherwise, add 0
      return sum + (record.otHours || 0);
    }, 0);

    return {
      total,
      present,
      partial,
      leave,
      absent,
      otHours: totalOtHours.toFixed(1)
    };
  }, [filteredRecords, employees.length]);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await api.get("/employees/getAllEmployees");
        setEmployees(res.data.employees || []);
      } catch (err) {
        // Silently handle error
      }
    }

    fetchEmployees();
  }, []);

  // Remove the useEffect for regular punches since we're always using night shift mode

  // Always fetch daily attendance using the night shift endpoint
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    const fetchDailyAttendance = async () => {
      try {
        const dateStr = selectedDate.toISOString().slice(0, 10);
        const res = await api.get(`/punch/daily-attendance?date=${dateStr}`);
        setDailyAttendance(res.data.data || []);
      } catch (err) {
        setDailyAttendance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDailyAttendance();
  }, [selectedDate]);

  // Remove the useEffect for processing regular punches since we're always using night shift mode

  const handleDeletePunch = async (punchId: string) => {
    try {
      // Make sure we're using the correct API endpoint
      await api.delete(`/punch/${punchId}`);
      toast.success("Punch deleted successfully");

      // Refresh the data after deletion
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().slice(0, 10);
        // Always refresh daily attendance data (night shift mode)
        const res = await api.get(`/punch/daily-attendance?date=${dateStr}`);
        setDailyAttendance(res.data.data || []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete punch");
    }
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

  // PDF export function with image support and pagination
  const exportTableToPDF = async (): Promise<void> => {
    try {

      if (filteredRecords.length === 0) {
        toast.error("No records to export");
        return;
      }

      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      // Split records into pages (9 on first page, 12 on subsequent pages)
      const pages: any[][] = [];

      // First page: 9 rows
      const firstPageRecords = filteredRecords.slice(0, 8);
      if (firstPageRecords.length > 0) {
        pages.push(firstPageRecords);
      }

      // Subsequent pages: 12 rows each
      const remainingRecords = filteredRecords.slice(8);
      for (let i = 0; i < remainingRecords.length; i += 10) {
        const pageRecords = remainingRecords.slice(i, i + 10);
        if (pageRecords.length > 0) {
          pages.push(pageRecords);
        }
      }

      // Create separate HTML content for each page
      const pageContents = pages.map((pageRecords: any[], pageIndex: number) => {
        // Only include the heading on the first page
        const headingContent = pageIndex === 0 ? `
          <h1 style="text-align: center; color: #8B0000;">ATITHI LLP - Attendance Report</h1>
          <p style="text-align: center;">Date: ${selectedDate ? selectedDate.toLocaleDateString() : 'All Dates'}</p>
          <p style="text-align: center; font-size: 12px;">Generated: ${new Date().toLocaleString()}</p>
        ` : ``;

        return `
          <div style="font-family: Arial, sans-serif; padding: 20px; page-break-after: ${pageIndex < pages.length - 1 ? 'always' : 'auto'};">
            ${headingContent}
            <p style="text-align: right; font-size: 12px;">Page ${pageIndex + 1} of ${pages.length}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 8px;">Employee</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Department</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Check In</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Check Out</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${pageRecords.map((record: any) => {
          return `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">${record.name || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${record.department || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${record.checkIn || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${record.checkOut || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${record.status || 'N/A'}</td>
                    </tr>
                  `;
        }).join('')}
              </tbody>
            </table>
          </div>
        `;
      });

      // Combine all pages into one HTML document
      const htmlContent = pageContents.join('');

      // Generate PDF directly from HTML string with pagination
      await html2pdf()
        .set({
          margin: 0.5,
          filename: `attendance-${selectedDate ? selectedDate.toISOString().slice(0, 10) : 'all'}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 15000
          },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        })
        .from(htmlContent)
        .save();

      toast.success(`PDF exported successfully!`);
    } catch (error) {
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  // Dedicated function for downloading with images emphasis
  const downloadWithImages = async (): Promise<void> => {
    toast.info("Preparing download with images...", {
      description: "Converting images and generating PDF report"
    });

    await exportTableToPDF();

    toast.success("Download with images completed!", {
      description: "PDF includes all available punch images"
    });
  };

  // New function to download images in a grid format (3 per row)
  const downloadImagesGrid = async (): Promise<void> => {
    try {
      if (filteredRecords.length === 0) {
        toast.error("No records to export");
        return;
      }

      // Filter records with images
      const recordsWithImages = filteredRecords.filter(record => record.imageUrl);

      if (recordsWithImages.length === 0) {
        toast.error("No records with images to export");
        return;
      }

      // Show initial loading toast
      const loadingToast = toast.loading("Preparing image grid PDF...", {
        description: "Converting images and generating PDF report"
      });

      // Dynamically import html2pdf - moved outside of try/catch to ensure it loads properly
      let html2pdf;
      try {
        html2pdf = (await import('html2pdf.js')).default;
      } catch (importError) {
        toast.dismiss(loadingToast);
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
          id: loadingToast,
          description: `Processed ${processed} of ${recordsWithImages.length} images`
        });
      }

      const recordsWithBase64 = results;
      const successfulConversions = recordsWithBase64.filter(r => r.base64Image).length;
      const failedConversions = recordsWithBase64.length - successfulConversions;

      // Even if some images failed, we'll still include the successful ones
      if (successfulConversions === 0) {
        toast.dismiss(loadingToast);
        toast.error("No images could be converted. Please check image URLs and try again.");
        return;
      }

      // Update loading toast
      toast.loading("Generating PDF...", {
        id: loadingToast,
        description: `Successfully converted ${successfulConversions} images, creating PDF`
      });

      // Create HTML content with images in a 3-column grid
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
                <div style="color: #555; margin-bottom: 1px;">${record.designation || 'N/A'}</div>
                <div style="color: #555; margin-bottom: 1px; font-weight: 500;">${record.empId || 'N/A'}</div>
                <div style="color: #777; font-style: italic; font-size: 11px;">${record.department || 'N/A'}</div>
              </div>
            </div>
          `;
        }

        // Add page to document
        pagesHtml += `
          <div style="page-break-after: ${pageNum < totalPages - 1 ? 'always' : 'auto'};">
            ${pageNum === 0 ? `
            <h1 style="text-align: center; color: #8B0000; font-size: 24px; margin-bottom: 8px;">ATITHI LLP - Attendance Photos</h1>
            <p style="text-align: center; font-size: 16px; margin-bottom: 4px;">Date: ${selectedDate ? selectedDate.toLocaleDateString() : 'All Dates'}</p>
            <p style="text-align: center; font-size: 12px; color: #666; margin-bottom: 4px;">Generated: ${new Date().toLocaleString()}</p>
            <p style="text-align: center; font-size: 16px; margin-bottom: 20px; font-weight: bold;">
              Total Images: ${successfulConversions}${failedConversions > 0 ? ` (${failedConversions} failed to load)` : ''}
            </p>
            ` : `
            <h2 style="text-align: center; color: #8B0000; font-size: 18px; margin-bottom: 15px;">
              Attendance Photos (Page ${pageNum + 1} of ${totalPages})
            </h2>
            <p style="text-align: center; font-size: 14px; margin-bottom: 15px;">Date: ${selectedDate ? selectedDate.toLocaleDateString() : 'All Dates'}</p>
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
          filename: `attendance-images-grid-${selectedDate ? selectedDate.toISOString().slice(0, 10) : 'all'}.pdf`,
          image: { type: 'jpeg', quality: 0.7 }, // Reduced quality for better performance
          html2canvas: {
            scale: 2, // Scale for better image quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 20000, // Increased timeout
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

      toast.dismiss(loadingToast);
      toast.success(`Image grid PDF exported successfully! Images: ${successfulConversions} converted${failedConversions > 0 ? `, ${failedConversions} failed` : ''}`);
    } catch (error) {
      toast.error("Failed to export image grid PDF. Please try again.");
    }
  };

  const departments = ["All", ...Array.from(new Set(employees.map(emp => emp.department).filter((dept): dept is string => Boolean(dept))))];
  const designations = ["All", ...Array.from(new Set(employees.map(emp => emp.designation).filter((desig): desig is string => Boolean(desig))))];

  // Add the getStatusBadge function
  const getStatusBadge = (status: string, leaveReason?: string) => {
    switch (status) {
      case "Present":
        return <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case "IN Only":
        return <Badge className="bg-orange-500 hover:bg-orange-600">IN Only</Badge>;
      case "OUT Only":
        return <Badge className="bg-orange-500 hover:bg-orange-600">OUT Only</Badge>;
      case "On Leave":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600" title={leaveReason}>
            On Leave{leaveReason ? `: ${leaveReason}` : ""}
          </Badge>
        );
      case "Absent":
        return <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>;
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Attendance Management</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Daily Attendance</h2>
            <p className="text-muted-foreground">Monitor and manage employee attendance records</p>
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
              disabled={!selectedDate}
              estimatedTime="2-3 seconds"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg"
            >
              Export PDF
            </EnhancedExportButton>
            {/* New button for downloading images in grid format */}
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

        {/* Statistics Cards */}
        <StatisticsCards stats={stats} />

        {/* Filters Section */}
        {showFilters && (
          <Filters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={filters}
            setFilters={setFilters}
            departments={departments}
            designations={designations}
          />
        )}

        {/* Date Selection */}
        <DateSelector
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {selectedDate ? `Showing records for ${selectedDate.toLocaleDateString()}` : "Select a date to view records"}
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
  )
}