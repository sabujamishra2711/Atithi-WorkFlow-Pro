import { Card } from "@/components/ui/card";
import { useState } from "react";

interface EmployeeSummaryCardsProps {
  totalEmployees: number;
  uniqueDepartments: number;
  averageSalary: string;
  employees: any[]; // All employees for total departments calculation
  filteredEmployees: any[]; // Filtered employees for count and salary calculation
}

export function EmployeeSummaryCards({ 
  totalEmployees, 
  uniqueDepartments, 
  averageSalary,
  employees,
  filteredEmployees
}: EmployeeSummaryCardsProps) {
  const [showTotalSalary, setShowTotalSalary] = useState(false);

  // Calculate total salary from filtered employees
  const calculateTotalSalary = () => {
    const numericSalaries = filteredEmployees
      .map((emp) => parseFloat(emp.monthlySalary || "0"))
      .filter((s) => !isNaN(s));
    const total = numericSalaries.reduce((sum, curr) => sum + curr, 0);
    return total;
  };

  // Calculate average salary from filtered employees
  const calculateFilteredAverageSalary = () => {
    const numericSalaries = filteredEmployees
      .map((emp) => parseFloat(emp.monthlySalary || "0"))
      .filter((s) => !isNaN(s));
    const avg = numericSalaries.length > 0 ? numericSalaries.reduce((sum, curr) => sum + curr, 0) / numericSalaries.length : 0;
    return Math.round(avg);
  };

  const formatCurrency = (value: number) => {
    // Handle NaN, null, or undefined values
    if (!value || isNaN(value)) {
      return "₹0";
    }
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  const totalSalary = calculateTotalSalary();
  const filteredAverageSalary = calculateFilteredAverageSalary();
  
  const displayedSalary = showTotalSalary ? totalSalary : filteredAverageSalary;
  const salaryLabel = showTotalSalary ? "Total Salary" : "Avg. Salary";
  const salaryDescription = showTotalSalary ? "Across filtered employees" : "Average monthly salary";

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <div className="bg-white rounded shadow p-4">
        <div className="text-base font-semibold mb-1">Total Employees</div>
        <div className="text-2xl font-bold">{filteredEmployees.length}</div>
        <div className="text-xs text-muted-foreground">Filtered employees</div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <div className="text-base font-semibold mb-1">Departments</div>
        <div className="text-2xl font-bold">{uniqueDepartments}</div>
        <div className="text-xs text-muted-foreground">Active departments</div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-base font-semibold mb-1">{salaryLabel}</div>
            <div className="text-2xl font-bold">{formatCurrency(displayedSalary)}</div>
            <div className="text-xs text-muted-foreground">{salaryDescription}</div>
          </div>
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground mr-1">Avg</span>
            <button
              onClick={() => setShowTotalSalary(!showTotalSalary)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${
                showTotalSalary ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  showTotalSalary ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-muted-foreground ml-1">Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}