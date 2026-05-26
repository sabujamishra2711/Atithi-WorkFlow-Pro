import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StatutorySectionProps {
  form: any;
  isEditing: boolean;
  handleChange: (field: string, value: any) => void;
}

export function StatutorySection({
  form,
  isEditing,
  handleChange
}: StatutorySectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="pan">PAN</Label>
        <Input
          id="pan"
          value={form.pan || ""}
          onChange={(e) => handleChange("pan", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="aadhaarNo">Aadhaar Number</Label>
        <Input
          id="aadhaarNo"
          value={form.aadhaarNo || ""}
          onChange={(e) => handleChange("aadhaarNo", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="uanNo">UAN Number</Label>
        <Input
          id="uanNo"
          value={form.uanNo || ""}
          onChange={(e) => handleChange("uanNo", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="pfNo">PF Number</Label>
        <Input
          id="pfNo"
          value={form.pfNo || ""}
          onChange={(e) => handleChange("pfNo", e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}