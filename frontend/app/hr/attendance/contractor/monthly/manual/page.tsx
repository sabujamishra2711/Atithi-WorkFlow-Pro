"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SidebarInset } from "@/components/ui/sidebar";
import { HourMinuteSelector } from "@/components/ui/hour-minute-selector";
import { Calendar, Save, User, Clock, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from 'axios'; // Import axios directly

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

interface Contractor {
  _id: string;
  name: string;
}

interface ContractorEmployee {
  contractorEmployeeId: string;
  employeeName: string;
  contractorId: string;
  contractorName: string;
}

interface Session {
  sessionId: number | null;
  contractorId: string;
  contractorEmployeeId: string;
  employeeName: string;
  inTime: string | null;
  outTime: string | null;
  inTimeFormatted: string | null;
  outTimeFormatted: string | null;
  punchStatus: string;
  status: string;
  isNightShift: boolean;
  isNightShiftSelected?: boolean;
  date: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ContractorManualMonthlyAttendancePage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorEmployees, setContractorEmployees] = useState<ContractorEmployee[]>([]);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeExists, setEmployeeExists] = useState(true);

  // Today's date for future checks
  const today = new Date();
  const isFutureMonth = (year > today.getFullYear()) || (year === today.getFullYear() && month > today.getMonth() + 1);

  // Fetch contractors for dropdown
  useEffect(() => {
    async function fetchContractors() {
      try {
        const res = await api.get("/contractors"); // Using direct axios instance
        // Handle different response formats
        let contractorsData: Contractor[] = [];
        if (Array.isArray(res.data)) {
          contractorsData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          contractorsData = res.data.data;
        } else if (res.data && res.data.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
          contractorsData = Array.isArray(res.data.data) ? res.data.data : [];
        }

        // Ensure contractorsData is an array
        const validContractors = Array.isArray(contractorsData) ? contractorsData : [];
        setContractors(validContractors);
      } catch (err) {
        console.error("Error fetching contractors", err);
        toast.error("Failed to load contractors");
        setContractors([]);
      }
    }

    fetchContractors();
  }, []);

  // Fetch contractor employees when contractor is selected
  useEffect(() => {
    async function fetchContractorEmployees() {
      if (!selectedContractor) {
        setContractorEmployees([]);
        return;
      }

      try {
        const res = await api.get("/punch/contractor/employees", { // Using direct axios instance
          params: {
            contractorId: selectedContractor
          }
        });

        // Handle different response formats for employees
        let employeesData: any[] = [];
        if (Array.isArray(res.data)) {
          employeesData = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          employeesData = res.data.data;
        } else if (res.data && res.data.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
          employeesData = Array.isArray(res.data.data) ? res.data.data : [];
        }

        // Ensure employeesData is an array
        const validEmployees = Array.isArray(employeesData) ? employeesData : [];

        // Add contractor info to each employee
        const employeesWithContractorInfo = validEmployees.map((emp: any) => ({
          ...emp,
          contractorId: selectedContractor,
          contractorName: contractors.find(c => c._id === selectedContractor)?.name || ""
        }));

        setContractorEmployees(employeesWithContractorInfo);
      } catch (err) {
        console.error(`Error fetching employees for contractor ${selectedContractor}:`, err);
        toast.error("Failed to load contractor employees");
        setContractorEmployees([]);
      }
    }

    fetchContractorEmployees();
  }, [selectedContractor, contractors]);

  // Fetch sessions when employee, year, or month changes
  useEffect(() => {
    if (!selectedEmployee || !selectedContractor) return;
    setLoading(true);

    api.get(`/punch/contractor/detailed`, { // Using direct axios instance
      params: {
        contractorId: selectedContractor,
        contractorEmployeeId: selectedEmployee,
        month: `${year}-${String(month).padStart(2, "0")}`
      }
    })
      .then(res => {
        // Reset employee existence status on successful fetch
        setEmployeeExists(true);

        // Handle response format - sessions are in res.data.data or res.data
        let sessionData: any[] = [];
        if (res.data && Array.isArray(res.data)) {
          sessionData = res.data;
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          sessionData = res.data.data;
        } else {
          sessionData = [];
        }

        // Generate sessions for all days of the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const allSessions = Array.from({ length: daysInMonth }, (_, i) => {
          // Create date for current day (i+1 because days are 1-indexed)
          const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
          const dateStr = currentDate.toISOString().split('T')[0];

          // Check if we have existing session data for this date
          const existingSession = sessionData.find((session: any) => {
            const sessionDate = new Date(session.inTime);
            return sessionDate.toISOString().split('T')[0] === dateStr;
          });

          if (existingSession) {
            // Format time values properly
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

            // Use existing session data
            return {
              sessionId: existingSession.sessionId || null,
              contractorId: existingSession.contractorId || selectedContractor,
              contractorEmployeeId: existingSession.contractorEmployeeId || selectedEmployee,
              employeeName: existingSession.employeeName || contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName || "",
              inTime: existingSession.inTime || null,
              outTime: existingSession.outTime || null,
              inTimeFormatted: inTimeFormatted,
              outTimeFormatted: outTimeFormatted,
              punchStatus: existingSession.punchStatus || "Absent",
              status: existingSession.status || "CLOSED",
              isNightShift: existingSession.isNightShift || false,
              isNightShiftSelected: existingSession.isNightShiftSelected !== undefined ? existingSession.isNightShiftSelected : (existingSession.isNightShift || false),
              date: dateStr
            };
          } else {
            // Create empty session for this date
            return {
              sessionId: null,
              contractorId: selectedContractor,
              contractorEmployeeId: selectedEmployee,
              employeeName: contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName || "",
              inTime: null,
              outTime: null,
              inTimeFormatted: null,
              outTimeFormatted: null,
              punchStatus: "Absent",
              status: "CLOSED",
              isNightShift: false,
              isNightShiftSelected: false,
              date: dateStr
            };
          }
        });

        setSessions(allSessions);
      })
      .catch(err => {
        console.error('Error fetching sessions:', err);
        // Generate empty sessions for each day of the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const emptySessions = Array.from({ length: daysInMonth }, (_, i) => {
          // Create date for current day (i+1 because days are 1-indexed)
          const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
          return {
            sessionId: null,
            contractorId: selectedContractor,
            contractorEmployeeId: selectedEmployee,
            employeeName: contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName || "",
            inTime: null,
            outTime: null,
            inTimeFormatted: null,
            outTimeFormatted: null,
            punchStatus: "Absent",
            status: "CLOSED",
            isNightShift: false,
            isNightShiftSelected: false,
            date: currentDate.toISOString().split('T')[0]
          };
        });
        setSessions(emptySessions);
        setEmployeeExists(true);
      })
      .finally(() => setLoading(false));
  }, [selectedEmployee, selectedContractor, year, month, contractorEmployees]);

  // Handlers for editing table
  const handleSessionChange = async (idx: number, field: keyof Session, value: string | boolean) => {
    const newSessions = [...sessions];

    // Handle all fields consistently
    if (field === "isNightShiftSelected") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === "true" || value === true };
    } else if (field === "inTimeFormatted") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === null ? null : value as string };
    } else if (field === "outTimeFormatted") {
      newSessions[idx] = { ...newSessions[idx], [field]: value === null ? null : value as string };
    } else if (field === "punchStatus") {
      newSessions[idx] = { ...newSessions[idx], [field]: value as string };

      // Update session status based on punchStatus
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

      // If changing to Absent, clear time fields
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
    } else {
      newSessions[idx] = { ...newSessions[idx], [field]: value };
    }

    setSessions(newSessions);
  };

  const handleSave = async () => {
    setSaving(true);
    // Convert sessions to the format expected by the backend
    const sessionsToSave = sessions.map(session => {
      // For Absent status, we still need to send the session data to the backend
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
          if (dateParts.length === 3 && dateParts.every(part => !isNaN(part))) {
            const [year, month, dayNum] = dateParts;
            const [hour, minute] = timeValue.split(':').map(Number);
            const localIn = new Date(year, month - 1, dayNum, hour, minute);

            if (!isNaN(localIn.getTime())) {
              inTimeUtc = localIn.toISOString();
            }
          }
        }
      }

      if (session.outTimeFormatted) {
        let timeValue = session.outTimeFormatted;
        if (timeValue.includes(" ")) {
          timeValue = timeValue.split(" ")[0];
        }

        if (/^\d{1,2}:\d{2}$/.test(timeValue)) {
          let dateParts;
          if (session.date && session.date.includes('-')) {
            dateParts = session.date.split('-').map(Number);
          } else if (session.inTime) {
            const inTimeDate = new Date(session.inTime);
            dateParts = [inTimeDate.getFullYear(), inTimeDate.getMonth() + 1, inTimeDate.getDate()];
          } else {
            return {
              ...session,
              inTime: inTimeUtc,
              outTime: outTimeUtc,
              isNightShift: session.isNightShiftSelected || session.isNightShift || false,
              status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED"
            };
          }

          if (dateParts.length === 3 && dateParts.every(part => !isNaN(part))) {
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
            }
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
      // Validate sessions data before sending
      const validSessions = sessionsToSave.filter(session => {
        if (!session.contractorId || !session.contractorEmployeeId) {
          return false;
        }

        if (session.punchStatus === "Present" && (!session.inTime || !session.outTime)) {
          return false;
        }

        if (session.punchStatus === "In Only" && !session.inTime) {
          return false;
        }

        if (session.inTime && isNaN(Date.parse(session.inTime))) {
          return false;
        }

        if (session.outTime && isNaN(Date.parse(session.outTime))) {
          return false;
        }

        return true;
      });

      if (validSessions.length === 0) {
        toast.error("No valid attendance data to save. Please check your entries.");
        setSaving(false);
        return;
      }

      // Send session data to the new session-based endpoint
      const response = await api.put(`/punch/contractor/session/manual`, { sessions: validSessions }); // Using direct axios instance

      if (response.status === 200 || response.status === 207) {
        toast.success(response.data.message || "Attendance saved successfully");

        // Refetch data to ensure UI is updated
        if (selectedEmployee && selectedContractor) {
          const res = await api.get(`/punch/contractor/detailed`, { // Using direct axios instance
            params: {
              contractorId: selectedContractor,
              contractorEmployeeId: selectedEmployee,
              month: `${year}-${String(month).padStart(2, "0")}`
            }
          });

          let sessionData: any[] = [];
          if (res.data && Array.isArray(res.data)) {
            sessionData = res.data;
          } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
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
              contractorId: session.contractorId,
              contractorEmployeeId: session.contractorEmployeeId,
              employeeName: session.employeeName,
              inTime: session.inTime,
              outTime: session.outTime,
              inTimeFormatted: inTimeFormatted,
              outTimeFormatted: outTimeFormatted,
              punchStatus: session.punchStatus,
              status: session.status,
              isNightShift: session.isNightShift,
              isNightShiftSelected: session.isNightShiftSelected !== undefined ? session.isNightShiftSelected : (session.isNightShift || false),
              date: session.date || new Date(session.inTime).toISOString().split('T')[0]
            };
          });
          setSessions(formattedSessions);
        }
      }
    } catch (err: any) {
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

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Only allow months/years up to current month/year
  const minYear = today.getFullYear() - 2;
  const maxYear = today.getFullYear();
  const allowedMonths = (y: number) => {
    if (y < today.getFullYear()) return months.map((m, i) => ({ name: m, value: i + 1 }));
    return months.slice(0, today.getMonth() + 1).map((m, i) => ({ name: m, value: i + 1 }));
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Contractor Manual Monthly Attendance</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Manual Attendance Entry</h2>
            <p className="text-muted-foreground mt-2">Enter and manage monthly attendance records for contractor employees</p>
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
              Contractor & Employee Selection
            </CardTitle>
            <CardDescription>Select a contractor and employee for attendance entry</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contractor Selection */}
              <div className="space-y-2">
                <Label htmlFor="contractor">Contractor</Label>
                <Select
                  value={selectedContractor || undefined}
                  onValueChange={(value) => {
                    setSelectedContractor(value);
                    setSelectedEmployee(""); // Reset employee when contractor changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(contractors) && contractors.map((contractor) => (
                      <SelectItem key={contractor._id} value={contractor._id}>
                        {contractor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={selectedEmployee || undefined}
                  onValueChange={setSelectedEmployee}
                  disabled={!selectedContractor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(contractorEmployees) && contractorEmployees.map((employee) => (
                      <SelectItem key={employee.contractorEmployeeId} value={employee.contractorEmployeeId}>
                        <div className="flex flex-col">
                          <span>{employee.employeeName}</span>
                          <span className="text-xs text-gray-500">ID: {employee.contractorEmployeeId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        ) : selectedEmployee && selectedContractor && employeeExists ? (
          <Card className="attendance-card">
            <CardHeader className="bg-gray-50 rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    Monthly Attendance Calendar
                  </CardTitle>
                  <CardDescription>
                    {selectedEmployee ? `Attendance records for ${contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName} - ${months[month - 1]} ${year}` : 'Select an employee to view attendance'}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    if (selectedEmployee && selectedContractor) {
                      setLoading(true);
                      api.get(`/punch/contractor/detailed`, { // Using direct axios instance
                        params: {
                          contractorId: selectedContractor,
                          contractorEmployeeId: selectedEmployee,
                          month: `${year}-${String(month).padStart(2, "0")}`
                        }
                      })
                        .then(res => {
                          let sessionData: any[] = [];
                          if (res.data && Array.isArray(res.data)) {
                            sessionData = res.data;
                          } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
                            sessionData = res.data.data;
                          } else {
                            sessionData = [];
                          }

                          const daysInMonth = new Date(year, month, 0).getDate();
                          const allSessions = Array.from({ length: daysInMonth }, (_, i) => {
                            const currentDate = new Date(Date.UTC(year, month - 1, i + 1));
                            const dateStr = currentDate.toISOString().split('T')[0];

                            const existingSession = sessionData.find((session: any) => {
                              const sessionDate = new Date(session.inTime);
                              return sessionDate.toISOString().split('T')[0] === dateStr;
                            });

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
                                contractorId: existingSession.contractorId || selectedContractor,
                                contractorEmployeeId: existingSession.contractorEmployeeId || selectedEmployee,
                                employeeName: existingSession.employeeName || contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName || "",
                                inTime: existingSession.inTime || null,
                                outTime: existingSession.outTime || null,
                                inTimeFormatted: inTimeFormatted,
                                outTimeFormatted: outTimeFormatted,
                                punchStatus: existingSession.punchStatus || "Absent",
                                status: existingSession.status || "CLOSED",
                                isNightShift: existingSession.isNightShift || false,
                                isNightShiftSelected: existingSession.isNightShiftSelected !== undefined ? existingSession.isNightShiftSelected : (existingSession.isNightShift || false),
                                date: dateStr
                              };
                            } else {
                              return {
                                sessionId: null,
                                contractorId: selectedContractor,
                                contractorEmployeeId: selectedEmployee,
                                employeeName: contractorEmployees.find(e => e.contractorEmployeeId === selectedEmployee)?.employeeName || "",
                                inTime: null,
                                outTime: null,
                                inTimeFormatted: null,
                                outTimeFormatted: null,
                                punchStatus: "Absent",
                                status: "CLOSED",
                                isNightShift: false,
                                isNightShiftSelected: false,
                                date: dateStr
                              };
                            }
                          });

                          setSessions(allSessions);
                          toast.success("Attendance data has been refreshed successfully.");
                        })
                        .catch(err => {
                          console.error('Error refreshing sessions:', err);
                          toast.error("Failed to refresh attendance data. Please try again.");
                        })
                        .finally(() => setLoading(false));
                    }
                  }}
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

                      return (
                        <TableRow
                          key={`${session.sessionId || 'null'}-${session.date}-${idx}`}
                          className={`
                            ${isFuture ? "bg-muted/50" : ""}
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
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={session.punchStatus}
                              onValueChange={(value) => handleSessionChange(idx, "punchStatus", value)}
                              disabled={isFuture}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="In Only">In Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <HourMinuteSelector
                              value={session.inTimeFormatted}
                              onChange={(value) => handleSessionChange(idx, "inTimeFormatted", value || "")}
                              disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <HourMinuteSelector
                                value={session.outTimeFormatted}
                                onChange={(value) => handleSessionChange(idx, "outTimeFormatted", value || "")}
                                disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture}
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
                                disabled={(session.punchStatus !== "Present" && session.punchStatus !== "In Only") || isFuture}
                                className="h-5 w-5"
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
        ) : selectedEmployee && selectedContractor && !employeeExists ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-destructive font-medium">Employee not found. Please select a valid employee.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Select a contractor and employee to view attendance</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {selectedEmployee && selectedContractor && employeeExists && (
          <div className="flex justify-end pt-4">
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