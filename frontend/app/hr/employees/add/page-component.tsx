"use client"

import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  EmployeeIdSection,
  EmployeeCategorySection,
  NameDetailsSection,
  PersonalInfoSection,
  EmploymentDetailsSection,
  CompensationSection,
  SaveButton
} from "@/components/hr-employees";
import { Loader } from "lucide-react";

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
}

export default function ComponentBasedAddEmployeePage() {
  const [empIdOptions, setEmpIdOptions] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [isFetchingEmpId, setIsFetchingEmpId] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      department: "",
      position: "",
      status: "Active",
      employeeCategory: "",
    }
  });

  // Get current form values
  const formData = watch();

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

      const payload = {
        ...data,
        shiftDetails: {
          workHoursPerDay: 8,
          weeklyOff: 'Sunday',
          type: 'Full-time'
        }
      };

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
            <EmployeeIdSection
              autoGenerate={autoGenerate}
              setAutoGenerate={setAutoGenerate}
              isFetchingEmpId={isFetchingEmpId}
              fetchError={null}
              retryCount={0}
              fetchEmpId={fetchEmpId}
              empIdOptions={empIdOptions}
              empId={formData.empId}
              setEmpId={(value) => setValue("empId", value)}
              errors={errors}
              register={register}
            />

            <EmployeeCategorySection
              employeeCategory={formData.employeeCategory}
              setEmployeeCategory={(value) => setValue("employeeCategory", value)}
              errors={errors}
            />

            <NameDetailsSection
              firstName={formData.firstName}
              middleName={formData.middleName}
              lastName={formData.lastName}
              errors={errors}
              register={register}
            />

            <PersonalInfoSection
              fatherName={formData.fatherName}
              joiningDate={formData.joiningDate}
              email={formData.email}
              mobile={formData.mobile}
              errors={errors}
              register={register}
            />

            <EmploymentDetailsSection
              department={formData.department}
              position={formData.position}
              status={formData.status}
              setDepartment={(value) => setValue("department", value)}
              setPosition={(value) => setValue("position", value)}
              setStatus={(value) => setValue("status", value)}
            />

            <CompensationSection
              monthlySalary={formData.monthlySalary}
              password={formData.password}
              errors={errors}
              register={register}
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <SaveButton 
                loading={isSubmitting}
                type="submit"
              >
                Save Employee
              </SaveButton>
            </div>
          </form>
        </div>
    </div>
  );
}