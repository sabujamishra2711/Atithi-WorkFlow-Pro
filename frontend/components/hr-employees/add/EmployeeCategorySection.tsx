import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmployeeCategorySectionProps {
  employeeCategory: string;
  setEmployeeCategory: (value: string) => void;
  errors: any;
}

export function EmployeeCategorySection({
  employeeCategory,
  setEmployeeCategory,
  errors
}: EmployeeCategorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="employeeCategory">Category <span className="text-red-500">*</span></Label>
          <Select
            name="employeeCategory"
            onValueChange={value => setEmployeeCategory(value)}
            value={employeeCategory || ""}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STAFFS(OFFICE)">STAFFS(OFFICE)</SelectItem>
              <SelectItem value="STAFFS(PLANT)">STAFFS(PLANT)</SelectItem>
              <SelectItem value="WORKERS (PLANT)">WORKERS (PLANT)</SelectItem>
            </SelectContent>
          </Select>
          {errors.employeeCategory && (
            <p className="text-red-500 text-xs mt-1">Employee category is required.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}