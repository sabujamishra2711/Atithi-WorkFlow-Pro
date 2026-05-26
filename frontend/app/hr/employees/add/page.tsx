"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, User, GraduationCap, Briefcase, Users, CreditCard, Heart, FileText, Shield, Upload, Image, Trash2, PlusCircle, Loader, Check, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import api from '@/lib/apiClient';

interface FormData {
  // Profile Image
  profileImage: File | null;
  profileImagePreview: string;

  // Employee ID
  empId: string;

  // Name Details
  firstName: string;
  middleName: string;
  lastName: string;

  // Essential Personal Information
  fatherName: string;
  joiningDate: Date | null;
  email: string;
  mobile: string;
  monthlySalary: string;
  password: string;
  employeeCategory: string;

  // Employment Details
  department: string;
  position: string;
  status: string;

  // Simple fields that can be added later
  workingHours?: string;
  employeeType?: string;
}

export default function AddEmployeePage() {

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [empIdOptions, setEmpIdOptions] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [isFetchingEmpId, setIsFetchingEmpId] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchTimeoutId, setFetchTimeoutId] = useState<NodeJS.Timeout | null>(null); // For debouncing

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      profileImage: null,
      profileImagePreview: "",
      department: "",
      position: "",
      status: "Active",
      employeeCategory: "",
      workingHours: "8hrs",
      employeeType: "weeklyOff"
    }
  });

  // Debounced fetch function with better logging and error handling
  const fetchEmpId = useCallback(async (retryAttempt = 0) => {
    // Clear any existing timeout
    if (fetchTimeoutId) {
      clearTimeout(fetchTimeoutId);
      setFetchTimeoutId(null);
    }

    // Set a new timeout to debounce the function call
    const timeoutId = setTimeout(async () => {
      // Use relative paths that work in both development and production environments
      const url = autoGenerate
        ? "/add-employee/generate-emp-id"
        : "/add-employee/missing-emp-ids";

      console.log(`Making request to: ${url}`);

      try {
        const res = await api.get(url);

        const data = res.data;
        console.log('Received data:', data);

        if (autoGenerate) {
          setValue("empId", data.empId || "");
          console.log(`Set auto-generated empId: ${data.empId}`);
        } else {
          // Limit the number of options to prevent UI lag
          const limitedOptions = (data.missingEmpIds || []).slice(0, 50);
          setEmpIdOptions(limitedOptions);
          setValue("empId", "");
          console.log(`Set ${limitedOptions.length} missing empId options`);
        }

        // Reset retry count on success
        setRetryCount(0);
        setFetchError(null);
      } catch (err: any) {
        console.error("EmpId fetch failed:", err);

        const errorMessage = err.message || "Failed to fetch employee ID information";

        setFetchError(errorMessage);

        // Retry logic (max 3 retries)
        if (retryAttempt < 3) {
          const retryDelay = 1000 * (retryAttempt + 1); // Exponential backoff
          console.log(`Retrying in ${retryDelay}ms (attempt ${retryAttempt + 1}/3)`);
          setTimeout(() => {
            fetchEmpId(retryAttempt + 1);
          }, retryDelay);
          setRetryCount(retryAttempt + 1);
        } else {
          console.log('Max retries reached, showing error toast');
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
            icon: <X className="h-5 w-5 text-red-500" />,
          });

          // Reset state on final error
          if (!autoGenerate) {
            setEmpIdOptions([]);
            setValue("empId", "");
          }
        }
      } finally {
        setIsFetchingEmpId(false);
        setFetchTimeoutId(null); // Clear the timeout ID
      }
    }, 300); // 300ms debounce delay

    setFetchTimeoutId(timeoutId);
  }, [autoGenerate, setValue]); // Simplified dependencies - removed fetchTimeoutId and isFetchingEmpId to prevent dependency issues

  // Fetch generated or missing empIds with proper dependency handling
  useEffect(() => {
    // Reset error state when mode changes
    setFetchError(null);
    setRetryCount(0);

    // Only fetch if we haven't exceeded retry attempts
    if (retryCount < 3) {
      fetchEmpId();
    }
  }, [autoGenerate, retryCount, fetchEmpId]); // Added fetchEmpId to dependencies

  // Cleanup function to clear timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
      }
    };
  }, [fetchTimeoutId]);

  const onSubmit = async (data: FormData) => {
    try {
      // Validate joining date
      if (!data.joiningDate) {
        toast({
          title: "Validation Error",
          description: "Joining date is required",
          variant: "destructive",
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        });
        return;
      }

      // Map workingHours to shiftDetails structure
      const workHoursMap = {
        '8hrs': 8,
        '12hrs': 12,
        'general': 8 // Default to 8 hours for general
      };

      const payload = {
        ...data,
        profileImageUrl: profileImage || data.profileImage, // Use state value or form value
        profileImage: undefined, // Remove file object
        profileImagePreview: undefined, // Remove preview field
        shiftDetails: {
          workHoursPerDay: workHoursMap[data.workingHours as keyof typeof workHoursMap] || 8,
          weeklyOff: 'Sunday', // Default to Sunday
          type: 'Full-time'
        }
      };

      // Update the API endpoint to use relative path
      const res = await api.post("/add-employee/register", payload);

      const result = res.data;

      if (result.data) {
        toast({
          title: "Saved",
          description: "Employee details saved successfully",
          icon: <Check className="h-5 w-5 text-green-500" />,
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
        setProfileImage(null);
      } else {
        toast({
          title: "Failed to save",
          description: result.message || result.error || "There was an error saving the employee. Please try again.",
          variant: "destructive",
          icon: <X className="h-5 w-5 text-red-500" />,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.response?.data?.message || error?.message || "There was an error saving the employee. Please try again.",
        variant: "destructive",
        icon: <X className="h-5 w-5 text-red-500" />,
      });
    }
  };


  const handleImageUpload = async (file: File, empId: string) => {
    setImageLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empId", empId);

    console.log(file);

    // Update the API endpoint to use relative path
    const res = await api.post("/add-employee/upload-profile-image", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = res.data;
    setProfileImage(data.url);
    setImageLoading(false);
    return data.url; // from backend
  };

  // Memoize the empId options to prevent unnecessary re-renders
  const empIdSelectOptions = useMemo(() => {
    return empIdOptions.map((id) => (
      <option key={id} value={id}>{id}</option>
    ));
  }, [empIdOptions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">Employee Registration</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-8 max-w-7xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Employee ID */}
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
                          setValue("empId", e.target.value);
                        }}
                        value={watch("empId") || ""}
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

          {/* Employee Category */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeCategory">Category <span className="text-red-500">*</span></Label>
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
            </CardContent>
          </Card>

          {/* Name Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Name Details</CardTitle>
              </div>
              <CardDescription>Employee's full name information</CardDescription>
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
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Essential personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Compensation & Security */}
          <Card>
            <CardHeader>
              <CardTitle>Compensation & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">Monthly Salary *</Label>
                  <Input
                    id="monthlySalary"
                    type="number"
                    {...register("monthlySalary", {
                      required: "Monthly salary is required",
                      min: { value: 0, message: "Salary must be positive" }
                    })}
                    placeholder="Enter monthly salary"
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
                      minLength: { value: 6, message: "Password must be at least 6 characters" }
                    })}
                    placeholder="Enter password"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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