import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface EmergencySectionProps {
  form: any;
  isEditing: boolean;
  handleNestedArrayChange: (arrayName: string, idx: number, field: string, value: any) => void;
  handleRemoveArrayItem: (arrayName: string, idx: number) => void;
  handleAddArrayItem: (arrayName: string, emptyObj: any) => void;
}

export function EmergencySection({
  form,
  isEditing,
  handleNestedArrayChange,
  handleRemoveArrayItem,
  handleAddArrayItem
}: EmergencySectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.emergencyContacts && form.emergencyContacts.map((contact: any, index: number) => (
        <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold">Emergency Contact {index + 1}</h4>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveArrayItem("emergencyContacts", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor={`name-${index}`}>Name</Label>
            <Input
              id={`name-${index}`}
              value={contact.name || ""}
              onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "name", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`relation-${index}`}>Relation</Label>
            <Input
              id={`relation-${index}`}
              value={contact.relation || ""}
              onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "relation", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`mobile-${index}`}>Mobile</Label>
            <Input
              id={`mobile-${index}`}
              value={contact.mobile || ""}
              onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "mobile", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor={`address-${index}`}>Address</Label>
            <Input
              id={`address-${index}`}
              value={contact.address || ""}
              onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "address", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        onClick={() => handleAddArrayItem("emergencyContacts", { 
          name: "", 
          relation: "", 
          mobile: "", 
          address: "" 
        })}
        disabled={!isEditing}
        className="col-span-2"
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Emergency Contact
      </Button>
    </div>
  );
}