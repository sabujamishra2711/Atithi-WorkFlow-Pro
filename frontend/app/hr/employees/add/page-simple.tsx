import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { CompensationSection } from "@/components/hr-employees/add/CompensationSection";

interface FormData {
  empId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherName: string;
  joiningDate: string;
  email: string;
  mobile: string;
  monthlySalary: string;
  password: string;
  employeeCategory: string;
  department: string;
  position: string;
  status: string;
  // Note: effectiveFrom is not part of FormData as it's handled separately
}

export default function SimpleAddEmployeePage() {
  const [empIdOptions, setEmpIdOptions] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [isFetchingEmpId, setIsFetchingEmpId] = useState(false);
  // Add state for effective date fields
  const [effectiveMonth, setEffectiveMonth] = useState("");
  const [effectiveYear, setEffectiveYear] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      department: "",
      position: "",
      status: "Active",
      employeeCategory: "",
    }
  });

  // Debounced fetch function to prevent excessive API calls
  const fetchEmpId = useCallback(async () => {
    if (isFetchingEmpId) return; // Prevent multiple simultaneous requests

    setIsFetchingEmpId(true);
    try {
      // Use relative paths that work in both development and production environments
      const res = await fetch(
        autoGenerate
          ? "/api/v1/users/generate-emp-id"
          : "/api/v1/users/missing-emp-ids"
      );
      const data = await res.json();

      if (autoGenerate) {
        setValue("empId", data.empId || "");
      } else {
        setEmpIdOptions(data.missingEmpIds || []);
        setValue("empId", "");
      }
    } catch (err) {
      console.error("EmpId fetch failed", err);
      toast({
        title: "Error",
        description: "Failed to fetch employee ID information",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEmpId(false);
    }
  }, [autoGenerate, isFetchingEmpId, setValue]);

  // Fetch generated or missing empIds with proper dependency handling
  useEffect(() => {
    fetchEmpId();
  }, [autoGenerate, fetchEmpId]);

  const onSubmit = async (data: FormData) => {
    try {
      // Validate joining date
      if (!data.joiningDate) {
        toast({
          title: "Validation Error",
          description: "Joining date is required",
          variant: "destructive",
        });
        return;
      }

      // Prepare the payload
      const payload: any = {
        ...data,
        shiftDetails: {
          workHoursPerDay: 8,
          weeklyOff: 'Sunday',
          type: 'Full-time'
        }
      };

      // Handle salary effective date - only include if both month and year are selected
      // This is an additive change that maintains backward compatibility
      if (effectiveMonth && effectiveYear) {
        // Create a date string for the first day of the selected month/year
        const effectiveDate = new Date(`${effectiveYear}-${effectiveMonth}-01T00:00:00.000Z`);
        // Add the effectiveFrom field to the payload
        payload.effectiveFrom = effectiveDate.toISOString();
      }

      // Use relative path that works in both development and production environments
      const res = await fetch("/api/v1/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.data) {
        toast({
          title: "Employee Registered Successfully",
          description: `Employee ${result.data.firstName} ${result.data.lastName} has been registered with ID: ${result.data.empId}`,
        });
        // Reset the form after success
        setValue("empId", "");
        setValue("firstName", "");
        setValue("middleName", "");
        setValue("lastName", "");
        setValue("fatherName", "");
        setValue("email", "");
        setValue("mobile", "");
        setValue("monthlySalary", "");
        setValue("password", "");
        setValue("employeeCategory", "");
        setValue("department", "");
        setValue("position", "");
        setValue("status", "Active");
        // Reset effective date fields
        setEffectiveMonth("");
        setEffectiveYear("");
      } else {
        toast({
          title: "Registration Failed",
          description: result.message || result.error || "There was an error registering the employee. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error?.message || "There was an error registering the employee. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">Add New Employee</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-8 max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee ID */}
          <Card>
            <CardHeader>
              <CardTitle>Employee ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoGenerate">Auto-generate Employee ID</Label>
                <Switch
                  id="autoGenerate"
                  checked={autoGenerate}
                  onCheckedChange={(value) => setAutoGenerate(value)}
                />
              </div>

              {!autoGenerate && (
                <div>
                  <Label>Select from missing Employee IDs</Label>
                  {isFetchingEmpId ? (
                    <div className="w-full border p-2 rounded flex items-center justify-center">
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Loading IDs...
                    </div>
                  ) : empIdOptions.length > 0 ? (
                    <select
                      className="w-full border p-2 rounded"
                      onChange={(e) => {
                        setValue("empId", e.target.value);
                      }}
                      value={watch("empId") || ""}
                    >
                      <option value="">-- Select an ID --</option>
                      {empIdOptions.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full border p-2 rounded text-gray-500">
                      No missing IDs available
                    </div>
                  )}
                </div>
              )}

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
                  readOnly={autoGenerate}
                  className={autoGenerate ? "bg-gray-100" : ""}
                  placeholder={autoGenerate ? "" : "Enter manually like A0000001"}
                />
                {errors.empId && (
                  <p className="text-red-500 text-sm">{errors.empId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName", { required: "First name is required" })}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    {...register("middleName")}
                    placeholder="Enter middle name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName", { required: "Last name is required" })}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  {...register("fatherName", { required: "Father's name is required" })}
                  placeholder="Enter father's name"
                />
                {errors.fatherName && (
                  <p className="text-red-500 text-sm">{errors.fatherName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date *</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    {...register("joiningDate", { required: "Joining date is required" })}
                  />
                  {errors.joiningDate && (
                    <p className="text-red-500 text-sm">{errors.joiningDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeCategory">Category *</Label>
                  <Select
                    name="employeeCategory"
                    onValueChange={value => setValue("employeeCategory", value)}
                    value={watch("employeeCategory") || ""}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFFS(OFFICE)">STAFFS(OFFICE)</SelectItem>
                      <SelectItem value="STAFFS(PLANT)">STAFFS(PLANT)</SelectItem>
                      <SelectItem value="WORKERS (PLANT)">WORKERS (PLANT)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employeeCategory && (
                    <p className="text-red-500 text-xs mt-1">Employee category is required.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    {...register("mobile", {
                      required: "Mobile number is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Mobile number must be 10 digits"
                      }
                    })}
                    placeholder="Enter 10-digit mobile number"
                  />
                  {errors.mobile && (
                    <p className="text-red-500 text-sm">{errors.mobile.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    {...register("department")}
                    placeholder="Enter department"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    {...register("position")}
                    placeholder="Enter position"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    onValueChange={value => setValue("status", value)}
                    value={watch("status") || "Active"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <CompensationSection
            monthlySalary={watch("monthlySalary")}
            password={watch("password")}
            errors={errors}
            register={register}
            effectiveMonth={effectiveMonth}
            effectiveYear={effectiveYear}
            onEffectiveMonthChange={setEffectiveMonth}
            onEffectiveYearChange={setEffectiveYear}
          />

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}