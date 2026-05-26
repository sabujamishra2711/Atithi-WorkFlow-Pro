"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SidebarInset } from "@/components/ui/sidebar";
import { TimePicker } from "@/components/ui/time-picker";
import { HourMinuteSelector } from "@/components/ui/hour-minute-selector";
import { Calendar, Save, User, Clock, Check, RefreshCw, Search, Download, ChevronDown, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from 'axios';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";

interface Session {
  sessionId: number | null;
  employeeId: string;
  inTime: string | null;
  outTime: string | null;
  inTimeFormatted: string | null;
  outTimeFormatted: string | null;
  status: string;
  punchStatus: string;
  isNightShift: boolean;
  isNightShiftSelected?: boolean;
  date: string;
}

interface Employee {
  empId: string;
  firstName: string;
  lastName: string;
  department?: string;
}

interface LeaveApplication {
  _id: string;
  empId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

// Determine the base URL based on the environment
const getBaseURL = () => {
  // Always use the full API URL regardless of environment
  // In production, this should be set to the actual domain
  // In development, this defaults to localhost
  return process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ?
      `${window.location.origin}/api/v1` :
      'http://localhost:8000/api/v1');
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const today = new Date();

export default function ManualMonthlyAttendancePage() {
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [employeeExists, setEmployeeExists] = useState(true);
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const isFutureMonth = (year > today.getFullYear()) || (year === today.getFullYear() && month > today.getMonth() + 1);

  // Create axios instance with base URL
  const apiClient = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
  });

  // Fetch employees for dropdown
  useEffect(() => {
    apiClient.get(`/employees/getAllEmployees`)
      .then((res: any) => {
        if (res.data.success) {
          setEmployees(res.data.employees || []);
        } else {
          setEmployees([]);
        }
      })
      .catch((err: any) => {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      });
  }, []);

  // Fetch leave applications when employeeId, year, or month changes
  useEffect(() => {
    if (!employeeId || !employeeExists) {
      setLeaveApplications([]);
      return;
    }

    apiClient.get(`/leave/applications`, {
      params: {
        empId: employeeId,
        year: year,
        month: month
      }
    })
      .then((res: any) => {
        if (res.data.success) {
          setLeaveApplications(res.data.data || []);
        } else {
          setLeaveApplications([]);
        }
      })
      .catch((err: any) => {
        console.error('Error fetching leave applications:', err);
        setLeaveApplications([]);
      });
  }, [employeeId, year, month, employeeExists]);

  // Fetch sessions when employeeId, year, or month changes
  useEffect(() => {
    if (!employeeId || !employeeExists) return;
    setLoading(true);
    apiClient.get(`/punch/session/${employeeId}/${year}/${month}`)
      .then((res: any) => {
        setEmployeeExists(true);

        let sessionData: any[] = [];
        if (res.data && res.data.data && Array.isArray(res.data.data)) {
          sessionData = res.data.data;
        } else {
          sessionData = [];
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const allSessions = Array.from({ length: daysInMonth }, (_, i) => {
          const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
          const dateStr = currentDate.toISOString().split('T')[0];
          const existingSession = sessionData.find((session: any) => session.date === dateStr);

          if (existingSession) {
            let inTimeFormatted = null;
            let outTimeFormatted = null;

            if (existingSession.inTime) {
              const inTimeDate = new Date(existingSession.inTime);
              inTimeFormatted = `${inTimeDate.getHours().toString().padStart(2, '0')}:${inTimeDate.getMinutes().toString().padStart(2, '0')}`;
            }

            if (existingSession.outTime) {
              const outTimeDate = new Date(existingSession.outTime);
              outTimeFormatted = `${outTimeDate.getHours().toString().padStart(2, '0')}:${outTimeDate.getMinutes().toString().padStart(2, '0')}`;
            }

            return {
              sessionId: existingSession.sessionId || null,
              employeeId: existingSession.employeeId || employeeId,
              inTime: existingSession.inTime || null,
              outTime: existingSession.outTime || null,
              inTimeFormatted: inTimeFormatted,
              outTimeFormatted: outTimeFormatted,
              status: existingSession.status || "Absent",
              punchStatus: existingSession.punchStatus || "Absent",
              isNightShift: existingSession.isNightShift || false,
              isNightShiftSelected: existingSession.isNightShiftSelected !== undefined ? existingSession.isNightShiftSelected : (existingSession.isNightShift || false),
              date: dateStr
            };
          } else {
            return {
              sessionId: null,
              employeeId: employeeId,
              inTime: null,
              outTime: null,
              inTimeFormatted: null,
              outTimeFormatted: null,
              status: "Absent",
              punchStatus: "Absent",
              isNightShift: false,
              isNightShiftSelected: false,
              date: dateStr
            };
          }
        });

        setSessions(allSessions);
      })
      .catch((err: any) => {
        console.error('Error fetching sessions:', err);
        if (err.response?.status === 404) {
          setEmployeeExists(false);
          const daysInMonth = new Date(year, month, 0).getDate();
          const emptySessions = Array.from({ length: daysInMonth }, (_, i) => {
            const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
            return {
              sessionId: null,
              employeeId: employeeId,
              inTime: null,
              outTime: null,
              inTimeFormatted: null,
              outTimeFormatted: null,
              status: "Absent",
              punchStatus: "Absent",
              isNightShift: false,
              isNightShiftSelected: false,
              date: currentDate.toISOString().split('T')[0]
            };
          });
          setSessions(emptySessions);
          toast({
            title: "Employee not found",
            description: "The employee ID you entered does not exist.",
            variant: "destructive",
          });
        } else {
          const daysInMonth = new Date(year, month, 0).getDate();
          const emptySessions = Array.from({ length: daysInMonth }, (_, i) => {
            const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
            return {
              sessionId: null,
              employeeId: employeeId,
              inTime: null,
              outTime: null,
              inTimeFormatted: null,
              outTimeFormatted: null,
              status: "Absent",
              punchStatus: "Absent",
              isNightShift: false,
              isNightShiftSelected: false,
              date: currentDate.toISOString().split('T')[0]
            };
          });
          setSessions(emptySessions);
          setEmployeeExists(true);
        }
      })
      .finally(() => setLoading(false));
  }, [employeeId, year, month, employeeExists]);

  const handleSessionChange = (idx: number, field: keyof Session, value: string | boolean) => {
    const newSessions = [...sessions];

    if (field === "isNightShiftSelected") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === "true" || value === true };
    } else if (field === "inTimeFormatted") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === null ? null : value as string };
    } else if (field === "outTimeFormatted") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === null ? null : value as string };
    } else if (field === "punchStatus") {
      newSessions[idx] = { ...newSessions[idx], [field]: value as string };

      if (value === "In Only") {
        newSessions[idx] = {
          ...newSessions[idx],
          status: "OPEN"
        };
      } else {
        newSessions[idx] = {
          ...newSessions[idx],
          status: "CLOSED"
        };
      }

      if (value === "Absent") {
        newSessions[idx] = {
          ...newSessions[idx],
          inTime: null,
          outTime: null,
          inTimeFormatted: null,
          outTimeFormatted: null,
          isNightShift: false,
          isNightShiftSelected: false
        };
      }
      else if ((value === "Present" || value === "In Only") && newSessions[idx].status === "Leave") {
        newSessions[idx] = {
          ...newSessions[idx],
          status: value === "In Only" ? "OPEN" : "CLOSED"
        };
      }
    } else {
      newSessions[idx] = { ...newSessions[idx], [field]: value };
    }

    setSessions(newSessions);
  };

  const handleSave = async () => {
    setSaving(true);
    const sessionsToSave = sessions.map(session => {
      if (session.punchStatus === "Absent") {
        return {
          ...session,
          inTime: null,
          outTime: null,
          isNightShift: false
        };
      }

      let inTimeUtc = null;
      let outTimeUtc = null;

      if (session.inTimeFormatted) {
        let timeValue = session.inTimeFormatted;
        if (timeValue.includes(" ")) {
          timeValue = timeValue.split(" ")[0];
        }

        if (/^\d{1,2}:\d{2}$/.test(timeValue)) {
          const dateParts = session.date.split('-').map(Number);
          if (dateParts.length === 3 && dateParts.every((part: any) => !isNaN(part))) {
            const [year, month, dayNum] = dateParts;
            const [hour, minute] = timeValue.split(':').map(Number);
            const localIn = new Date(year, month - 1, dayNum, hour, minute);

            if (!isNaN(localIn.getTime())) {
              inTimeUtc = localIn.toISOString();
            } else {
              console.error('Invalid inTime date for session:', session);
            }
          } else {
            console.error('Invalid date format for session:', session);
          }
        }
      }

      if (session.outTimeFormatted) {
        let timeValue = session.outTimeFormatted;
        if (timeValue.includes(" ")) {
          timeValue = timeValue.split(" ")[0];
        }

        if (/^\d{1,2}:\d{2}$/.test(timeValue)) {
          let dateParts: any[];
          if (session.date && session.date.includes('-')) {
            dateParts = session.date.split('-').map(Number);
          } else if (session.inTime) {
            const inTimeDate = new Date(session.inTime);
            dateParts = [inTimeDate.getFullYear(), inTimeDate.getMonth() + 1, inTimeDate.getDate()];
          } else {
            console.error('Unable to determine date for session:', session);
            return {
              ...session,
              inTime: inTimeUtc,
              outTime: outTimeUtc,
              isNightShift: session.isNightShiftSelected || session.isNightShift || false,
              status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED"
            };
          }

          if (dateParts.length === 3 && dateParts.every((part: any) => !isNaN(part))) {
            const [year, month, dayNum] = dateParts;
            const [hour, minute] = timeValue.split(':').map(Number);
            let localOut = new Date(year, month - 1, dayNum, hour, minute);

            if (!isNaN(localOut.getTime())) {
              if (session.inTimeFormatted || inTimeUtc) {
                let inTimeValue = session.inTimeFormatted;
                if (inTimeValue && inTimeValue.includes(" ")) {
                  inTimeValue = inTimeValue.split(" ")[0];
                }

                if (inTimeValue && /^\d{1,2}:\d{2}$/.test(inTimeValue)) {
                  const [inHour] = inTimeValue.split(':').map(Number);
                  if ((inHour >= 16 && hour <= 8) || session.isNightShiftSelected) {
                    localOut.setDate(localOut.getDate() + 1);
                  }
                }
              }

              outTimeUtc = localOut.toISOString();
            } else {
              console.error('Invalid outTime date for session:', session);
            }
          } else {
            console.error('Invalid date format for session:', session);
          }
        }
      }

      return {
        ...session,
        inTime: inTimeUtc,
        outTime: outTimeUtc,
        isNightShift: session.isNightShiftSelected || session.isNightShift || false,
        status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED"
      };
    });

    try {
      const validSessions = sessionsToSave.filter(session => {
        if (!session.employeeId) {
          console.error('Session missing employeeId:', session);
          return false;
        }

        if (session.punchStatus === "Present" && (!session.inTime || !session.outTime)) {
          console.error('Present session missing inTime or outTime:', session);
          return false;
        }

        if (session.punchStatus === "In Only" && !session.inTime) {
          console.error('In Only session missing inTime:', session);
          return false;
        }

        if (session.inTime && isNaN(Date.parse(session.inTime))) {
          console.error('Invalid inTime format:', session.inTime);
          return false;
        }

        if (session.outTime && isNaN(Date.parse(session.outTime))) {
          console.error('Invalid outTime format:', session.outTime);
          return false;
        }

        return true;
      });

      if (validSessions.length === 0) {
        console.warn('No valid sessions to save');
        toast({
          title: "No valid data",
          description: "No valid attendance data to save. Please check your entries.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const response = await apiClient.put(`/punch/session/manual`,
        { sessions: validSessions }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: response.data.message || "Attendance saved successfully",
        });
      } else if (response.status === 207) {
        toast({
          title: "Partial Success",
          description: response.data.message || "Some attendance records were saved successfully",
        });

        if (response.data.errors && response.data.errors.length > 0) {
          console.error('Save errors:', response.data.errors);
        }
      }

      if (employeeId) {
        const res = await apiClient.get(`/punch/session/${employeeId}/${year}/${month}`);

        let sessionData: any[] = [];
        if (res.data && res.data.data && Array.isArray(res.data.data)) {
          sessionData = res.data.data;
        } else {
          sessionData = [];
        }

        const formattedSessions = sessionData.map((session: any) => {
          let inTimeFormatted = null;
          let outTimeFormatted = null;

          if (session.inTime) {
            const inTimeDate = new Date(session.inTime);
            inTimeFormatted = `${inTimeDate.getHours().toString().padStart(2, '0')}:${inTimeDate.getMinutes().toString().padStart(2, '0')}`;
          }

          if (session.outTime) {
            const outTimeDate = new Date(session.outTime);
            outTimeFormatted = `${outTimeDate.getHours().toString().padStart(2, '0')}:${outTimeDate.getMinutes().toString().padStart(2, '0')}`;
          }

          return {
            sessionId: session.sessionId,
            employeeId: session.employeeId,
            inTime: session.inTime,
            outTime: session.outTime,
            inTimeFormatted: inTimeFormatted,
            outTimeFormatted: outTimeFormatted,
            status: session.status,
            punchStatus: session.punchStatus,
            isNightShift: session.isNightShift,
            isNightShiftSelected: session.isNightShiftSelected !== undefined ? session.isNightShiftSelected : (session.isNightShift || false),
            date: session.date
          };
        });
        setSessions(formattedSessions);
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);

      let errorMessage = 'Failed to save attendance';
      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = err.response.data.error || 'Invalid data format. Please check your entries.';
        } else if (err.response.status === 404) {
          errorMessage = 'Employee not found.';
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message || 'Unknown error occurred.';
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (!employeeSearchTerm) return true;

    const term = employeeSearchTerm.toLowerCase().trim();
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
    return (
      e.empId.toLowerCase().includes(term) ||
      fullName.includes(term) ||
      (e.department && e.department.toLowerCase().includes(term))
    );
  });

  const getProfileImageUrl = (employee: any) => {
    if (employee?.profileImage) {
      if (employee.profileImage.startsWith('http')) {
        return employee.profileImage;
      } else {
        const baseUrl = process.env.NODE_ENV === 'production'
          ? 'https://atithi-workflow-pro.onrender.com'
          : 'http://localhost:8000';
        return `${baseUrl}${employee.profileImage}?t=${Date.now()}`;
      }
    }
    return "/placeholder-user.jpg";
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setEmployeeId(employee.empId);
    setEmployeeExists(true);
    setEmployeeSelectorOpen(false);
    setEmployeeSearchTerm("");
  };

  const clearEmployeeSelection = () => {
    setEmployeeId("");
    setEmployeeExists(true);
  };

  const hasLeaveApplication = (date: string) => {
    return leaveApplications.some(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const checkDate = new Date(date);
      return leave.status === "Approved" &&
        checkDate >= startDate &&
        checkDate <= endDate;
    });
  };

  const minYear = today.getFullYear() - 2;
  const maxYear = today.getFullYear();
  const allowedMonths = (y: number) => {
    if (y < today.getFullYear()) return months.map((m, i) => ({ name: m, value: i + 1 }));
    return months.slice(0, today.getMonth() + 1).map((m, i) => ({ name: m, value: i + 1 }));
  };

  const refreshAttendanceData = async () => {
    if (!employeeId || !employeeExists) return;

    setLoading(true);
    try {
      const res = await apiClient.get(`/punch/session/${employeeId}/${year}/${month}`);

      let sessionData: any[] = [];
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        sessionData = res.data.data;
      } else {
        sessionData = [];
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const allSessions = Array.from({ length: daysInMonth }, (_, i) => {
        const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingSession = sessionData.find((session: any) => session.date === dateStr);

        if (existingSession) {
          let inTimeFormatted = null;
          let outTimeFormatted = null;

          if (existingSession.inTime) {
            const inTimeDate = new Date(existingSession.inTime);
            inTimeFormatted = `${inTimeDate.getHours().toString().padStart(2, '0')}:${inTimeDate.getMinutes().toString().padStart(2, '0')}`;
          }

          if (existingSession.outTime) {
            const outTimeDate = new Date(existingSession.outTime);
            outTimeFormatted = `${outTimeDate.getHours().toString().padStart(2, '0')}:${outTimeDate.getMinutes().toString().padStart(2, '0')}`;
          }

          return {
            sessionId: existingSession.sessionId || null,
            employeeId: existingSession.employeeId || employeeId,
            inTime: existingSession.inTime || null,
            outTime: existingSession.outTime || null,
            inTimeFormatted: inTimeFormatted,
            outTimeFormatted: outTimeFormatted,
            status: existingSession.status || "Absent",
            punchStatus: existingSession.punchStatus || "Absent",
            isNightShift: existingSession.isNightShift || false,
            isNightShiftSelected: existingSession.isNightShiftSelected !== undefined ? existingSession.isNightShiftSelected : (existingSession.isNightShift || false),
            date: dateStr
          };
        } else {
          return {
            sessionId: null,
            employeeId: employeeId,
            inTime: null,
            outTime: null,
            inTimeFormatted: null,
            outTimeFormatted: null,
            status: "Absent",
            punchStatus: "Absent",
            isNightShift: false,
            isNightShiftSelected: false,
            date: dateStr
          };
        }
      });

      setSessions(allSessions);
      toast({
        title: "Refreshed",
        description: "Attendance data has been refreshed successfully.",
      });
    } catch (err: any) {
      console.error('Error refreshing sessions:', err);
      toast({
        title: "Error",
        description: "Failed to refresh attendance data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee first",
        variant: "destructive",
      });
      return;
    }

    setExportingPdf(true);
    try {
      const employee = employees.find(e => e.empId === employeeId);
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : employeeId;

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const pdfData = {
        employeeId,
        employeeName,
        year,
        month,
        monthName: monthNames[month - 1],
        attendance: sessions.map(session => {
          const sessionDate = new Date(session.date);
          return {
            date: session.date,
            day: sessionDate.getDate(),
            punchStatus: session.punchStatus,
            inTime: session.inTimeFormatted || null,
            outTime: session.outTimeFormatted || null,
            isNightShift: session.isNightShiftSelected !== undefined ? session.isNightShiftSelected : (session.isNightShift || false)
          };
        })
      };

      const response = await apiClient.post(`/punch/monthly/manual/${employeeId}/${year}/${month}/pdf`,
        { data: pdfData },
        {
          responseType: 'blob'
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = `manual-attendance-${employeeId}-${year}-${month}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Manual Monthly Attendance</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Manual Attendance Entry</h2>
            <p className="text-muted-foreground mt-2">Enter and manage monthly attendance records for employees</p>
          </div>
          <div className="hidden md:block">
            <Calendar className="h-12 w-12 text-primary/20" />
          </div>
        </div>

        {/* Selection Card */}
        <Card className="attendance-card">
          <CardHeader className="bg-gray-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              Employee & Period Selection
            </CardTitle>
            <CardDescription>Select an employee and the month/year for attendance entry</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Employee Search Dropdown */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="employee-search">Employee Search</Label>
                <div className="relative">
                  <Popover open={employeeSelectorOpen} onOpenChange={setEmployeeSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between pl-3 pr-2 h-10"
                      >
                        {employeeId ? (
                          <div className="flex items-center gap-2 w-full">
                            <img
                              src={employees.find(e => e.empId === employeeId) ? getProfileImageUrl(employees.find(e => e.empId === employeeId)) : "/placeholder-user.jpg"}
                              className="w-6 h-6 rounded-full border border-blue-100 bg-gray-100 object-cover"
                            />
                            <span className="flex-1 text-left truncate">
                              {employees.find(e => e.empId === employeeId)?.firstName} {employees.find(e => e.empId === employeeId)?.lastName}
                            </span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {employeeId}
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
                            filteredEmployees.map((emp) => (
                              <CommandItem
                                key={emp.empId}
                                onSelect={() => handleEmployeeSelect(emp)}
                                className="flex items-center gap-2"
                              >
                                <img
                                  src={getProfileImageUrl(emp)}
                                  className="w-8 h-8 rounded-full border border-blue-100 bg-gray-100 object-cover"
                                />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {emp.firstName} {emp.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex justify-between">
                                    <span>{emp.empId}</span>
                                    <span>{emp.department || 'N/A'}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {employeeId && (
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
              </div>

              {/* Date Selector */}
              <div className="space-y-2">
                <Label>Period Selection</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={year.toString()} onValueChange={(value) => {
                      const newYear = Number(value);
                      setYear(newYear);
                      if (newYear === today.getFullYear() && month > today.getMonth() + 1) {
                        setMonth(today.getMonth() + 1);
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Select value={month.toString()} onValueChange={(value) => setMonth(Number(value))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedMonths(year).map(({ name, value }) => (
                          <SelectItem key={name} value={value.toString()}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {employeeId && employeeExists && (
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleExportPdf}
                  disabled={exportingPdf || isFutureMonth}
                  className="min-w-[140px] shadow-sm hover:shadow-md transition-shadow"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingPdf ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Table Card */}
        {loading ? (
          <Card className="attendance-card">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Loading attendance data...</p>
              </div>
            </CardContent>
          </Card>
        ) : employeeId && employeeExists ? (
          <Card className="attendance-card">
            <CardHeader className="bg-gray-50 rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    Monthly Attendance Calendar
                  </CardTitle>
                  <CardDescription>
                    {employeeId ? `Attendance records for ${months[month - 1]} ${year}` : 'Select an employee to view attendance'}
                  </CardDescription>
                </div>
                <Button
                  onClick={refreshAttendanceData}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="font-bold text-gray-700">Date</TableHead>
                      <TableHead className="font-bold text-gray-700">Status</TableHead>
                      <TableHead className="font-bold text-gray-700">Check In</TableHead>
                      <TableHead className="font-bold text-gray-700">Check Out</TableHead>
                      <TableHead className="font-bold text-gray-700">Night Shift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session, idx) => {
                      const sessionDate = new Date(session.date);
                      const isFuture = sessionDate > today || isFutureMonth;
                      const hasLeave = hasLeaveApplication(session.date);

                      return (
                        <TableRow
                          key={`${session.sessionId || 'null'}-${session.date}-${idx}`}
                          className={`
                            ${isFuture ? "bg-muted/50" : ""}
                            ${hasLeave ? "bg-yellow-50 hover:bg-yellow-100" : ""}
                            ${session.punchStatus === "Present" ? "bg-green-50 hover:bg-green-100" : ""}
                            ${session.punchStatus === "Absent" ? "bg-red-50 hover:bg-red-100" : ""}
                            ${session.punchStatus === "In Only" ? "bg-blue-50 hover:bg-blue-100" : ""}
                            border-b border-gray-100
                          `}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{new Date(session.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}</span>
                              {hasLeave && (
                                <Badge variant="secondary" className="text-xs">
                                  Leave
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.status === "Leave" ? (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                                On Leave
                              </Badge>
                            ) : (
                              <Select
                                value={session.punchStatus === "Present" || session.punchStatus === "Absent" || session.punchStatus === "In Only" ? session.punchStatus : "Absent"}
                                onValueChange={(value) => handleSessionChange(idx, "punchStatus", value)}
                                disabled={isFuture || hasLeave}
                              >
                                <SelectTrigger className="w-28 status-select-trigger">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present">Present</SelectItem>
                                  <SelectItem value="Absent">Absent</SelectItem>
                                  <SelectItem value="In Only">In Only</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <HourMinuteSelector
                              value={session.inTimeFormatted}
                              onChange={(value) => handleSessionChange(idx, "inTimeFormatted", value || "")}
                              disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture || hasLeave}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <HourMinuteSelector
                                value={session.outTimeFormatted}
                                onChange={(value) => handleSessionChange(idx, "outTimeFormatted", value || "")}
                                disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture || hasLeave}
                                className="w-32"
                              />
                              {session.sessionId && (
                                <span className="ml-2 text-green-600" title={`Session ID: ${session.sessionId}`}>
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={session.isNightShiftSelected !== undefined ? session.isNightShiftSelected : (session.isNightShift || false)}
                                onChange={(e) => handleSessionChange(idx, "isNightShiftSelected", e.target.checked.toString())}
                                disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture || hasLeave}
                                className="h-5 w-5 night-shift-checkbox"
                              />
                              {(session.isNightShift || session.isNightShiftSelected) && (
                                <span className="ml-2 text-sm text-muted-foreground">(Night Shift)</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : employeeId && !employeeExists ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-destructive font-medium">Employee not found. Please enter a valid employee ID.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Select an employee to view attendance</p>
              </div>
            </CardContent>
          </Card>
        )}

        {employeeId && employeeExists && (
          <div className="flex justify-end pt-4 gap-2">
            <Button
              onClick={handleExportPdf}
              disabled={exportingPdf || isFutureMonth}
              variant="outline"
              className="min-w-[140px] shadow-sm hover:shadow-md transition-shadow"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportingPdf ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || isFutureMonth}
              className="min-w-[140px] shadow-sm hover:shadow-md transition-shadow"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}