"use client";
import { useState, useEffect } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeTable } from "@/components/hr-employees/EmployeeTable";
import { EmployeeSummaryCards } from "@/components/hr-employees/EmployeeSummaryCards";
import { SearchAndFilterSection } from "@/components/hr-employees/SearchAndFilterSection";
import { AdvancedFiltersPanel } from "@/components/hr-employees/AdvancedFiltersPanel";
import api from "@/lib/apiClient";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterDesignation, setFilterDesignation] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSalaryMin, setFilterSalaryMin] = useState("");
  const [filterSalaryMax, setFilterSalaryMax] = useState("");
  const [filterJoiningDateFrom, setFilterJoiningDateFrom] = useState<Date | null>(null);
  const [filterJoiningDateTo, setFilterJoiningDateTo] = useState<Date | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await api.get("/employees/getAllEmployees");
        const employeeData = Array.isArray(response.data.employees) ? response.data.employees : [];
        setEmployees(employeeData);
        setFilteredEmployees(employeeData);
      } catch (err: any) {
        console.error("Failed to fetch employees:", err);
        setError(err.message || "Failed to fetch employees");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Get unique values for filters
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
  const uniqueDesignations = [...new Set(employees.map(emp => emp.position).filter(Boolean))];
  const uniqueStatuses = [...new Set(employees.map(emp => emp.status || "Active"))];

  // Check if any filters are active
  const hasActiveFilters =
    filterDepartment !== "All" ||
    filterDesignation !== "All" ||
    filterStatus !== "All" ||
    filterSalaryMin !== "" ||
    filterSalaryMax !== "" ||
    filterJoiningDateFrom !== null ||
    filterJoiningDateTo !== null;

  // Filter employees based on all criteria
  useEffect(() => {
    let result = employees;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(employee =>
        `${employee.firstName} ${employee.middleName || ""} ${employee.lastName}`.toLowerCase().includes(term) ||
        employee.empId.toLowerCase().includes(term) ||
        (employee.email && employee.email.toLowerCase().includes(term)) ||
        (employee.department && employee.department.toLowerCase().includes(term))
      );
    }

    // Apply department filter
    if (filterDepartment !== "All") {
      result = result.filter(employee =>
        employee.department === filterDepartment
      );
    }

    // Apply designation filter
    if (filterDesignation !== "All") {
      result = result.filter(employee =>
        employee.position === filterDesignation
      );
    }

    // Apply status filter
    if (filterStatus !== "All") {
      result = result.filter(employee =>
        (employee.status || "Active") === filterStatus
      );
    }

    // Apply salary range filters
    if (filterSalaryMin) {
      const minSalary = parseFloat(filterSalaryMin);
      result = result.filter(employee =>
        parseFloat(employee.monthlySalary || "0") >= minSalary
      );
    }

    if (filterSalaryMax) {
      const maxSalary = parseFloat(filterSalaryMax);
      result = result.filter(employee =>
        parseFloat(employee.monthlySalary || "0") <= maxSalary
      );
    }

    // Apply date filters
    if (filterJoiningDateFrom) {
      result = result.filter(employee =>
        employee.joiningDate && new Date(employee.joiningDate) >= filterJoiningDateFrom
      );
    }

    if (filterJoiningDateTo) {
      result = result.filter(employee =>
        employee.joiningDate && new Date(employee.joiningDate) <= filterJoiningDateTo
      );
    }

    setFilteredEmployees(result);
  }, [
    searchTerm,
    filterDepartment,
    filterDesignation,
    filterStatus,
    filterSalaryMin,
    filterSalaryMax,
    filterJoiningDateFrom,
    filterJoiningDateTo,
    employees
  ]);

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <h1 className="text-lg font-semibold">Employee Management</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
              <p className="text-muted-foreground">Manage all employee information and records</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Search and filter through all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div>Loading employees...</div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <h1 className="text-lg font-semibold">Employee Management</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
              <p className="text-muted-foreground">Manage all employee information and records</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Search and filter through all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-red-500">Error: {error}</div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    );
  }

  const handleDeleteClick = async (employee: any) => {
    if (window.confirm(`Are you sure you want to delete employee ${employee.firstName} ${employee.lastName} (${employee.empId})?`)) {
      try {
        setLoading(true);
        // Using relative path via the API client, assuming base configured to /api/v1
        await api.delete(`/hr/${employee.empId}`);
        // Refresh employees list
        refreshEmployees();
      } catch (err: any) {
        console.error("Failed to delete employee:", err);
        alert(err?.response?.data?.message || err.message || "Failed to delete employee");
        setLoading(false);
      }
    }
  };

  // Calculate average salary for summary cards
  const validSalaries = filteredEmployees
    .map(emp => parseFloat(emp.monthlySalary || "0"))
    .filter(salary => !isNaN(salary));
  const averageSalary = validSalaries.length > 0
    ? (validSalaries.reduce((sum, salary) => sum + salary, 0) / validSalaries.length).toFixed(0)
    : "0";

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterDepartment("All");
    setFilterDesignation("All");
    setFilterStatus("All");
    setFilterSalaryMin("");
    setFilterSalaryMax("");
    setFilterJoiningDateFrom(null);
    setFilterJoiningDateTo(null);
  };

  // Refresh employees data
  const refreshEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get("/employees/getAllEmployees");
      const employeeData = Array.isArray(response.data.employees) ? response.data.employees : [];
      setEmployees(employeeData);
      setFilteredEmployees(employeeData);
    } catch (err: any) {
      console.error("Failed to refresh employees:", err);
      setError(err.message || "Failed to refresh employees");
    } finally {
      setLoading(false);
    }
  };

  // Wrapper functions for date handling to match expected signatures
  const handleJoiningDateFromChange = (date: Date | undefined) => {
    setFilterJoiningDateFrom(date || null);
  };

  const handleJoiningDateToChange = (date: Date | undefined) => {
    setFilterJoiningDateTo(date || null);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Employee Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
            <p className="text-muted-foreground">Manage all employee information and records</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <SearchAndFilterSection
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          loading={loading}
          onRefresh={refreshEmployees}
        />

        {/* Advanced Filters Panel */}
        <AdvancedFiltersPanel
          showFilters={showFilters}
          filterDepartment={filterDepartment}
          onDepartmentChange={setFilterDepartment}
          filterDesignation={filterDesignation}
          onDesignationChange={setFilterDesignation}
          filterStatus={filterStatus}
          onStatusChange={setFilterStatus}
          filterSalaryMin={filterSalaryMin}
          onSalaryMinChange={setFilterSalaryMin}
          filterSalaryMax={filterSalaryMax}
          onSalaryMaxChange={setFilterSalaryMax}
          filterJoiningDateFrom={filterJoiningDateFrom}
          onJoiningDateFromChange={handleJoiningDateFromChange}
          filterJoiningDateTo={filterJoiningDateTo}
          onJoiningDateToChange={handleJoiningDateToChange}
          departments={uniqueDepartments}
          designations={uniqueDesignations}
          statuses={uniqueStatuses}
          onClearAll={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Employee Summary Cards */}
        <EmployeeSummaryCards
          totalEmployees={employees.length}
          uniqueDepartments={uniqueDepartments.length}
          averageSalary={averageSalary}
          employees={employees}
          filteredEmployees={filteredEmployees}
        />

        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>Search and filter through all employees</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              employees={filteredEmployees}
              loading={false}
              onDeleteClick={handleDeleteClick}
            />
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}