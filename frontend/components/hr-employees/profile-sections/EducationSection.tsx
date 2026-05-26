import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface EducationSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedArrayChange: (arrayName: string, idx: number, field: string, value: any) => void;
  handleRemoveArrayItem: (arrayName: string, idx: number) => void;
  handleAddArrayItem: (arrayName: string, emptyObj: any) => void;
}

export function EducationSection({
  form,
  isEditing,
  handleNestedArrayChange,
  handleRemoveArrayItem,
  handleAddArrayItem
}: EducationSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.education && Array.isArray(form.education) && form.education.length > 0 ? (
        form.education.map((edu: any, index: number) => {
          return (
            <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold">Education {index + 1}</h4>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveArrayItem("education", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`courseName-${index}`}>Course Name</Label>
                  <Input
                    id={`courseName-${index}`}
                    value={edu.courseName || ""}
                    onChange={(e) => handleNestedArrayChange("education", index, "courseName", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter course name"
                  />
                </div>
                <div>
                  <Label htmlFor={`institution-${index}`}>Institution</Label>
                  <Input
                    id={`institution-${index}`}
                    value={edu.institution || ""}
                    onChange={(e) => handleNestedArrayChange("education", index, "institution", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter institution name"
                  />
                </div>
                <div>
                  <Label htmlFor={`passingYear-${index}`}>Passing Year</Label>
                  <Input
                    id={`passingYear-${index}`}
                    value={edu.passingYear || ""}
                    onChange={(e) => handleNestedArrayChange("education", index, "passingYear", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter passing year"
                  />
                </div>
                <div>
                  <Label htmlFor={`marksPercentage-${index}`}>Marks/Percentage</Label>
                  <Input
                    id={`marksPercentage-${index}`}
                    value={edu.marksPercentage || ""}
                    onChange={(e) => handleNestedArrayChange("education", index, "marksPercentage", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter marks/percentage"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor={`specialization-${index}`}>Specialization</Label>
                  <Input
                    id={`specialization-${index}`}
                    value={edu.specialization || ""}
                    onChange={(e) => handleNestedArrayChange("education", index, "specialization", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter specialization"
                  />
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-2 text-center py-8 text-gray-500">
          <p>No education records found.</p>
          <p className="text-sm text-gray-400 mt-2">
            {form.education ? `Array length: ${form.education.length}` : 'Education field not initialized'}
          </p>
          {isEditing && (
            <Button
              type="button"
              onClick={() => {
                handleAddArrayItem("education", {
                  courseName: "",
                  institution: "",
                  passingYear: "",
                  marksPercentage: "",
                  specialization: ""
                });
              }}
              className="mt-2"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Education Record
            </Button>
          )}
        </div>
      )}
      {isEditing && form.education && Array.isArray(form.education) && form.education.length > 0 && (
        <Button
          type="button"
          onClick={() => {
            handleAddArrayItem("education", {
              courseName: "",
              institution: "",
              passingYear: "",
              marksPercentage: "",
              specialization: ""
            });
          }}
          disabled={!isEditing}
          className="col-span-2"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      )}
    </div>
  );
}