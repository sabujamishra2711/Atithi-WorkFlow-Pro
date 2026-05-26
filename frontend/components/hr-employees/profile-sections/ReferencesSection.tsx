import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ReferencesSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedChange: (parent: string, field: string, value: any) => void;
}

export function ReferencesSection({
  form,
  isEditing,
  handleNestedChange
}: ReferencesSectionProps) {
  // Ensure references object exists and has all required properties
  const references = form.references || {
    referencedBy: "",
    name: "",
    organization: ""
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="referencedBy">Referenced By</Label>
        <Input
          id="referencedBy"
          value={references.referencedBy || ""}
          onChange={(e) => handleNestedChange("references", "referencedBy", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="name">Reference Name</Label>
        <Input
          id="name"
          value={references.name || ""}
          onChange={(e) => handleNestedChange("references", "name", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="organization">Organization</Label>
        <Input
          id="organization"
          value={references.organization || ""}
          onChange={(e) => handleNestedChange("references", "organization", e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}