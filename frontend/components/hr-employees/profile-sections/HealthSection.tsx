import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface HealthSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedChange: (parent: string, field: string, value: any) => void;
}

export function HealthSection({
  form,
  isEditing,
  handleNestedChange
}: HealthSectionProps) {
  // Ensure health object exists with all required properties
  const health = form.health || {
    majorIllness: "",
    physicalDefect: ""
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="majorIllness">Major Illness</Label>
        <Input
          id="majorIllness"
          value={health.majorIllness || ""}
          onChange={(e) => handleNestedChange("health", "majorIllness", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="physicalDefect">Physical Defect</Label>
        <Input
          id="physicalDefect"
          value={health.physicalDefect || ""}
          onChange={(e) => handleNestedChange("health", "physicalDefect", e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}