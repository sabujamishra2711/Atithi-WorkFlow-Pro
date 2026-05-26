import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface FamilySectionProps {
  form: any;
  isEditing: boolean;
  handleNestedArrayChange: (arrayName: string, idx: number, field: string, value: any) => void;
  handleRemoveArrayItem: (arrayName: string, idx: number) => void;
  handleAddArrayItem: (arrayName: string, emptyObj: any) => void;
}

export function FamilySection({
  form,
  isEditing,
  handleNestedArrayChange,
  handleRemoveArrayItem,
  handleAddArrayItem
}: FamilySectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.familyDetails && form.familyDetails.map((family: any, index: number) => (
        <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold">Family Member {index + 1}</h4>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveArrayItem("familyDetails", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor={`name-${index}`}>Name</Label>
            <Input
              id={`name-${index}`}
              value={family.name || ""}
              onChange={(e) => handleNestedArrayChange("familyDetails", index, "name", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`age-${index}`}>Age</Label>
            <Input
              id={`age-${index}`}
              value={family.age || ""}
              onChange={(e) => handleNestedArrayChange("familyDetails", index, "age", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`occupation-${index}`}>Occupation</Label>
            <Input
              id={`occupation-${index}`}
              value={family.occupation || ""}
              onChange={(e) => handleNestedArrayChange("familyDetails", index, "occupation", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`relation-${index}`}>Relation</Label>
            <Input
              id={`relation-${index}`}
              value={family.relation || ""}
              onChange={(e) => handleNestedArrayChange("familyDetails", index, "relation", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`otherDetails-${index}`}>Other Details</Label>
            <Input
              id={`otherDetails-${index}`}
              value={family.otherDetails || ""}
              onChange={(e) => handleNestedArrayChange("familyDetails", index, "otherDetails", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        onClick={() => handleAddArrayItem("familyDetails", { 
          name: "", 
          age: "", 
          occupation: "", 
          relation: "", 
          otherDetails: "" 
        })}
        disabled={!isEditing}
        className="col-span-2"
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Family Member
      </Button>
    </div>
  );
}