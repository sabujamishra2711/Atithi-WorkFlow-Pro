import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CompensationSectionProps {
  monthlySalary: string;
  password: string;
  errors: any;
  register: any;
  // Add props for effective date handling
  effectiveMonth?: string;
  effectiveYear?: string;
  onEffectiveMonthChange?: (value: string) => void;
  onEffectiveYearChange?: (value: string) => void;
}

export function CompensationSection({
  monthlySalary,
  password,
  errors,
  register,
  effectiveMonth = "",
  effectiveYear = "",
  onEffectiveMonthChange,
  onEffectiveYearChange
}: CompensationSectionProps) {
  // Generate month options (Jan-Dec)
  const monthOptions = [
    { value: "", label: "Select Month" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  // Generate year options (current year and next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [{ value: "", label: "Select Year" }];
  for (let i = currentYear; i <= currentYear + 5; i++) {
    yearOptions.push({ value: i.toString(), label: i.toString() });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compensation & Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">Monthly Salary *</Label>
            <Input
              id="monthlySalary"
              type="number"
              {...register("monthlySalary", {
                required: "Monthly salary is required",
                min: { value: 0, message: "Salary must be positive" }
              })}
              placeholder="Enter monthly salary"
            />
            {errors.monthlySalary && (
              <p className="text-red-500 text-sm">{errors.monthlySalary.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" }
              })}
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>
        </div>

        {/* Salary Effective From Fields - Additive Change */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="effectiveMonth">Salary Effective From (Optional)</Label>
            <select
              id="effectiveMonth"
              value={effectiveMonth}
              onChange={(e) => onEffectiveMonthChange && onEffectiveMonthChange(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveYear">&nbsp;</Label>
            <select
              id="effectiveYear"
              value={effectiveYear}
              onChange={(e) => onEffectiveYearChange && onEffectiveYearChange(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {yearOptions.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}