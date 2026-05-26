"use client"

import { useEffect, useState } from "react"
import api from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  CheckCircle, 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar, 
  FileText, 
  AlertCircle,
  Users,
  TrendingUp,
  CheckSquare,
  Search,
  ChevronDown
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DeleteButton } from "@/components/shared-buttons"

interface Punch {
  _id: string
  employeeId: string
  punchType: "IN" | "OUT"
  imageUrl: string
  timestamp: string
  status: "Pending" | "Approved" | "Rejected"
}

interface Employee {
  _id: string
  empId: string
  firstName: string
  middleName?: string
  lastName: string
  department?: string
  designation?: string
  email?: string
}

export default function MarkAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [manualEntry, setManualEntry] = useState({
    empId: "",
    punchType: "IN",
    reason: "",
    time: ""
  });

  useEffect(() => {
    fetchEmployees();
    fetchRecentEntries();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees/getAllEmployees");
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const res = await api.get(`/punch/manual/recent?date=${selectedDate}`);
      setRecentEntries(res.data.data || []);
    } catch (error) {
      console.error("Error fetching recent entries:", error);
      setRecentEntries([]);
    }
  };

  const getEmployeeName = (empId: string) => {
    const emp = employees.find(e => e.empId === empId);
    if (!emp) return "Unknown Employee";
    return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
  };

  const getEmployeeDetails = (empId: string) => {
    return employees.find(e => e.empId === empId);
  };

  const getSelectedEmployeeDisplay = () => {
    if (!manualEntry.empId) return "Select an employee";
    const emp = getEmployeeDetails(manualEntry.empId);
    if (!emp) return "Select an employee";
    return `${emp.empId} - ${[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ")}`;
  };

  const filteredEmployees = employees.filter((emp) => {
    const searchTerm = employeeSearchValue.toLowerCase();
    const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ").toLowerCase();
    const empId = emp.empId.toLowerCase();
    const department = (emp.department || "").toLowerCase();
    const designation = (emp.designation || "").toLowerCase();
    
    return (
      fullName.includes(searchTerm) ||
      empId.includes(searchTerm) ||
      department.includes(searchTerm) ||
      designation.includes(searchTerm)
    );
  });

  const handleManualEntry = async () => {
    if (!manualEntry.empId || !manualEntry.punchType || !selectedDate || !manualEntry.time) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const [hour, minute] = manualEntry.time.split(":").map(Number);
      const combined = new Date(selectedDate);
      combined.setHours(hour, minute, 0, 0);
      
      await api.post("/punch/manual", {
        employeeId: manualEntry.empId,
        punchType: manualEntry.punchType,
        reason: manualEntry.reason || "Manual Entry by HR",
        timestamp: combined.toISOString(),
      });
      
      toast.success("Manual punch entry added successfully");
      setManualEntry({ empId: "", punchType: "IN", reason: "", time: "" });
      fetchRecentEntries(); // Refresh recent entries
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to add manual entry");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await api.delete(`/punch/${entryId}`);
      toast.success("Entry deleted successfully");
      fetchRecentEntries();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete entry");
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case "Present/In only":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Present/In only</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const todayEntries = recentEntries.filter(entry => 
    new Date(entry.inTime).toDateString() === new Date(selectedDate).toDateString()
  );

  return (
    <SidebarInset>
      {/* Modern Header */}
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Manual Attendance Management</h1>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Manual Punch Entry</h2>
            <p className="text-muted-foreground">Add and manage manual attendance records for employees</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {employees.length} Employees
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {todayEntries.length} Today's Entries
            </Badge>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Today's Entries</p>
                  <p className="text-2xl font-bold text-green-900">{todayEntries.length}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {todayEntries.filter(entry => entry.status === "Pending").length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Manual Entry Form */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                New Manual Entry
              </CardTitle>
              <CardDescription>Add a new manual punch entry for an employee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {getSelectedEmployeeDisplay()}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search employees by ID" 
                        value={employeeSearchValue}
                        onValueChange={setEmployeeSearchValue}
                      />
                      <CommandList className="max-h-60">
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {filteredEmployees.map((emp) => (
                            <CommandItem
                              key={emp._id}
                              value={emp.empId}
                              onSelect={(currentValue) => {
                                setManualEntry({ ...manualEntry, empId: currentValue });
                                setEmployeeSearchOpen(false);
                                setEmployeeSearchValue("");
                              }}
                            >
                              <div className="flex flex-col w-full">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{emp.empId}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {emp.department || "No Dept"}
                                  </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ")}
                                </span>
                                {emp.designation && (
                                  <span className="text-xs text-muted-foreground">
                                    {emp.designation}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Search by employee name, ID, department, or designation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Punch Type *</Label>
                  <Select value={manualEntry.punchType} onValueChange={(value: "IN" | "OUT") => setManualEntry({ ...manualEntry, punchType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Check In</SelectItem>
                      <SelectItem value="OUT">Check Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
              />
                </div>
              </div>

              <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={manualEntry.time}
                onChange={e => setManualEntry({ ...manualEntry, time: e.target.value })}
              />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                  id="reason"
                  placeholder="Enter reason for manual entry..."
                value={manualEntry.reason}
                onChange={e => setManualEntry({ ...manualEntry, reason: e.target.value })}
                  rows={3}
              />
              </div>

              <Button 
                onClick={handleManualEntry} 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg"
                disabled={loading || !manualEntry.empId || !manualEntry.time}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding Entry...
                  </div>
                ) : (
                  <>
                <CheckCircle className="mr-2 h-4 w-4" />
                    Add Manual Entry
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Manual Entries
              </CardTitle>
              <CardDescription>Today's manual punch entries</CardDescription>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No manual entries for today</p>
                  <p className="text-sm text-muted-foreground">Add your first manual entry using the form</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayEntries.slice(0, 5).map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {getEmployeeName(entry.employeeId)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.employeeId}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {entry.punchType === "IN" ? "Check In" : "Check Out"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(entry.inTime)}
                          </div>
                        </div>
                        {getStatusBadge(entry.status)}
                        <DeleteButton 
                          showText={false}
                          size="sm"
                          confirmTitle="Delete Manual Entry"
                          confirmDescription="Are you sure you want to delete this manual entry? This action cannot be undone."
                          onConfirm={() => handleDeleteEntry(entry._id)}
                        />
                      </div>
                    </div>
                  ))}
                  {todayEntries.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All Entries ({todayEntries.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  )
}
