import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { User, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusBadge } from "@/components/hr-employees/utils";

interface EmployeeSearchDropdownProps {
  employeeSelectorOpen: boolean;
  setEmployeeSelectorOpen: (open: boolean) => void;
  employeeSearchTerm: string;
  setEmployeeSearchTerm: (term: string) => void;
  filteredEmployees: any[];
  selectedEmployee: any;
  setSelectedEmployee: (employee: any) => void;
  getProfileImageUrl: (employee: any) => string;
}

export function EmployeeSearchDropdown({
  employeeSelectorOpen,
  setEmployeeSelectorOpen,
  employeeSearchTerm,
  setEmployeeSearchTerm,
  filteredEmployees,
  selectedEmployee,
  setSelectedEmployee,
  getProfileImageUrl
}: EmployeeSearchDropdownProps) {
  return (
    <div className="flex justify-center mb-6">
      <Popover open={employeeSelectorOpen} onOpenChange={setEmployeeSelectorOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-12 text-lg font-medium">
            {selectedEmployee ? (
              <div className="flex items-center gap-3 w-full">
                <img
                  src={getProfileImageUrl(selectedEmployee)}
                  className="w-8 h-8 rounded-full border-2 border-blue-100 bg-gray-100 object-cover"
                />
                <span className="flex-1 text-left">
                  {selectedEmployee.firstName} {selectedEmployee.middleName ? selectedEmployee.middleName + ' ' : ''}{selectedEmployee.lastName}
                </span>
                <Badge className="ml-2">{selectedEmployee.department}</Badge>
                <ChevronDown className="h-4 w-4 ml-2" />
              </div>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Select Employee
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command>
            <CommandInput 
              placeholder="Search by name, ID, department, or designation..." 
              value={employeeSearchTerm}
              onValueChange={setEmployeeSearchTerm}
            />
            <CommandList>
              {filteredEmployees.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No employees found matching "{employeeSearchTerm}"
                </div>
              ) : (
                filteredEmployees.map((emp: any) => (
                  <CommandItem
                    key={emp.empId}
                    onSelect={() => {
                      setSelectedEmployee(emp);
                      setEmployeeSelectorOpen(false);
                      setEmployeeSearchTerm(""); // Clear search when selecting
                    }}
                  >
                    <div className="flex items-center w-full">
                      <img
                        src={getProfileImageUrl(emp)}
                        className="w-8 h-8 rounded-full border-2 border-blue-100 bg-gray-100 object-cover"
                      />
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="font-medium truncate">{emp.firstName} {emp.middleName ? emp.middleName + ' ' : ''}{emp.lastName}</div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{emp.empId}</span>
                          <span>{getStatusBadge(emp.status)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{emp.position || 'N/A'}</span>
                          <span>{emp.department || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}