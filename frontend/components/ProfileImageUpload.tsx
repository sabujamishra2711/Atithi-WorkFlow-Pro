"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X, User } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";

interface ProfileImageUploadProps {
  employee: any;
  onImageUpdate: (newImageUrl: string) => void;
}

export default function ProfileImageUpload({ employee, onImageUpdate }: ProfileImageUploadProps) {
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle profile image file selection
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Add safety check
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setProfileImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        // Add safety check
        if (e.target && e.target.result) {
          setProfileImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload profile image
  const handleUploadProfileImage = async () => {
    // Add safety checks
    if (!profileImageFile) {
      toast.error('Please select an image first');
      return;
    }

    if (!employee || !employee.empId) {
      toast.error('Employee information is missing');
      return;
    }

    setUploadingImage(true);
    try {
      console.log('Preparing to upload profile image...');
      console.log('Employee ID:', employee.empId);
      console.log('File details:', profileImageFile);

      const formData = new FormData();
      formData.append('profileImage', profileImageFile);

      console.log('FormData created with file');

      // Remove the Content-Type header to let the browser set it with the correct boundary
      console.log('Sending PATCH request to update profile image...');
      // Fix: Remove the /api/v1 prefix since it's already included in the baseURL
      const response = await api.patch(
        `/employees/${employee.empId}/profile-image`,
        formData
      );

      console.log('Profile image upload response received:', response);

      // Handle different response formats with improved safety checks
      let success = false;
      let newImageUrl = '';
      let message = '';

      // Check for successful response with different possible formats
      if (response && response.data && response.data.success) {
        success = true;
        newImageUrl = response.data.data?.profileImage ||
          response.data.data?.url ||
          response.data.employee?.profileImage ||
          response.data.profileImage || '';
        message = response.data.message || 'Profile image updated successfully!';
      } else if (response && response.data && response.data.employee && response.data.employee.profileImage) {
        // Handle alternative response format
        success = true;
        newImageUrl = response.data.employee.profileImage;
        message = 'Profile image updated successfully!';
      } else if (response && response.status >= 200 && response.status < 300) {
        // Handle success based on status code
        success = true;
        // Try to extract image URL from response
        newImageUrl = response.data?.data?.profileImage ||
          response.data?.employee?.profileImage ||
          response.data?.profileImage ||
          '';
        message = 'Profile image updated successfully!';
      }

      if (success) {
        console.log('Upload success. New image URL:', newImageUrl);

        // Add safety check for newImageUrl
        if (newImageUrl) {
          toast.success(message);

          // Update the parent component with the new image URL
          if (typeof onImageUpdate === 'function') {
            onImageUpdate(newImageUrl);
            console.log('onImageUpdate called with:', newImageUrl);
          }
        } else {
          // If we can't get the image URL, show a warning but still consider it a success
          toast.success(message);
          console.warn('Profile image updated but URL not found in response');
        }

        // Clear the preview and file
        setProfileImageFile(null);
        setProfileImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response?.data?.message || response?.data?.error || 'Failed to update profile image');
      }
    } catch (error: any) {
      console.error('Profile image upload error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to update profile image';

      // Provide specific error messages based on status code
      if (error.response?.status === 403) {
        toast.error('Permission denied: You do not have permission to update this profile image');
      } else if (error.response?.status === 404) {
        toast.error('Employee not found');
      } else if (error.response?.status === 400) {
        toast.error('Invalid request: ' + errorMessage);
      } else if (error.response?.status === 500) {
        toast.error('Server error: Please try again later');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // Cancel image selection
  const handleCancelImageSelection = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get current profile image URL
  const getCurrentImageUrl = () => {
    if (profileImagePreview) {
      console.log('Using profileImagePreview for current image URL:', profileImagePreview);
      return profileImagePreview;
    }

    // Add safety checks
    if (!employee) {
      console.log('No employee data found, returning placeholder.');
      return "/placeholder-user.jpg";
    }

    if (employee.profileImage) {
      // Handle both relative and absolute URLs
      let imageUrl;
      if (employee.profileImage.startsWith('http')) {
        imageUrl = employee.profileImage;
      } else {
        // Use relative URLs and let the API client handle the base URL
        imageUrl = employee.profileImage;
      }

      // Add cache busting parameter to force refresh
      const cacheBuster = `?t=${Date.now()}`;
      const finalImageUrl = imageUrl + cacheBuster;
      console.log('Using employee.profileImage for current image URL:', finalImageUrl);
      return finalImageUrl;
    }
    console.log('No profile image found, returning placeholder.');
    return "/placeholder-user.jpg";
  };

  // Add safety check for employee data
  if (!employee) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center py-4 text-gray-500">
              <p>Employee data not available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-600" />
          Profile Picture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          {/* Current Profile Image */}
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-gray-200 shadow-lg">
              <AvatarImage
                src={getCurrentImageUrl()}
                alt={`${employee?.firstName || 'Employee'} ${employee?.lastName || ''}`}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-100 text-gray-500 text-2xl">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>

            {/* Upload Button Overlay */}
            <Button
              size="sm"
              className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Employee Info */}
          <div className="text-center">
            <h3 className="font-semibold text-lg">
              {employee?.firstName || ''} {employee?.middleName || ''} {employee?.lastName || ''}
            </h3>
            <p className="text-sm text-gray-600">
              {employee?.empId || ''} • {employee?.department || ''} • {employee?.position || ''}
            </p>
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
            className="hidden"
          />

          {/* Image Preview and Actions */}
          {profileImagePreview && (
            <div className="w-full max-w-sm">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="text-center">
                  <img
                    src={profileImagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-full mx-auto mb-3 border-2 border-gray-200"
                  />
                  <p className="text-sm text-gray-600 mb-3">
                    {profileImageFile?.name || ''}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleUploadProfileImage}
                      disabled={uploadingImage}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelImageSelection}
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Instructions */}
          {!profileImagePreview && (
            <div className="text-center text-sm text-gray-500 max-w-sm">
              <p>Click the camera icon to upload a new profile picture.</p>
              <p className="mt-1">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}