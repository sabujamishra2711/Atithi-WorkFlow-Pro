import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filters: {
    department: string;
    designation: string;
    status: string;
  };
  setFilters: (value: React.SetStateAction<{
    department: string;
    designation: string;
    status: string;
  }>) => void;
  departments: string[];
  designations: string[];
}

export function Filters({ searchTerm, setSearchTerm, filters, setFilters, departments, designations }: FiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Filter attendance records by various criteria</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(departments) && departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Designation</label>
            <Select value={filters.designation} onValueChange={(value) => setFilters(prev => ({ ...prev, designation: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(designations) && designations.map(desig => (
                  <SelectItem key={desig} value={desig}>{desig}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="IN Only">IN Only</SelectItem>
                <SelectItem value="OUT Only">OUT Only</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}