import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

interface EmployeeIdSectionProps {
  autoGenerate: boolean;
  setAutoGenerate: (value: boolean) => void;
  isFetchingEmpId: boolean;
  fetchError: string | null;
  retryCount: number;
  fetchEmpId: () => void;
  empIdOptions: string[];
  empId: string;
  setEmpId: (value: string) => void;
  errors: any;
  register: any;
}

export function EmployeeIdSection({
  autoGenerate,
  setAutoGenerate,
  isFetchingEmpId,
  fetchError,
  retryCount,
  fetchEmpId,
  empIdOptions,
  empId,
  setEmpId,
  errors,
  register
}: EmployeeIdSectionProps) {
  // Memoize the empId options to prevent unnecessary re-renders
  const empIdSelectOptions = React.useMemo(() => {
    return empIdOptions.map((id) => (
      <option key={id} value={id}>{id}</option>
    ));
  }, [empIdOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee ID</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="autoGenerate">Auto-generate Employee ID</Label>
          <Switch
            id="autoGenerate"
            checked={autoGenerate}
            onCheckedChange={(value) => setAutoGenerate(value)}
          />
        </div>

        {/* Missing ID Selector (only if manual mode) */}
        {!autoGenerate && (
          <div>
            <Label>Select from missing Employee IDs</Label>
            {isFetchingEmpId ? (
              <div className="w-full border p-2 rounded flex items-center justify-center">
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Loading IDs... {retryCount > 0 && `(Retry ${retryCount}/3)`}
              </div>
            ) : fetchError ? (
              <div className="w-full border p-2 rounded text-red-500 flex items-center justify-between">
                <span>{fetchError}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchEmpId()}
                  disabled={isFetchingEmpId}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  className="w-full border p-2 rounded"
                  onChange={(e) => {
                    setEmpId(e.target.value);
                  }}
                  value={empId || ""}
                >
                  <option value="">-- Select an ID --</option>
                  {empIdSelectOptions}
                </select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchEmpId()}
                  disabled={isFetchingEmpId}
                  className="w-full"
                >
                  Refresh Missing IDs
                </Button>
              </div>
            )}

            {empIdOptions.length >= 50 && (
              <p className="text-sm text-gray-500 mt-1">
                Showing first 50 missing IDs. Contact admin for more.
              </p>
            )}
          </div>
        )}

        {/* Input Field */}
        <div className="space-y-2">
          <Label htmlFor="empId">Employee ID</Label>
          <Input
            id="empId"
            {...register("empId", {
              required: "Employee ID is required",
              minLength: { value: 8, message: "Must be 8 characters" },
              maxLength: { value: 8, message: "Must be 8 characters" },
              pattern: {
                value: /^A\d{7}$/,
                message: "Format should be like A0000001",
              },
            })}
            placeholder="A0000001"
            readOnly={autoGenerate}
            className={autoGenerate ? "bg-gray-100" : ""}
          />
          {errors.empId && (
            <p className="text-red-500 text-sm">{errors.empId.message}</p>
          )}
          <p className="text-sm text-gray-500">
            Format: A followed by 7 digits (e.g., A0000001)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}