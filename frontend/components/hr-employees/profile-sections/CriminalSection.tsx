import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CriminalSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedChange: (parent: string, field: string, value: any) => void;
}

export function CriminalSection({
  form,
  isEditing,
  handleNestedChange
}: CriminalSectionProps) {
  // Ensure criminalRecord object exists with all required properties
  const criminalRecord = form.criminalRecord || {
    hasCriminalRecord: "",
    details: ""
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="hasCriminalRecord">Has Criminal Record?</Label>
        <select
          id="hasCriminalRecord"
          value={criminalRecord.hasCriminalRecord ?? ""}
          onChange={(e) => handleNestedChange("criminalRecord", "hasCriminalRecord", e.target.value)}
          disabled={!isEditing}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
      
      {criminalRecord.hasCriminalRecord === "Yes" && (
        <div className="col-span-2">
          <Label htmlFor="details">Details</Label>
          <Input
            id="details"
            value={criminalRecord.details || ""}
            onChange={(e) => handleNestedChange("criminalRecord", "details", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      )}
    </div>
  );
}