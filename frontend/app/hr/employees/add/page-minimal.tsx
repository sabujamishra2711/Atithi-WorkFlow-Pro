"use client"

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface FormData {
  empId: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  joiningDate: string;
  email: string;
  mobile: string;
  monthlySalary: string;
  password: string;
  employeeCategory: string;
}

export default function MinimalAddEmployeePage() {
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

  // Generate employee ID on component mount and when toggle changes
  React.useEffect(() => {
    if (autoGenerate) {
      generateEmpId();
    } else {
      setValue("empId", "");
    }
  }, [autoGenerate]);

  const generateEmpId = async () => {
    try {
      // Use relative path that works in both development and production environments
      const res = await fetch("/api/v1/users/generate-emp-id");
      const data = await res.json();
      setValue("empId", data.empId || "");
    } catch (err) {
      console.error("Failed to generate emp ID", err);
      toast({
        title: "Error",
        description: "Failed to generate employee ID",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        department: "",
        position: "",
        status: "Active",
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
          title: "Employee Registered",
          description: `Employee ${result.data.firstName} registered with ID: ${result.data.empId}`,
        });
        // Reset form
        setValue("firstName", "");
        setValue("lastName", "");
        setValue("fatherName", "");
        setValue("email", "");
        setValue("mobile", "");
        setValue("monthlySalary", "");
        setValue("password", "");
        if (autoGenerate) {
          generateEmpId(); // Generate new ID
        } else {
          setValue("empId", "");
        }
      } else {
        throw new Error(result.message || "Registration failed");
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error?.message || "Failed to register employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Add New Employee</h1>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>Enter basic employee details</CardDescription>
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

              <div className="space-y-2">
                <Label htmlFor="empId">Employee ID *</Label>
                <Input
                  id="empId"
                  {...register("empId", {
                    required: "Employee ID is required",
                    minLength: { value: 8, message: "Must be 8 characters" },
                    maxLength: { value: 8, message: "Must be 8 characters" },
                    pattern: {
                      value: /^A\d{7}$/,
                      message: "Format: A followed by 7 digits",
                    },
                  })}
                  readOnly={autoGenerate}
                  className={autoGenerate ? "bg-gray-100" : ""}
                />
                {errors.empId && (
                  <p className="text-red-500 text-sm">{errors.empId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName", { required: "First name is required" })}
                    placeholder="First name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName", { required: "Last name is required" })}
                    placeholder="Last name"
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
                  placeholder="Father's name"
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
                    onValueChange={value => setValue("employeeCategory", value)}
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
                    <p className="text-red-500 text-sm">{errors.employeeCategory.message}</p>
                  )}
                </div>
              </div>

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
                    placeholder="Email address"
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
                        message: "10-digit mobile number"
                      }
                    })}
                    placeholder="10-digit mobile"
                  />
                  {errors.mobile && (
                    <p className="text-red-500 text-sm">{errors.mobile.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">Monthly Salary *</Label>
                  <Input
                    id="monthlySalary"
                    type="number"
                    {...register("monthlySalary", { 
                      required: "Salary is required",
                      min: { value: 0, message: "Must be positive" }
                    })}
                    placeholder="Monthly salary"
                  />
                  {errors.monthlySalary && (
                    <p className="text-red-500 text-sm">{errors.monthlySalary.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { 
                      required: "Password is required",
                      minLength: { value: 6, message: "At least 6 characters" }
                    })}
                    placeholder="Password"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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