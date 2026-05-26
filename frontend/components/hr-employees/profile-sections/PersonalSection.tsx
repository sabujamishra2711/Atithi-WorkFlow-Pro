import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import type React from "react";

interface PersonalSectionProps {
  form: any;
  isEditing: boolean;
  handleChange: (field: string, value: any) => void;
  handleProfileImageUpdate: (newImageUrl: string) => void;
  selectedEmployee: any;
}

const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function PersonalSection({
  form,
  isEditing,
  handleChange,
  handleProfileImageUpdate,
  selectedEmployee
}: PersonalSectionProps) {
  // Add safety checks
  if (!form || !selectedEmployee) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Employee data not available</p>
      </div>
    );
  }

  // Safe access to form properties with better fallbacks
  const firstName = form.firstName || "";
  const middleName = form.middleName || "";
  const lastName = form.lastName || "";
  const email = form.email || "";
  const mobile = form.mobile || form.phone || "";
  const dob = form.dob || "";
  const gender = form.gender || "";
  const fatherName = form.fatherName || "";
  const bloodGroup = form.bloodGroup || "";
  const maritalStatus = form.maritalStatus || "";
  const nationality = form.nationality || "";
  const presentAddress = form.presentAddress || "";
  const currentAddress = form.currentAddress || "";

  // Handle date formatting safely
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <ProfileImageUpload
          employee={selectedEmployee}
          onImageUpdate={handleProfileImageUpdate}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="middleName">Middle Name</Label>
          <Input
            id="middleName"
            value={middleName}
            onChange={(e) => handleChange("middleName", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleChange("email", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input
            id="mobile"
            value={mobile}
            onChange={(e) => {
              handleChange("mobile", e.target.value);
              handleChange("phone", e.target.value); // Backward compatibility
            }}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={formatDateForInput(dob)}
            onChange={(e) => handleChange("dob", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            disabled={!isEditing}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Gender</option>
            {genderOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fatherName">Father's Name</Label>
          <Input
            id="fatherName"
            value={fatherName}
            onChange={(e) => handleChange("fatherName", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="bloodGroup">Blood Group</Label>
          <select
            id="bloodGroup"
            value={bloodGroup}
            onChange={(e) => handleChange("bloodGroup", e.target.value)}
            disabled={!isEditing}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Blood Group</option>
            {bloodGroupOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <select
            id="maritalStatus"
            value={maritalStatus}
            onChange={(e) => handleChange("maritalStatus", e.target.value)}
            disabled={!isEditing}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            value={nationality}
            onChange={(e) => handleChange("nationality", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="presentAddress">Present Address</Label>
          <Input
            id="presentAddress"
            value={presentAddress}
            onChange={(e) => handleChange("presentAddress", e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="currentAddress">Current Address</Label>
          <Input
            id="currentAddress"
            value={currentAddress}
            onChange={(e) => handleChange("currentAddress", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );
}