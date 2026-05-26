import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedExportButton } from "@/components/ui/EnhancedExportButton";
import { 
  AttendanceTable, 
  StatisticsCards, 
  Filters, 
  DateSelector 
} from "@/components/hr-attendance";
import { Badge } from "@/components/ui/badge";

// Example usage of the attendance components in another context
export function AttendanceReportExample() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    department: "All",
    designation: "All",
    status: "All"
  });
  const [showFilters, setShowFilters] = useState(false);

  // Mock data
  const mockRecords = [
    {
      empId: "EMP001",
      name: "John Doe",
      department: "Engineering",
      designation: "Software Engineer",
      checkIn: "09:00 AM",
      checkOut: "06:00 PM",
      status: "Present",
      imageUrl: ""
    },
    {
      empId: "EMP002",
      name: "Jane Smith",
      department: "Marketing",
      designation: "Marketing Manager",
      checkIn: "09:15 AM",
      checkOut: "—",
      status: "IN Only",
      imageUrl: ""
    }
  ];

  const mockStats = {
    total: 25,
    present: 20,
    partial: 2,
    leave: 3,
    absent: 0,
    otHours: "15.5"
  };

  const departments = ["All", "Engineering", "Marketing", "HR", "Finance"];
  const designations = ["All", "Software Engineer", "Marketing Manager", "HR Specialist", "Accountant"];

  const handleDeletePunch = (punchId: string) => {
    console.log("Delete punch:", punchId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Present</Badge>;
      case "IN Only":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">IN Only</Badge>;
      default:
        return <Badge variant="destructive">{status}</Badge>;
    }
  };

  const handleExport = async () => {
    // Mock export function
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("Export completed");
        resolve();
      }, 1000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Report</h2>
          <p className="text-muted-foreground">View and export attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <EnhancedExportButton
            onExport={handleExport}
            estimatedTime="1-2 seconds"
          >
            Export Report
          </EnhancedExportButton>
        </div>
      </div>

      {/* Statistics Cards */}
      <StatisticsCards stats={mockStats} />

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
            Showing records for {selectedDate?.toLocaleDateString() || "selected date"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceTable 
            records={mockRecords}
            onDeletePunch={handleDeletePunch}
            getStatusBadge={getStatusBadge}
          />
        </CardContent>
      </Card>
    </div>
  );
}