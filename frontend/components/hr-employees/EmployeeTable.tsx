import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared-buttons"; // Fixed import

interface Employee {
  _id: string;
  empId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  department?: string;
  position?: string;
  monthlySalary?: string;
  joiningDate?: string;
  status?: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  onDeleteClick: (employee: Employee) => void;
}

export function EmployeeTable({ employees, loading, onDeleteClick }: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No employees found matching your criteria.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee._id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {`${employee.firstName} ${employee.middleName || ""} ${employee.lastName}`}
                  </div>
                  <div className="text-sm text-muted-foreground">{employee.email}</div>
                  <div className="text-sm text-muted-foreground">{employee.empId}</div>
                </div>
              </TableCell>
              <TableCell>{employee.department || "-"}</TableCell>
              <TableCell>{employee.position || "-"}</TableCell>
              <TableCell>
                ₹
                {parseFloat(employee.monthlySalary || "0").toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </TableCell>
              <TableCell>
                {employee.joiningDate
                  ? new Date(employee.joiningDate).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell>
                {(() => {
                  const status = employee.status || "Active";
                  const normalizedStatus = status.toLowerCase();
                  
                  if (normalizedStatus === "active") {
                    return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
                  } else if (normalizedStatus === "inactive") {
                    return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
                  } else if (normalizedStatus === "on leave") {
                    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
                  }
                  return <Badge variant="secondary">{status}</Badge>;
                })()}
              </TableCell>
              <TableCell>
                <DeleteButton 
                  size="sm" 
                  onClick={() => onDeleteClick(employee)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}