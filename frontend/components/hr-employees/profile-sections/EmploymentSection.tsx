import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SalaryHistoryManager } from "./SalaryHistoryManager";

interface EmploymentSectionProps {
  form: any;
  isEditing: boolean;
  handleChange: (field: string, value: any) => void;
  handleNestedChange: (parent: string, field: string, value: any) => void;
  selectedEmployee: any;
  setShowSalaryHistory: (show: boolean) => void;
}

export function EmploymentSection({
  form,
  isEditing,
  handleChange,
  handleNestedChange,
  selectedEmployee,
  setShowSalaryHistory
}: EmploymentSectionProps) {
  // Ensure shiftDetails object exists with all required properties
  const shiftDetails = form.shiftDetails || {
    workHoursPerDay: "",
    weeklyOff: ""
  };

  // Generate month options (Jan-Dec)
  const monthOptions = [
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
  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push({ value: i.toString(), label: i.toString() });
  }

  // Get effective date values from form state
  const effectiveMonth = form.effectiveMonth || "";
  const effectiveYear = form.effectiveYear || "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          value={form.department || ""}
          onChange={(e) => handleChange("department", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="designation">Designation</Label>
        <Input
          id="position"
          value={form.position || ""}
          onChange={(e) => handleChange("position", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="employeeCategory">Employee Category</Label>
        <select
          id="employeeCategory"
          value={form.employeeCategory || ""}
          onChange={(e) => handleChange("employeeCategory", e.target.value)}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Category</option>
          <option value="STAFFS(OFFICE)">STAFFS(OFFICE)</option>
          <option value="STAFFS(PLANT)">STAFFS(PLANT)</option>
          <option value="WORKERS (PLANT)">WORKERS (PLANT)</option>
        </select>
      </div>
      <div>
        <Label htmlFor="employeeType">Employee Type</Label>
        <select
          id="employeeType"
          value={form.employeeType || ""}
          onChange={(e) => handleChange("employeeType", e.target.value)}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Type</option>
          <option value="fullMonth">Full Month</option>
          <option value="weeklyOff">Weekly Off</option>
          <option value="weeklyOffWithCoff">Weekly Off with C-Off</option>
        </select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={form.status || ""}
          onChange={(e) => handleChange("status", e.target.value)}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="monthlySalary">Monthly Salary</Label>
          <Input
            id="monthlySalary"
            type="number"
            value={form.monthlySalary || ""}
            onChange={(e) => handleChange("monthlySalary", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        {selectedEmployee && (
          <Button
            type="button"
            onClick={() => setShowSalaryHistory(true)}
            className="h-[42px] mt-[22px]"
          >
            Increase Salary
          </Button>
        )}
      </div>
      {/* Salary Effective From Fields - Additive Change */}
      {isEditing && (
        <div className="md:col-span-2">
          <Label>Salary Effective From (Optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            <div>
              <select
                value={effectiveMonth}
                onChange={(e) => handleChange("effectiveMonth", e.target.value)}
                className="w-full p-2 border rounded"
                disabled={!isEditing}
              >
                <option value="">Select Month</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={effectiveYear}
                onChange={(e) => handleChange("effectiveYear", e.target.value)}
                className="w-full p-2 border rounded"
                disabled={!isEditing}
              >
                <option value="">Select Year</option>
                {yearOptions.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="joiningDate">Joining Date</Label>
        <Input
          id="joiningDate"
          type="date"
          value={form.joiningDate ? form.joiningDate.split('T')[0] : ""}
          onChange={(e) => handleChange("joiningDate", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="workHoursPerDay">Work Hours Per Day</Label>
        <select
          id="workHoursPerDay"
          value={shiftDetails.workHoursPerDay || ""}
          onChange={(e) => handleNestedChange("shiftDetails", "workHoursPerDay", parseInt(e.target.value))}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Hours</option>
          <option value="8">8 Hours</option>
          <option value="9">9 Hours</option>
          <option value="12">12 Hours</option>
        </select>
      </div>
      <div>
        <Label htmlFor="weeklyOff">Weekly Off Day</Label>
        <select
          id="weeklyOff"
          value={shiftDetails.weeklyOff || ""}
          onChange={(e) => handleNestedChange("shiftDetails", "weeklyOff", e.target.value)}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Day</option>
          <option value="Sunday">Sunday</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
        </select>
      </div>
    </div>
  );
}