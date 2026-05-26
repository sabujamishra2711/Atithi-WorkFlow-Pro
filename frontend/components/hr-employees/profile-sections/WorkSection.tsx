import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface WorkSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedArrayChange: (arrayName: string, idx: number, field: string, value: any) => void;
  handleRemoveArrayItem: (arrayName: string, idx: number) => void;
  handleAddArrayItem: (arrayName: string, emptyObj: any) => void;
}

export function WorkSection({
  form,
  isEditing,
  handleNestedArrayChange,
  handleRemoveArrayItem,
  handleAddArrayItem
}: WorkSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.workExperience && form.workExperience.map((exp: any, index: number) => (
        <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold">Work Experience {index + 1}</h4>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveArrayItem("workExperience", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor={`employerName-${index}`}>Employer Name</Label>
            <Input
              id={`employerName-${index}`}
              value={exp.employerName || ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "employerName", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`address-${index}`}>Address</Label>
            <Input
              id={`address-${index}`}
              value={exp.address || ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "address", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`designation-${index}`}>Designation</Label>
            <Input
              id={`designation-${index}`}
              value={exp.designation || ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "designation", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`joiningDate-${index}`}>Joining Date</Label>
            <Input
              id={`joiningDate-${index}`}
              type="date"
              value={exp.joiningDate ? exp.joiningDate.split('T')[0] : ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "joiningDate", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`leavingDate-${index}`}>Leaving Date</Label>
            <Input
              id={`leavingDate-${index}`}
              type="date"
              value={exp.leavingDate ? exp.leavingDate.split('T')[0] : ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "leavingDate", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`salary-${index}`}>Salary</Label>
            <Input
              id={`salary-${index}`}
              type="number"
              value={exp.salary || ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "salary", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`reasonForLeaving-${index}`}>Reason for Leaving</Label>
            <Input
              id={`reasonForLeaving-${index}`}
              value={exp.reasonForLeaving || ""}
              onChange={(e) => handleNestedArrayChange("workExperience", index, "reasonForLeaving", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        onClick={() => handleAddArrayItem("workExperience", { 
          employerName: "", 
          address: "", 
          designation: "", 
          joiningDate: "", 
          leavingDate: "", 
          salary: "", 
          reasonForLeaving: "" 
        })}
        disabled={!isEditing}
        className="col-span-2"
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Work Experience
      </Button>
    </div>
  );
}