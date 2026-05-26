"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SidebarInset } from "@/components/ui/sidebar";
import { LogIn, LogOut, Plus, Loader2 } from "lucide-react";
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

export default function ContractorManualAttendancePage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorEmployees, setContractorEmployees] = useState<ContractorEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    contractorId: "",
    contractorEmployeeId: "",
    employeeName: "",
    punchType: "IN" as "IN" | "OUT",
    reason: "",
    time: new Date().toTimeString().slice(0, 5),
    date: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    async function fetchContractors() {
      try {
        const res = await api.get("/contractors"); // Using direct axios instance
        // Ensure we're getting an array from the response
        const contractorsData = Array.isArray(res.data) ? res.data :
          (res.data?.data && Array.isArray(res.data.data)) ? res.data.data : [];
        setContractors(contractorsData);
      } catch (err: any) {
        console.error("Error fetching contractors", err);
        toast.error("Failed to load contractors: " + (err.response?.data?.message || err.message));
        setContractors([]); // Set empty array on error
      }
    }

    fetchContractors();
  }, []);

  useEffect(() => {
    async function fetchContractorEmployees() {
      try {
        // First fetch all contractors
        const contractorsRes = await api.get("/contractors"); // Using direct axios instance
        // Ensure we're getting an array from the response
        const contractorsData = Array.isArray(contractorsRes.data) ? contractorsRes.data :
          (contractorsRes.data?.data && Array.isArray(contractorsRes.data.data)) ? contractorsRes.data.data : [];

        // Then fetch employees for each contractor
        const allEmployees = [];
        for (const contractor of contractorsData) {
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
            const employeesWithContractorInfo = employeesData.map((emp: any) => ({
              ...emp,
              contractorId: contractor._id,
              contractorName: contractor.name
            }));
            allEmployees.push(...employeesWithContractorInfo);
          } catch (err: any) {
            console.error(`Error fetching employees for contractor ${contractor.name}:`, err);
            toast.error(`Error fetching employees for contractor ${contractor.name}: ` + (err.response?.data?.message || err.message));
          }
        }

        setContractorEmployees(allEmployees);
      } catch (err: any) {
        console.error("Error fetching contractors and employees", err);
        toast.error("Failed to load contractor employees: " + (err.response?.data?.message || err.message));
        setContractorEmployees([]); // Set empty array on error
      }
    }

    fetchContractorEmployees();
  }, []);

  const handleManualEntry = async () => {
    // Validate all required fields
    if (!manualEntry.contractorId || !manualEntry.contractorEmployeeId || !manualEntry.employeeName || !manualEntry.punchType || !manualEntry.date || !manualEntry.time) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const combined = new Date(`${manualEntry.date}T${manualEntry.time}:00`);

      // Validate the combined date
      if (isNaN(combined.getTime())) {
        throw new Error('Invalid date or time format');
      }

      await api.post("/punch/contractor/manual", { // Using direct axios instance
        contractorId: manualEntry.contractorId,
        contractorEmployeeId: manualEntry.contractorEmployeeId,
        employeeName: manualEntry.employeeName,
        punchType: manualEntry.punchType,
        timestamp: combined.toISOString(),
        reason: manualEntry.reason
      });

      toast.success("Manual entry added successfully");
      setManualEntry({
        contractorId: '',
        contractorEmployeeId: '',
        employeeName: '',
        punchType: 'IN',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        reason: ''
      });
    } catch (error: any) {
      console.error('Error adding manual entry:', error);
      toast.error(error.response?.data?.message || "Failed to add manual entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Contractor Manual Attendance</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manual Attendance</h2>
          <p className="text-muted-foreground">Add manual punch entries for contractors</p>
        </div>

        {/* Manual Punch Entry Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Manual Contractor Punch Entry
            </CardTitle>
            <CardDescription>Add manual punch entries for contractors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="lg:col-span-2">
                <Label htmlFor="contractor">Contractor *</Label>
                <Select
                  value={manualEntry.contractorId || undefined}
                  onValueChange={(value) => {
                    setManualEntry({
                      ...manualEntry,
                      contractorId: value,
                      contractorEmployeeId: "", // Reset employee selection when contractor changes
                      employeeName: ""
                    });
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

              <div className="lg:col-span-2">
                <Label htmlFor="contractorEmployee">Employee *</Label>
                <Select
                  value={manualEntry.contractorEmployeeId || undefined}
                  onValueChange={(value) => {
                    // Find the selected employee
                    const selectedEmployee = contractorEmployees.find(emp =>
                      emp.contractorEmployeeId === value &&
                      emp.contractorId === manualEntry.contractorId
                    );

                    // Set the employee name properly
                    const employeeName = selectedEmployee ? selectedEmployee.employeeName : "";

                    setManualEntry({
                      ...manualEntry,
                      contractorEmployeeId: value,
                      employeeName: employeeName
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(contractorEmployees) &&
                      contractorEmployees
                        .filter(emp => emp.contractorId === manualEntry.contractorId)
                        .map((employee) => (
                          <SelectItem
                            key={`${employee.contractorId}-${employee.contractorEmployeeId}`}
                            value={employee.contractorEmployeeId}
                          >
                            {employee.employeeName}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-1">
                <Label htmlFor="punchType">Type *</Label>
                <Select
                  value={manualEntry.punchType}
                  onValueChange={(value) => setManualEntry({ ...manualEntry, punchType: value as "IN" | "OUT" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        IN
                      </div>
                    </SelectItem>
                    <SelectItem value="OUT">
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        OUT
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-1">
                <Label htmlFor="date">Date *</Label>
                <Input
                  type="date"
                  value={manualEntry.date}
                  onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="lg:col-span-1">
                <Label htmlFor="time">Time *</Label>
                <Input
                  type="time"
                  value={manualEntry.time}
                  onChange={(e) => setManualEntry({ ...manualEntry, time: e.target.value })}
                />
              </div>

              <div className="lg:col-span-7">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for manual entry"
                  value={manualEntry.reason}
                  onChange={(e) => setManualEntry({ ...manualEntry, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="lg:col-span-7 flex justify-end">
                <Button
                  onClick={handleManualEntry}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Entry...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manual Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}