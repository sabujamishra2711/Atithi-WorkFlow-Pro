import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface ContractorFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filters: {
    contractor: string;
    status: string;
  };
  setFilters: {
    setContractorFilter: (value: string) => void;
    setStatusFilter: (value: string) => void;
  };
  contractors: string[];
}

export function ContractorFilters({ searchTerm, setSearchTerm, filters, setFilters, contractors }: ContractorFiltersProps) {
  // Debug: Log all props
  useEffect(() => {
    console.log('=== ContractorFilters Props Update ===');
    console.log('searchTerm:', searchTerm);
    console.log('filters:', filters);
    console.log('contractors:', contractors);
    console.log('============================');
  }, [searchTerm, filters, contractors]);
  
  // Ensure we have default values
  const contractorValue = filters.contractor && filters.contractor !== "All" ? filters.contractor : "All";
  const statusValue = filters.status && filters.status !== "All" ? filters.status : "All";
  
  console.log('ContractorFilters render:', { contractorValue, statusValue, searchTerm, contractors });
  
  const handleContractorChange = (value: string) => {
    console.log('=== Contractor Filter Change ===');
    console.log('Previous contractor filter:', filters.contractor);
    console.log('New contractor value:', value);
    setFilters.setContractorFilter(value || "All");
    console.log('============================');
  };
  
  const handleStatusChange = (value: string) => {
    console.log('=== Status Filter Change ===');
    console.log('Previous status filter:', filters.status);
    console.log('New status value:', value);
    setFilters.setStatusFilter(value || "All");
    console.log('============================');
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== Search Term Change ===');
    console.log('Previous searchTerm:', searchTerm);
    console.log('New search term:', e.target.value);
    setSearchTerm(e.target.value);
    console.log('============================');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Filter contractor attendance records by various criteria</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search contractors or employees..."
                value={searchTerm || ""}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contractor</label>
            <Select value={contractorValue} onValueChange={handleContractorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Contractors</SelectItem>
                {(() => {
                  console.log('Rendering contractor options, contractors:', contractors);
                  if (!Array.isArray(contractors)) {
                    console.log('Contractors is not an array');
                    return null;
                  }
                  return contractors.map(contractor => {
                    console.log('Rendering contractor option:', contractor);
                    return (
                      <SelectItem key={contractor} value={contractor}>
                        {contractor}
                      </SelectItem>
                    );
                  });
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusValue} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="IN Only">IN Only</SelectItem>
                <SelectItem value="OUT Only">OUT Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}