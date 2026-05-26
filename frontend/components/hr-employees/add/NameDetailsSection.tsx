import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

interface NameDetailsSectionProps {
  firstName: string;
  middleName: string;
  lastName: string;
  errors: any;
  register: any;
}

export function NameDetailsSection({
  firstName,
  middleName,
  lastName,
  errors,
  register
}: NameDetailsSectionProps) {
  return (
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
  );
}