import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface LanguagesSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedArrayChange: (arrayName: string, idx: number, field: string, value: any) => void;
  handleRemoveArrayItem: (arrayName: string, idx: number) => void;
  handleAddArrayItem: (arrayName: string, emptyObj: any) => void;
}

export function LanguagesSection({
  form,
  isEditing,
  handleNestedArrayChange,
  handleRemoveArrayItem,
  handleAddArrayItem
}: LanguagesSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.languages && form.languages.map((lang: any, index: number) => (
        <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold">Language {index + 1}</h4>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveArrayItem("languages", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor={`language-${index}`}>Language</Label>
            <Input
              id={`language-${index}`}
              value={lang.language || ""}
              onChange={(e) => handleNestedArrayChange("languages", index, "language", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>
              <input
                type="checkbox"
                checked={lang.canRead || false}
                onChange={(e) => handleNestedArrayChange("languages", index, "canRead", e.target.checked)}
                disabled={!isEditing}
                className="mr-2"
              />
              Can Read
            </Label>
          </div>
          <div>
            <Label>
              <input
                type="checkbox"
                checked={lang.canWrite || false}
                onChange={(e) => handleNestedArrayChange("languages", index, "canWrite", e.target.checked)}
                disabled={!isEditing}
                className="mr-2"
              />
              Can Write
            </Label>
          </div>
          <div>
            <Label>
              <input
                type="checkbox"
                checked={lang.canSpeak || false}
                onChange={(e) => handleNestedArrayChange("languages", index, "canSpeak", e.target.checked)}
                disabled={!isEditing}
                className="mr-2"
              />
              Can Speak
            </Label>
          </div>
        </div>
      ))}
      <Button
        type="button"
        onClick={() => handleAddArrayItem("languages", { 
          language: "",
          canRead: false,
          canWrite: false,
          canSpeak: false
        })}
        disabled={!isEditing}
        className="col-span-2"
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Language
      </Button>
    </div>
  );
}