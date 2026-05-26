import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface OtherSectionProps {
  form: any;
  isEditing: boolean;
  handleChange: (field: string, value: any) => void;
}

export function OtherSection({
  form,
  isEditing,
  handleChange
}: OtherSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="extracurricular">Extracurricular Activities</Label>
        <Input
          id="extracurricular"
          value={form.extracurricular || ""}
          onChange={(e) => handleChange("extracurricular", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="hobbies">Hobbies</Label>
        <Input
          id="hobbies"
          value={form.hobbies || ""}
          onChange={(e) => handleChange("hobbies", e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}