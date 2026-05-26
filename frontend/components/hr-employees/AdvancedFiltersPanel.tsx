import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AdvancedFiltersPanelProps {
  showFilters: boolean;
  filterDepartment: string;
  onDepartmentChange: (value: string) => void;
  filterDesignation: string;
  onDesignationChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  filterSalaryMin: string;
  onSalaryMinChange: (value: string) => void;
  filterSalaryMax: string;
  onSalaryMaxChange: (value: string) => void;
  filterJoiningDateFrom: Date | null;
  onJoiningDateFromChange: (date: Date | undefined) => void;
  filterJoiningDateTo: Date | null;
  onJoiningDateToChange: (date: Date | undefined) => void;
  departments: string[];
  designations: string[];
  statuses: string[];
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function AdvancedFiltersPanel({ 
  showFilters,
  filterDepartment,
  onDepartmentChange,
  filterDesignation,
  onDesignationChange,
  filterStatus,
  onStatusChange,
  filterSalaryMin,
  onSalaryMinChange,
  filterSalaryMax,
  onSalaryMaxChange,
  filterJoiningDateFrom,
  onJoiningDateFromChange,
  filterJoiningDateTo,
  onJoiningDateToChange,
  departments,
  designations,
  statuses,
  onClearAll,
  hasActiveFilters
}: AdvancedFiltersPanelProps) {
  if (!showFilters) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Advanced Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Department Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select value={filterDepartment} onValueChange={onDepartmentChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Designation Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Designation</label>
            <Select value={filterDesignation} onValueChange={onDesignationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Designations</SelectItem>
                {designations.map((designation) => (
                  <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Salary Range (₹)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={filterSalaryMin}
                onChange={(e) => onSalaryMinChange(e.target.value)}
              />
              <Input
                placeholder="Max"
                type="number"
                value={filterSalaryMax}
                onChange={(e) => onSalaryMaxChange(e.target.value)}
              />
            </div>
          </div>

          {/* Joining Date From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Joining Date From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {filterJoiningDateFrom ? format(filterJoiningDateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={filterJoiningDateFrom || undefined}
                  onSelect={onJoiningDateFromChange as any}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Joining Date To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Joining Date To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {filterJoiningDateTo ? format(filterJoiningDateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={filterJoiningDateTo || undefined}
                  onSelect={onJoiningDateToChange as any}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {filterDepartment !== "All" && (
                <Badge variant="secondary" className="text-xs">
                  Department: {filterDepartment}
                </Badge>
              )}
              {filterDesignation !== "All" && (
                <Badge variant="secondary" className="text-xs">
                  Designation: {filterDesignation}
                </Badge>
              )}
              {filterStatus !== "All" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {filterStatus}
                </Badge>
              )}
              {(filterSalaryMin || filterSalaryMax) && (
                <Badge variant="secondary" className="text-xs">
                  Salary: ₹{filterSalaryMin || "0"} - ₹{filterSalaryMax || "∞"}
                </Badge>
              )}
              {filterJoiningDateFrom && (
                <Badge variant="secondary" className="text-xs">
                  From: {format(filterJoiningDateFrom, "MMM dd, yyyy")}
                </Badge>
              )}
              {filterJoiningDateTo && (
                <Badge variant="secondary" className="text-xs">
                  To: {format(filterJoiningDateTo, "MMM dd, yyyy")}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}