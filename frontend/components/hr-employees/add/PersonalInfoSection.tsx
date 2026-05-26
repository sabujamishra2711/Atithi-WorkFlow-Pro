import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PersonalInfoSectionProps {
  fatherName: string;
  joiningDate: string;
  email: string;
  mobile: string;
  errors: any;
  register: any;
}

export function PersonalInfoSection({
  fatherName,
  joiningDate,
  email,
  mobile,
  errors,
  register
}: PersonalInfoSectionProps) {
  return (
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
  );
}