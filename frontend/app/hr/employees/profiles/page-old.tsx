"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Briefcase, Banknote, Book, Users, Phone, Activity, Globe, Heart, Shield, Star, MoreHorizontal, ChevronDown, Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type React from "react";
import ProfileImageUpload from "@/components/ProfileImageUpload";
// @ts-ignore
import html2pdf from "html2pdf.js";

const sectionList = ["personal", "employment", "bank", "statutory", "education", "family", "emergency", "work", "languages", "criminal", "health", "references", "other"];

const sectionIcons: { [key: string]: React.ReactElement } = {
  personal: <User className="h-4 w-4 mr-1 text-blue-600" />,
  employment: <Briefcase className="h-4 w-4 mr-1 text-green-600" />,
  bank: <Banknote className="h-4 w-4 mr-1 text-yellow-600" />,
  statutory: <Shield className="h-4 w-4 mr-1 text-gray-600" />,
  education: <Book className="h-4 w-4 mr-1 text-purple-600" />,
  family: <Users className="h-4 w-4 mr-1 text-pink-600" />,
  emergency: <Phone className="h-4 w-4 mr-1 text-red-600" />,
  work: <Activity className="h-4 w-4 mr-1 text-orange-600" />,
  languages: <Globe className="h-4 w-4 mr-1 text-cyan-600" />,
  criminal: <Shield className="h-4 w-4 mr-1 text-gray-600" />,
  health: <Heart className="h-4 w-4 mr-1 text-rose-600" />,
  references: <Star className="h-4 w-4 mr-1 text-amber-600" />,
  other: <MoreHorizontal className="h-4 w-4 mr-1 text-muted-foreground" />,
};

const getStatusBadge = (status: string) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  if (status.toLowerCase() === "active") return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
  if (status.toLowerCase() === "on leave") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">On Leave</Badge>;
  if (status.toLowerCase() === "inactive") return <Badge className="bg-red-100 text-red-700 border-red-200">Inactive</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function EmployeeProfilesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [currentTab, setCurrentTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState(""); // New state for employee search

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) return employees;

    const term = employeeSearchTerm.toLowerCase().trim();
    return employees.filter(emp => {
      const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.toLowerCase().trim();
      return (
        emp.empId.toLowerCase().includes(term) ||
        fullName.includes(term) ||
        (emp.department && emp.department.toLowerCase().includes(term)) ||
        (emp.position && emp.position.toLowerCase().includes(term))
      );
    });
  }, [employees, employeeSearchTerm]);

  // Profile image upload states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const getProfileImageUrl = (employee: any) => {
    if (employee?.profileImage) {
      if (employee.profileImage.startsWith('http')) {
        return employee.profileImage;
      } else {
        const baseUrl = process.env.NODE_ENV === 'production'
          ? 'https://atithi-workflow-pro.onrender.com'
          : 'http://localhost:8000';
        return `${baseUrl}${employee.profileImage}?t=${Date.now()}`;
      }
    }
    return "/placeholder-user.jpg";
  };

  // Handle profile image update
  const handleProfileImageUpdate = (newImageUrl: string) => {
    console.log('handleProfileImageUpdate called with newImageUrl:', newImageUrl);
    // Update the selected employee's profile image
    setSelectedEmployee((prev: any) => {
      const updatedPrev = {
        ...prev,
        profileImage: newImageUrl
      };
      console.log('setSelectedEmployee updated to:', updatedPrev);
      return updatedPrev;
    });

    // Update the form data
    setForm((prev: any) => {
      const updatedForm = {
        ...prev,
        profileImage: newImageUrl
      };
      console.log('setForm updated to:', updatedForm);
      return updatedForm;
    });

    // Update the employees list
    setEmployees((prev: any[]) => {
      const updatedEmployees = prev.map(emp =>
        emp.empId === selectedEmployee?.empId
          ? { ...emp, profileImage: newImageUrl }
          : emp
      );
      console.log('setEmployees updated, relevant employee:', updatedEmployees.find(emp => emp.empId === selectedEmployee?.empId));
      return updatedEmployees;
    });
  };

  useEffect(() => {
    // Fetch employees data
    api.get("employees/getAllEmployees")
      .then(res => {
        setEmployees(res.data.employees);
        if (res.data.employees.length > 0) {
          setSelectedEmployee(res.data.employees[0]);
          setForm(res.data.employees[0]);
        }
      })
      .catch(error => {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees data");
      });

    // Add error handler for contractor fetch that might be happening elsewhere
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('fetch contractors')) {
        console.error("Contractor fetch error handled:", event.reason);
        toast.error("Failed to fetch contractors. This won't affect employee profiles functionality.");
        event.preventDefault(); // Prevent the error from bubbling up
      }
    });

    return () => {
      window.removeEventListener('unhandledrejection', () => { });
    };
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      console.log('🔄 Initializing form with employee data:', selectedEmployee.empId);

      // Initialize form with selectedEmployee data
      // Convert references array to object format if it exists and is an array
      const formData = { ...selectedEmployee };

      // Ensure nationality and maritalStatus are initialized
      if (formData.nationality === undefined) formData.nationality = "";
      if (formData.maritalStatus === undefined) formData.maritalStatus = "";
      if (formData.extracurricular === undefined) formData.extracurricular = "";

      // Handle references format conversion
      if (Array.isArray(formData.references) && formData.references.length > 0) {
        // Convert from array to object format to match add employee page
        formData.references = {
          referencedBy: formData.references[0]?.referencedBy || "",
          name: formData.references[0]?.name || "",
          organization: formData.references[0]?.company || formData.references[0]?.organization || ""
        };
      } else if (!formData.references || typeof formData.references !== 'object') {
        // Initialize empty references object if it's not already an object
        formData.references = {
          referencedBy: "",
          name: "",
          organization: ""
        };
      }

      // Enhanced education array handling
      console.log('📚 Original education data:', formData.education);

      if (!formData.education || !Array.isArray(formData.education)) {
        console.log('⚠️  Education field missing or not array, initializing...');
        formData.education = [];
      }

      // For display purposes, ensure at least one entry exists
      if (formData.education.length === 0) {
        console.log('➕ Adding default empty education entry');
        formData.education = [{
          courseName: "",
          institution: "",
          passingYear: "",
          marksPercentage: "",
          specialization: ""
        }];
      } else {
        // Ensure all existing education entries have all required fields
        formData.education = formData.education.map((edu: any) => ({
          courseName: edu.courseName || "",
          institution: edu.institution || "",
          passingYear: edu.passingYear || "",
          marksPercentage: edu.marksPercentage || "",
          specialization: edu.specialization || ""
        }));
      }

      console.log('📚 Processed education data:', formData.education);

      // Ensure other arrays exist
      if (!formData.familyDetails || !Array.isArray(formData.familyDetails)) {
        formData.familyDetails = [];
      }
      if (!formData.workExperience || !Array.isArray(formData.workExperience)) {
        formData.workExperience = [];
      }
      if (!formData.languages || !Array.isArray(formData.languages)) {
        formData.languages = [];
      }
      if (!formData.emergencyContacts || !Array.isArray(formData.emergencyContacts)) {
        formData.emergencyContacts = [];
      }

      // Initialize health data if it doesn't exist
      if (!formData.health) {
        formData.health = {
          majorIllness: "",
          physicalDefect: ""
        };
      }

      console.log('✅ Form data initialized successfully');
      console.log('📊 Final education array length:', formData.education.length);
      setForm(formData);
    }
  }, [selectedEmployee]);

  // Effect to fetch health data when health tab is selected
  useEffect(() => {
    const fetchHealthData = async () => {
      if (currentTab === "health" && selectedEmployee && selectedEmployee.empId) {
        try {
          const response = await api.get(`employees/${selectedEmployee.empId}/health`);
          if (response.data && response.data.data && response.data.data.health) {
            setForm((prevForm: any) => ({
              ...prevForm,
              health: response.data.data.health
            }));
          }
        } catch (error) {
          console.error("Error fetching health data:", error);
        }
      }
    };

    fetchHealthData();
  }, [currentTab, selectedEmployee]);

  // Handle input change
  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handle nested object change (e.g., bankDetails)
  const handleNestedChange = (parent: string, field: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  // Handle array of objects (e.g., education, workExperience, etc.)
  const handleArrayChange = (arrayName: string, idx: number, field: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [arrayName]: prev[arrayName]?.map((item: any, index: number) =>
        index === idx ? { ...item, [field]: value } : item
      ) || []
    }));
  };

  // Handle nested array change (e.g., nested fields in arrays)
  const handleNestedArrayChange = (arrayName: string, idx: number, field: string, value: any) => {
    console.log(`🔄 Updating ${arrayName}[${idx}].${field} = "${value}"`);

    setForm((prev: any) => {
      const updatedForm = {
        ...prev,
        [arrayName]: prev[arrayName]?.map((item: any, index: number) =>
          index === idx ? { ...item, [field]: value } : item
        ) || []
      };

      console.log(`✅ Updated ${arrayName}:`, updatedForm[arrayName]);
      return updatedForm;
    });
  };

  // Add item to array
  const handleAddArrayItem = (arrayName: string, emptyObj: any) => {
    console.log(`➕ Adding new item to ${arrayName}:`, emptyObj);

    setForm((prev: any) => {
      const updatedArray = [...(prev[arrayName] || []), emptyObj];
      console.log(`✅ Updated ${arrayName} array (length: ${updatedArray.length}):`, updatedArray);

      return {
        ...prev,
        [arrayName]: updatedArray
      };
    });
  };

  // Remove item from array
  const handleRemoveArrayItem = (arrayName: string, idx: number) => {
    setForm((prev: any) => {
      const currentArray = prev[arrayName] || [];

      // For education, maintain at least one entry
      if (arrayName === "education" && currentArray.length <= 1) {
        // Reset the single entry to empty instead of removing it
        return {
          ...prev,
          [arrayName]: [{
            courseName: "",
            institution: "",
            passingYear: "",
            marksPercentage: "",
            specialization: ""
          }]
        };
      }

      // For other arrays or when education has more than one entry
      const filteredArray = currentArray.filter((_: any, index: number) => index !== idx);

      return {
        ...prev,
        [arrayName]: filteredArray
      };
    });
  };

  const handleSaveSection = async (section: string) => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      let patchData: any = {};

      if (section === "personal") {
        patchData = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          mobile: form.mobile || form.phone, // Support both fields for backward compatibility
          dob: form.dob,
          gender: form.gender,
          fatherName: form.fatherName,
          maritalStatus: form.maritalStatus,
          bloodGroup: form.bloodGroup,
          nationality: form.nationality,
          presentAddress: form.presentAddress,
          currentAddress: form.currentAddress,
        };
      } else if (section === "employment") {
        patchData = {
          department: form.department || "",
          position: form.position || "",
          employeeCategory: form.employeeCategory || "",
          employeeType: form.employeeType || "",
          status: form.status || "",
          monthlySalary: form.monthlySalary || "",
          joiningDate: form.joiningDate || "",
          shiftDetails: form.shiftDetails || "",
        };
        console.log("Employment details being sent:", patchData);
      } else if (section === "statutory") {
        patchData = {
          pan: form.pan || "",
          aadhaarNo: form.aadhaarNo || "",
          uanNo: form.uanNo || "",
          pfNo: form.pfNo || "",
        };
        console.log("Statutory details being sent:", patchData);
      } else if (section === "education") {
        console.log('💾 Starting education save process...');
        console.log('📚 Current form.education before filtering:', form.education);
        console.log('📚 Current form.education type:', typeof form.education);
        console.log('📚 Current form.education is array:', Array.isArray(form.education));

        // Check if education data exists and is an array
        if (!form.education || !Array.isArray(form.education)) {
          console.warn('⚠️ Education data is missing or not an array, initializing as empty array');
          patchData = {
            education: []
          };
        } else {
          // Filter out empty education entries before saving
          const filteredEducation = form.education.filter((edu: any) => {
            const hasContent = edu.courseName || edu.institution || edu.passingYear || edu.marksPercentage || edu.specialization;
            console.log(`🔍 Checking education entry:`, edu, 'Has content:', hasContent);
            return hasContent;
          }) || [];

          console.log('✨ Filtered education data:', filteredEducation);

          // Ensure all education entries have the required fields with proper types
          const validatedEducation = filteredEducation.map((edu: any) => ({
            courseName: edu.courseName || "",
            institution: edu.institution || "",
            passingYear: edu.passingYear || "",
            marksPercentage: edu.marksPercentage || "",
            specialization: edu.specialization || ""
          }));

          patchData = {
            education: validatedEducation
          };
        }

        console.log('💾 Final education data being saved:', JSON.stringify(patchData, null, 2));
      } else if (section === "bank") {
        // Ensure bank details have proper structure
        const bankDetails = form.bankDetails || {};
        patchData = {
          bankDetails: {
            nameOnBank: bankDetails.nameOnBank || "",
            accountNo: bankDetails.accountNo || "",
            ifsc: bankDetails.ifsc || "",
            branchAddress: bankDetails.branchAddress || ""
          }
        };
        console.log("Bank details being sent:", patchData.bankDetails);
      } else if (section === "family") {
        // Ensure family details are properly formatted
        const familyDetails = Array.isArray(form.familyDetails)
          ? form.familyDetails.map((detail: any) => ({
            name: detail.name || "",
            age: detail.age || "",
            relation: detail.relation || "",
            occupation: detail.occupation || "",
            detail: detail.otherDetails || ""
          }))
          : [];
        patchData = {
          familyDetails: familyDetails
        };
        console.log("Family details being sent:", patchData.familyDetails);
      } else if (section === "emergency") {
        // Ensure emergency contacts are properly formatted
        const emergencyContacts = Array.isArray(form.emergencyContacts)
          ? form.emergencyContacts.map((contact: any) => ({
            name: contact.name || "",
            relation: contact.relation || "",
            mobile: contact.mobile || "",
            address: contact.address || ""
          }))
          : [];
        patchData = {
          emergencyContacts: emergencyContacts
        };
        console.log("Emergency contacts being sent:", patchData.emergencyContacts);
      } else if (section === "work") {
        // Ensure work experience is properly formatted with correct field names
        const workExperience = Array.isArray(form.workExperience)
          ? form.workExperience.map((exp: any) => ({
            employerName: exp.employerName || "",
            address: exp.address || "",
            designation: exp.designation || "",
            joiningDate: exp.joiningDate || "",
            leavingDate: exp.leavingDate || "",
            salary: exp.salary || "",
            reasonForLeaving: exp.reasonForLeaving || ""
          }))
          : [];
        patchData = {
          workExperience: workExperience
        };
        console.log("Work experience being sent:", patchData.workExperience);
      } else if (section === "languages") {
        // Ensure languages are properly formatted
        const languages = Array.isArray(form.languages)
          ? form.languages.map((lang: any) => ({
            language: lang.language || "",
            proficiency: lang.proficiency || ""
          }))
          : [];
        patchData = {
          languages: languages
        };
        console.log("Languages being sent:", patchData.languages);
      } else if (section === "criminal") {
        // Ensure criminal record is properly formatted
        const criminalRecord = form.criminalRecord || {};
        patchData = {
          criminalRecord: {
            hasCriminalRecord: criminalRecord.hasCriminalRecord || false,
            details: criminalRecord.details || ""
          }
        };
        console.log("Criminal record being sent:", patchData.criminalRecord);
      } else if (section === "personal") {
        patchData = {
          firstName: form.firstName || "",
          middleName: form.middleName || "",
          lastName: form.lastName || "",
          email: form.email || "",
          mobile: form.mobile || form.phone || "", // Support both fields for backward compatibility
          dob: form.dob || "",
          gender: form.gender || "",
          fatherName: form.fatherName || "",
          maritalStatus: form.maritalStatus || "",
          bloodGroup: form.bloodGroup || "",
          nationality: form.nationality || "",
          presentAddress: form.presentAddress || "",
          currentAddress: form.currentAddress || "",
        };
        console.log("Personal details being sent:", patchData);
      } else if (section === "health") {
        // Ensure health details are properly formatted with correct field names
        const health = form.health || {};
        patchData = {
          health: {
            majorIllness: health.majorIllness || "",
            physicalDefect: health.physicalDefect || ""
          }
        };
        console.log("Health details being sent:", patchData.health);
      } else if (section === "references") {

        console.log("References data being sent:", JSON.stringify(patchData.references));
      } else if (section === "other") {
        patchData = {
          extracurricular: form.extracurricular || "",
          hobbies: form.hobbies || "",
          referenceDetails: form.referenceDetails || "",
          notes: form.notes || "",
        };
        console.log("Other details being sent:", patchData);
      }

      console.log(`Saving data for section ${section}:`, patchData);

      // Validate that we have an employee ID
      if (!selectedEmployee || !selectedEmployee.empId) {
        throw new Error("No employee selected or employee ID missing");
      }

      // Validate that we have data to send
      if (!patchData || Object.keys(patchData).length === 0) {
        throw new Error("No data to save");
      }

      console.log("Employee ID:", selectedEmployee.empId);
      console.log("Selected Employee Object:", selectedEmployee);
      console.log("Patch Data:", JSON.stringify(patchData, null, 2));

      try {
        // Use specific endpoint for health section
        let response;
        if (section === "health") {
          response = await api.patch(
            `/employees/${selectedEmployee.empId}/health`,
            patchData.health
          );
        } else {
          response = await api.patch(
            `/employees/${selectedEmployee.empId}`,
            patchData
          );
        }

        console.log("API Response:", response);
        console.log("API Response Status:", response.status);
        console.log("API Response Data:", response.data);
        console.log("API Response Headers:", response.headers);

        // Log the raw response for debugging
        console.log("Raw response object:", JSON.stringify(response, null, 2));

        // Check if response has the expected structure
        if (response && typeof response === 'object') {
          if (response.data && response.data.success !== undefined) {
            if (response.data.success) {
              // Success case
              console.log("✅ Save successful");
            } else {
              // API returned success: false
              console.log("❌ API returned success: false");
              throw new Error(response.data.message || response.data.error || "API returned failure");
            }
          } else if (response.status >= 200 && response.status < 300) {
            // HTTP success status but no success field in data
            console.log("⚠️ HTTP success but no success field in response data");
            // Treat as success for now
          } else {
            // Unexpected response structure
            console.log("❌ Unexpected response structure");
            throw new Error("Unexpected response from server");
          }
        } else {
          // Invalid response
          console.log("❌ Invalid response object");
          throw new Error("Invalid response from server");
        }

        if (response.data && response.data.success !== undefined) {
          if (response.data.success) {
            console.log("✅ Save successful, proceeding with refresh");
            // Refresh the employee data from the server to ensure we have the latest
            try {
              const refreshResponse = await api.get("employees/getAllEmployees");

              console.log("Refresh Response:", refreshResponse);
              if (refreshResponse.data && refreshResponse.data.employees) {
                const refreshedEmployees = refreshResponse.data.employees;
                setEmployees(refreshedEmployees);

                // Find the updated employee in the refreshed data
                const refreshedEmployee = refreshedEmployees.find(
                  (emp: any) => emp.empId === selectedEmployee.empId
                );

                if (refreshedEmployee) {
                  setSelectedEmployee(refreshedEmployee);
                  setForm(refreshedEmployee);
                  console.log("Updated employee data:", refreshedEmployee);
                } else {
                  // Fallback to local update if employee not found in refreshed data
                  const updatedEmployee = { ...selectedEmployee, ...patchData };
                  setSelectedEmployee(updatedEmployee);
                  setForm(updatedEmployee);
                }
              }
            } catch (refreshError) {
              console.error("Error refreshing data:", refreshError);
              // Fallback to local update
              const updatedEmployee = { ...selectedEmployee, ...patchData };
              setSelectedEmployee(updatedEmployee);
              setForm(updatedEmployee);
            }

            setEditMode({ ...editMode, [section]: false });
            toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
          } else {
            console.log("❌ API returned success: false with message:", response.data.message || response.data.error);
            throw new Error(response.data.message || response.data.error || "Failed to update employee information");
          }
        }
      } else {
        // Handle case where response doesn't have expected structure
        // But still treat as success if HTTP status is OK
        if (response.status >= 200 && response.status < 300) {
          console.log("⚠️ HTTP success but no success field, treating as success");
          // Still proceed with the success flow
          // Refresh the employee data from the server to ensure we have the latest
          try {
            const refreshResponse = await api.get("employees/getAllEmployees");
            console.log("Refresh Response:", refreshResponse);
            if (refreshResponse.data && refreshResponse.data.employees) {
              const refreshedEmployees = refreshResponse.data.employees;
              setEmployees(refreshedEmployees);

              // Find the updated employee in the refreshed data
              const refreshedEmployee = refreshedEmployees.find(
                (emp: any) => emp.empId === selectedEmployee.empId
              );

              if (refreshedEmployee) {
                setSelectedEmployee(refreshedEmployee);
                setForm(refreshedEmployee);
                console.log("Updated employee data:", refreshedEmployee);
              } else {
                // Fallback to local update if employee not found in refreshed data
                const updatedEmployee = { ...selectedEmployee, ...patchData };
                setSelectedEmployee(updatedEmployee);
                setForm(updatedEmployee);
              }
            }
          } catch (refreshError) {
            console.error("Error refreshing data:", refreshError);
            // Fallback to local update
            const updatedEmployee = { ...selectedEmployee, ...patchData };
            setSelectedEmployee(updatedEmployee);
            setForm(updatedEmployee);
          }

          setEditMode({ ...editMode, [section]: false });
          toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
        } else {
          console.log("❌ Invalid response structure and HTTP error status");
          throw new Error("Invalid response from server");
        }
      }
    } catch (error) {
      console.error("Error saving section:", error);
      console.error("Error name:", (error as any).name);
      console.error("Error message:", (error as any).message);
      console.error("Error stack:", (error as any).stack);
      if ((error as any).response) {
        console.error("Error response:", (error as any).response);
        console.error("Error response status:", (error as any).response.status);
        console.error("Error response data:", (error as any).response.data);
        console.error("Error response headers:", (error as any).response.headers);
      }
      toast.error(`Failed to save ${section}: ${(error as any).response?.data?.message || (error as any).response?.data?.error || (error as any).message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  } catch (error) {
    console.error("Error in handleSaveSection:", error);
    toast.error(`Failed to save ${section}: ${(error as any).message || "Please try again."}`);
    setLoading(false);
  }
  // Closing brace for handleSaveSection function
};

// Renderers for each section
const renderSection = (section: string) => {
  const isEditing = !!editMode[section];
  switch (section) {
    case "personal":
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <ProfileImageUpload
              employee={selectedEmployee}
              onImageUpdate={handleProfileImageUpdate}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName || ""}
                onChange={(e) => handleChange("firstName", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={form.middleName || ""}
                onChange={(e) => handleChange("middleName", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName || ""}
                onChange={(e) => handleChange("lastName", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={form.mobile || form.phone || ""}
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
                value={form.dob ? form.dob.split('T')[0] : ""}
                onChange={(e) => handleChange("dob", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender || ""}
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
                value={form.fatherName || ""}
                onChange={(e) => handleChange("fatherName", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <select
                id="bloodGroup"
                value={form.bloodGroup || ""}
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
                value={form.maritalStatus || ""}
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
                value={form.nationality || ""}
                onChange={(e) => handleChange("nationality", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="presentAddress">Present Address</Label>
              <Input
                id="presentAddress"
                value={form.presentAddress || ""}
                onChange={(e) => handleChange("presentAddress", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="currentAddress">Current Address</Label>
              <Input
                id="currentAddress"
                value={form.currentAddress || ""}
                onChange={(e) => handleChange("currentAddress", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>
      );
    case "employment":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={form.department || ""}
              onChange={(e) => handleChange("department", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="position"
              value={form.position || ""}
              onChange={(e) => handleChange("position", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="employeeCategory">Employee Category</Label>
            <select
              id="employeeCategory"
              value={form.employeeCategory || ""}
              onChange={(e) => handleChange("employeeCategory", e.target.value)}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Category</option>
              <option value="STAFFS(OFFICE)">STAFFS(OFFICE)</option>
              <option value="STAFFS(PLANT)">STAFFS(PLANT)</option>
              <option value="WORKERS (PLANT)">WORKERS (PLANT)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="employeeType">Employee Type</Label>
            <select
              id="employeeType"
              value={form.employeeType || ""}
              onChange={(e) => handleChange("employeeType", e.target.value)}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Type</option>
              <option value="fullMonth">Full Month</option>
              <option value="weeklyOff">Weekly Off</option>
              <option value="weeklyOffWithCoff">Weekly Off with C-Off</option>
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status || ""}
              onChange={(e) => handleChange("status", e.target.value)}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
          <div>
            <Label htmlFor="monthlySalary">Monthly Salary</Label>
            <Input
              id="monthlySalary"
              type="number"
              value={form.monthlySalary || ""}
              onChange={(e) => handleChange("monthlySalary", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="joiningDate">Joining Date</Label>
            <Input
              id="joiningDate"
              type="date"
              value={form.joiningDate ? form.joiningDate.split('T')[0] : ""}
              onChange={(e) => handleChange("joiningDate", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="workHoursPerDay">Work Hours Per Day</Label>
            <select
              id="workHoursPerDay"
              value={form.shiftDetails?.workHoursPerDay || ""}
              onChange={(e) => handleNestedChange("shiftDetails", "workHoursPerDay", parseInt(e.target.value))}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Hours</option>
              <option value="8">8 Hours</option>
              <option value="9">9 Hours</option>
              <option value="12">12 Hours</option>
            </select>
          </div>
          <div>
            <Label htmlFor="weeklyOff">Weekly Off Day</Label>
            <select
              id="weeklyOff"
              value={form.shiftDetails?.weeklyOff || ""}
              onChange={(e) => handleNestedChange("shiftDetails", "weeklyOff", e.target.value)}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Day</option>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>
        </div>
      );
    case "bank":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nameOnBank">Bank Name</Label>
            <Input
              id="nameOnBank"
              value={form.bankDetails?.nameOnBank || ""}
              onChange={(e) => handleNestedChange("bankDetails", "nameOnBank", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="accountNo">Account Number</Label>
            <Input
              id="accountNo"
              value={form.bankDetails?.accountNo || ""}
              onChange={(e) => handleNestedChange("bankDetails", "accountNo", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="ifsc">IFSC Code</Label>
            <Input
              id="ifsc"
              value={form.bankDetails?.ifsc || ""}
              onChange={(e) => handleNestedChange("bankDetails", "ifsc", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="branchAddress">Branch Address</Label>
            <Input
              id="branchAddress"
              value={form.bankDetails?.branchAddress || ""}
              onChange={(e) => handleNestedChange("bankDetails", "branchAddress", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      );
    case "statutory":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input
              id="pan"
              value={form.pan || ""}
              onChange={(e) => handleChange("pan", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="aadhaarNo">Aadhaar Number</Label>
            <Input
              id="aadhaarNo"
              value={form.aadhaarNo || ""}
              onChange={(e) => handleChange("aadhaarNo", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="uanNo">UAN Number</Label>
            <Input
              id="uanNo"
              value={form.uanNo || ""}
              onChange={(e) => handleChange("uanNo", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="pfNo">PF Number</Label>
            <Input
              id="pfNo"
              value={form.pfNo || ""}
              onChange={(e) => handleChange("pfNo", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      );
    case "education":
      console.log('🗺 Rendering education section');
      console.log('📚 Current form.education:', form.education);
      console.log('📊 Form.education type:', typeof form.education);
      console.log('📊 Form.education isArray:', Array.isArray(form.education));

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.education && Array.isArray(form.education) && form.education.length > 0 ? (
            form.education.map((edu: any, index: number) => {
              console.log(`📝 Rendering education ${index + 1}:`, edu);
              return (
                <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold">Education {index + 1}</h4>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArrayItem("education", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`courseName-${index}`}>Course Name</Label>
                      <Input
                        id={`courseName-${index}`}
                        value={edu.courseName || ""}
                        onChange={(e) => handleNestedArrayChange("education", index, "courseName", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter course name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`institution-${index}`}>Institution</Label>
                      <Input
                        id={`institution-${index}`}
                        value={edu.institution || ""}
                        onChange={(e) => handleNestedArrayChange("education", index, "institution", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter institution name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`passingYear-${index}`}>Passing Year</Label>
                      <Input
                        id={`passingYear-${index}`}
                        value={edu.passingYear || ""}
                        onChange={(e) => handleNestedArrayChange("education", index, "passingYear", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter passing year"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`marksPercentage-${index}`}>Marks/Percentage</Label>
                      <Input
                        id={`marksPercentage-${index}`}
                        value={edu.marksPercentage || ""}
                        onChange={(e) => handleNestedArrayChange("education", index, "marksPercentage", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter marks/percentage"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`specialization-${index}`}>Specialization</Label>
                      <Input
                        id={`specialization-${index}`}
                        value={edu.specialization || ""}
                        onChange={(e) => handleNestedArrayChange("education", index, "specialization", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter specialization"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <p>No education records found.</p>
              <p className="text-sm text-gray-400 mt-2">
                {form.education ? `Array length: ${form.education.length}` : 'Education field not initialized'}
              </p>
              {isEditing && (
                <Button
                  type="button"
                  onClick={() => {
                    console.log('➕ Adding first education record');
                    handleAddArrayItem("education", {
                      courseName: "",
                      institution: "",
                      passingYear: "",
                      marksPercentage: "",
                      specialization: ""
                    });
                  }}
                  className="mt-2"
                  size="sm"
                >
                  Add First Education Record
                </Button>
              )}
            </div>
          )}
          {isEditing && form.education && Array.isArray(form.education) && form.education.length > 0 && (
            <Button
              type="button"
              onClick={() => {
                console.log('➕ Adding additional education record');
                handleAddArrayItem("education", {
                  courseName: "",
                  institution: "",
                  passingYear: "",
                  marksPercentage: "",
                  specialization: ""
                });
              }}
              disabled={!isEditing}
              className="col-span-2"
              size="sm"
            >
              Add Education
            </Button>
          )}
        </div>
      );
    case "family":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.familyDetails && form.familyDetails.map((family: any, index: number) => (
            <div key={index} className="col-span-2 border p-4 rounded-md mb-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold">Family Member {index + 1}</h4>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveArrayItem("familyDetails", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div>
                <Label htmlFor={`name-${index}`}>Name</Label>
                <Input
                  id={`name-${index}`}
                  value={family.name || ""}
                  onChange={(e) => handleNestedArrayChange("familyDetails", index, "name", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor={`age-${index}`}>Age</Label>
                <Input
                  id={`age-${index}`}
                  value={family.age || ""}
                  onChange={(e) => handleNestedArrayChange("familyDetails", index, "age", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor={`occupation-${index}`}>Occupation</Label>
                <Input
                  id={`occupation-${index}`}
                  value={family.occupation || ""}
                  onChange={(e) => handleNestedArrayChange("familyDetails", index, "occupation", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor={`relation-${index}`}>Relation</Label>
                <Input
                  id={`relation-${index}`}
                  value={family.relation || ""}
                  onChange={(e) => handleNestedArrayChange("familyDetails", index, "relation", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor={`otherDetails-${index}`}>Other Details</Label>
                <Input
                  id={`otherDetails-${index}`}
                  value={family.otherDetails || ""}
                  onChange={(e) => handleNestedArrayChange("familyDetails", index, "otherDetails", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => handleAddArrayItem("familyDetails", {
              name: "",
              age: "",
              occupation: "",
              relation: "",
              otherDetails: ""
            })}
            disabled={!isEditing}
            className="col-span-2"
            size="sm"
          >
            Add Family Member
          </Button>
        </div>
      );
    case "emergency":
      return (
        <div className="space-y-4">
          {form.emergencyContacts?.map((contact: any, index: number) => (
            <div key={index} className="p-4 border rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Emergency Contact {index + 1}</h4>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveArrayItem("emergencyContacts", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`name-${index}`}>Name</Label>
                  <Input
                    id={`name-${index}`}
                    value={contact.name || ""}
                    onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "name", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`mobile-${index}`}>Mobile Number</Label>
                  <Input
                    id={`mobile-${index}`}
                    value={contact.mobile || ""}
                    onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "mobile", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`relation-${index}`}>Relation</Label>
                  <Input
                    id={`relation-${index}`}
                    value={contact.relation || ""}
                    onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "relation", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`address-${index}`}>Address</Label>
                  <Textarea
                    id={`address-${index}`}
                    value={contact.address || ""}
                    onChange={(e) => handleNestedArrayChange("emergencyContacts", index, "address", e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => handleAddArrayItem("emergencyContacts", {
              name: "",
              address: "",
              relation: "",
              mobile: ""
            })}
            disabled={!isEditing}
            className="col-span-2"
            size="sm"
          >
            Add Emergency Contact
          </Button>
        </div>
      );
    case "languages":
      return (
        <div className="space-y-4">
          {form.languages?.map((lang: any, index: number) => (
            <div key={index} className="mb-4 p-4 border rounded-lg relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Language {index + 1}</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`language-${index}`}>Language</Label>
                  <Input
                    id={`language-${index}`}
                    value={lang.language || ""}
                    onChange={(e) => handleNestedArrayChange("languages", index, "language", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`canRead-${index}`}>Reading</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id={`canRead-${index}`}
                      checked={lang.canRead || false}
                      onChange={(e) => handleNestedArrayChange("languages", index, "canRead", e.target.checked)}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <Label htmlFor={`canRead-${index}`}>Can Read</Label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`canWrite-${index}`}>Writing</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id={`canWrite-${index}`}
                      checked={lang.canWrite || false}
                      onChange={(e) => handleNestedArrayChange("languages", index, "canWrite", e.target.checked)}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <Label htmlFor={`canWrite-${index}`}>Can Write</Label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`canSpeak-${index}`}>Speaking</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id={`canSpeak-${index}`}
                      checked={lang.canSpeak || false}
                      onChange={(e) => handleNestedArrayChange("languages", index, "canSpeak", e.target.checked)}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <Label htmlFor={`canSpeak-${index}`}>Can Speak</Label>
                  </div>
                </div>
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
            Add Language
          </Button>
        </div>
      );
    case "work":
      return (
        <div className="space-y-4">
          {form.workExperience?.map((work: any, index: number) => (
            <div key={index} className="mb-6 p-4 border rounded-lg relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Experience {index + 1}</h4>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveArrayItem("workExperience", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`employerName-${index}`}>Name of Employer</Label>
                  <Input
                    id={`employerName-${index}`}
                    value={work.employerName || ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "employerName", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`address-${index}`}>Address</Label>
                  <Input
                    id={`address-${index}`}
                    value={work.address || ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "address", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`designation-${index}`}>Designation</Label>
                  <Input
                    id={`designation-${index}`}
                    value={work.designation || ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "designation", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`joiningDate-${index}`}>Date of Joining</Label>
                  <Input
                    id={`joiningDate-${index}`}
                    type="date"
                    value={work.joiningDate ? new Date(work.joiningDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "joiningDate", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`leavingDate-${index}`}>Date of Leaving</Label>
                  <Input
                    id={`leavingDate-${index}`}
                    type="date"
                    value={work.leavingDate ? new Date(work.leavingDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "leavingDate", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor={`salary-${index}`}>Salary</Label>
                  <Input
                    id={`salary-${index}`}
                    value={work.salary || ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "salary", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`reasonForLeaving-${index}`}>Reason for Leaving</Label>
                  <Input
                    id={`reasonForLeaving-${index}`}
                    value={work.reasonForLeaving || ""}
                    onChange={(e) => handleNestedArrayChange("workExperience", index, "reasonForLeaving", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => handleAddArrayItem("workExperience", {
              employerName: "",
              address: "",
              designation: "",
              joiningDate: "",
              leavingDate: "",
              salary: "",
              reasonForLeaving: ""
            })}
            disabled={!isEditing}
            className="col-span-2"
            size="sm"
          >
            Add Work Experience
          </Button>
        </div>
      );
    case "references":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Referenced by</Label>
              <Select
                value={form.references?.referencedBy || ""}
                onValueChange={(value) => handleNestedChange("references", "referencedBy", value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="outsider">Outsider</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.references?.name || ""}
                onChange={(e) => handleNestedChange("references", "name", e.target.value)}
                disabled={!isEditing}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Organization/Company</Label>
              <Input
                value={form.references?.organization || ""}
                onChange={(e) => handleNestedChange("references", "organization", e.target.value)}
                disabled={!isEditing}
                placeholder="Organization name"
              />
            </div>
          </div>
        </div>
      );
    case "other":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="hobbies">Hobbies</Label>
              <Textarea
                id="hobbies"
                value={form.hobbies || ""}
                onChange={(e) => handleChange("hobbies", e.target.value)}
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="extracurricular">Extracurricular Activities</Label>
              <Textarea
                id="extracurricular"
                value={form.extracurricular || ""}
                onChange={(e) => handleChange("extracurricular", e.target.value)}
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </div>
        </div>
      );
    case "criminal":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="hasCriminalRecord">Do you have any criminal record?</Label>
            <select
              id="hasCriminalRecord"
              value={form.criminalRecord?.hasCriminalRecord || "no"}
              onChange={(e) => handleNestedChange("criminalRecord", "hasCriminalRecord", e.target.value)}
              disabled={!isEditing}
              className="w-full p-2 border rounded"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <Label htmlFor="criminalDetails">If yes, what was the result?</Label>
            <Textarea
              id="criminalDetails"
              value={form.criminalRecord?.details || ""}
              onChange={(e) => handleNestedChange("criminalRecord", "details", e.target.value)}
              disabled={!isEditing}
              rows={3}
            />
          </div>
        </div>
      );
    case "health":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="majorIllness">Major Illness</Label>
              <Textarea
                id="majorIllness"
                value={form.health?.majorIllness || ""}
                onChange={(e) => handleNestedChange("health", "majorIllness", e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="Enter any major illnesses..."
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="physicalDefect">Physical Defect</Label>
              <Textarea
                id="physicalDefect"
                value={form.health?.physicalDefect || ""}
                onChange={(e) => handleNestedChange("health", "physicalDefect", e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="Enter any physical defects..."
              />
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <p>This section is under development</p>
          <p className="text-sm mt-2">Edit functionality will be available soon</p>
        </div>
      );
  }
};

const generateBioDataPDF = async () => {
  if (!selectedEmployee) {
    return;
  }

  // Show loading state
  toast.loading("Generating PDF...", { id: "pdf-generation" });

  try {
    // Check if html2pdf is available
    if (typeof html2pdf === 'undefined') {
      throw new Error("PDF library not loaded. Please refresh the page and try again.");
    }

    const pdfContent = document.createElement('div');
    pdfContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
            <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start;">
              <img src="/atithi-logo.png" alt="Atithi LLP Logo" style="height: 80px; width: auto; max-width: 150px; object-fit: contain; margin-bottom: 5px;" onerror="this.src='/placeholder-logo.png'; this.onerror=null;" />
              <div style="text-align: left;">
                <p style="font-size: 14px; font-weight: bold; margin: 0; color: #000;">ATITHI PAPER LLP</p>
                <p style="font-size: 11px; margin: 2px 0 0 0; font-weight: bold color: #000;">Human Resources Department</p>
              </div>
            </div>
            <div style="flex: 2; text-align: center;">
              <h1 style="font-size: 32px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px; color: #000;">BIO DATA</h1>
              <p style="font-size: 14px; margin: 5px 0 0 0; color: #000; font-weight: bold">Employee Profile Information</p>
              <div style="width: 60px; height: 3px; background: #000; margin: 10px auto 0 auto;"></div>
            </div>
            <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
              <div style="border: 1px solid #000; padding: 8px;">
                <p style="font-size: 11px; margin: 0; color: #000; font-weight: bold;">DOCUMENT ID</p>
                <p style="font-size: 10px; margin: 2px 0 0 0; color: #000; font-weight: bold">${selectedEmployee.empId || 'N/A'}-BD-${new Date().getFullYear()}</p>
              </div>
              <p style="font-size: 12px; margin: 10px 0 0 0; color: #000; font-weight: bold">Generated: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style="display: flex; gap: 30px; margin-bottom: 30px; align-items: flex-start;">
            <div style="flex-shrink: 0; text-align: center;">
              <img src="${getProfileImageUrl(selectedEmployee)}" 
                   alt="Employee Photo"
                   style="width: 140px; height: 140px; border: 3px solid #000; object-fit: cover; display: block;" />
              <p style="font-size: 12px; margin: 10px 0 0 0; font-weight: bold;">EMPLOYEE PHOTO</p>
            </div>
            <div style="flex: 1; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <h2 style="font-size: 26px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">${selectedEmployee.firstName || ''} ${selectedEmployee.middleName || ''} ${selectedEmployee.lastName || ''}</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Employee ID:</strong> ${selectedEmployee.empId || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Department:</strong> ${selectedEmployee.department || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Designation:</strong> ${selectedEmployee.position || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Status:</strong> ${selectedEmployee.status || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Email:</strong> ${selectedEmployee.email || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 14px; font-weight: bold"><strong>Phone:</strong> ${selectedEmployee.mobile || selectedEmployee.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">PERSONAL INFORMATION</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Date of Birth:</strong> ${selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString() : 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Gender:</strong> ${selectedEmployee.gender || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Father's Name:</strong> ${selectedEmployee.fatherName || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Blood Group:</strong> ${selectedEmployee.bloodGroup || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Nationality:</strong> ${selectedEmployee.nationality || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Marital Status:</strong> ${selectedEmployee.maritalStatus || 'N/A'}</p>
              <p style="margin: 8px 0 3px 0; font-size: 13px; font-weight: bold"><strong>Present Address:</strong> ${selectedEmployee.presentAddress || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px; font-weight: bold"><strong>Current Address:</strong> ${selectedEmployee.currentAddress || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">EMPLOYMENT INFORMATION</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Employee Category:</strong> ${selectedEmployee.employeeCategory || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Employee Type:</strong> ${selectedEmployee.employeeType || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Department:</strong> ${selectedEmployee.department || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Position:</strong> ${selectedEmployee.position || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Joining Date:</strong> ${selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Monthly Salary:</strong> ${selectedEmployee.monthlySalary ? '₹' + selectedEmployee.monthlySalary.toLocaleString() : 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Work Hours/Day:</strong> ${selectedEmployee.shiftDetails?.workHoursPerDay || 'N/A'} hours</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Weekly Off:</strong> ${selectedEmployee.shiftDetails?.weeklyOff || 'N/A'}</p>
            </div>
          </div>


          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">BANK DETAILS</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Account Holder:</strong> ${selectedEmployee.bankDetails?.nameOnBank || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Account Number:</strong> ${selectedEmployee.bankDetails?.accountNo || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>IFSC Code:</strong> ${selectedEmployee.bankDetails?.ifsc || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Branch Address:</strong> ${selectedEmployee.bankDetails?.branchAddress || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 25px; page-break-inside: avoid; page-break-before: always;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">STATUTORY DETAILS</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>PAN Number:</strong> ${selectedEmployee.pan || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Aadhaar Number:</strong> ${selectedEmployee.aadhaarNo || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>UAN Number:</strong> ${selectedEmployee.uanNo || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>PF Number:</strong> ${selectedEmployee.pfNo || 'N/A'}</p>
            </div>
          </div>



          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">EDUCATION</h3>
            ${selectedEmployee.education && selectedEmployee.education.length > 0 ? selectedEmployee.education.map((edu: any, index: number) => `
              <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Course Name:</strong> ${edu.courseName || 'N/A'}</p>
                  <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Institution:</strong> ${edu.institution || 'N/A'}</p>
                  <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Passing Year:</strong> ${edu.passingYear || 'N/A'}</p>
                  <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Marks/Percentage:</strong> ${edu.marksPercentage || 'N/A'}</p>
                  <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Specialization:</strong> ${edu.specialization || 'N/A'}</p>
                </div>
              </div>
            `).join('') : '<p style="margin: 3px 0; font-size: 13px;">N/A</p>'}
          </div>



          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">WORK EXPERIENCE</h3>
            ${(() => {
        if (!selectedEmployee.workExperience || selectedEmployee.workExperience.length === 0) {
          return '<p style="margin: 3px 0; font-size: 13px;">N/A</p>';
        }

        return selectedEmployee.workExperience.map((work: any, index: number) => {
          // Handle multiple field name variations for compatibility
          const employerName = work.employerName || work['Name of Employer'] || work.employer || 'N/A';
          const designation = work.designation || work['Designation'] || work.position || 'N/A';
          const joiningDate = work.joiningDate || work['Date of Joining'] || work.joinDate;
          const leavingDate = work.leavingDate || work['Date of Leaving'] || work.leaveDate;
          const salary = work.salary || work['Salary'] || 'N/A';
          const address = work.address || work['Address'] || 'N/A';
          const reasonForLeaving = work.reasonForLeaving || work['Reason for Leaving'] || '';

          const formatDate = (date: any) => {
            if (!date) return 'N/A';
            try {
              return new Date(date).toLocaleDateString();
            } catch {
              return date.toString();
            }
          };

          return `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Employer Name:</strong> ${employerName}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Designation:</strong> ${designation}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Joining Date:</strong> ${formatDate(joiningDate)}</p>
                      <p style="margin: 3px 0; font-size: 13px;"><strong>Leaving Date:</strong> ${formatDate(leavingDate)}</p>
                      <p style="margin: 3px 0; font-size: 13px;"><strong>Salary:</strong> ${salary}</p>
                      <p style="margin: 3px 0; font-size: 13px;"><strong>Address:</strong> ${address}</p>
                    </div>
                    ${reasonForLeaving ? `<p style="margin: 8px 0 3px 0; font-size: 13px;"><strong>Reason for Leaving:</strong> ${reasonForLeaving}</p>` : ''}
                  </div>
                `;
        }).join('');
      })()}
          </div>



          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">FAMILY DETAILS</h3>
            ${(() => {
        if (!selectedEmployee.familyDetails || selectedEmployee.familyDetails.length === 0) {
          return '<p style="margin: 3px 0; font-size: 13px;">N/A</p>';
        }

        return selectedEmployee.familyDetails.map((family: any, index: number) => {
          // Handle multiple field name variations for compatibility
          const name = family.name || family['Name'] || 'N/A';
          const relation = family.relation || family['Relation'] || family.relation || 'N/A';
          const age = family.age || family['Age'] || 'N/A';
          const occupation = family.occupation || family['Occupation'] || 'N/A';
          const otherDetails = family.otherDetails || family['Other Details'] || family.otherdetails || '';

          return `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Name:</strong> ${name}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Relation:</strong> ${relation}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Age:</strong> ${age}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Occupation:</strong> ${occupation}</p>
                    </div>
                    ${otherDetails ? `<p style="margin: 8px 0 3px 0; font-size: 13px;"><strong>Other Details:</strong> ${otherDetails}</p>` : ''}
                  </div>
                `;
        }).join('');
      })()}
          </div>


          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">EMERGENCY CONTACTS</h3>
            ${(() => {
        if (!selectedEmployee.emergencyContacts || selectedEmployee.emergencyContacts.length === 0) {
          return '<p style="margin: 3px 0; font-size: 13px;">N/A</p>';
        }

        return selectedEmployee.emergencyContacts.map((contact: any, index: number) => {
          // Handle multiple field name variations for compatibility
          const name = contact.name || contact['Name'] || 'N/A';
          const relation = contact.relation || contact['Relation'] || contact.relation || 'N/A';
          const phone = contact.mobile || contact.phone || contact['Phone Number'] || contact['Mobile'] || 'N/A';
          const address = contact.address || contact['Address'] || 'N/A';

          return `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Name:</strong> ${name}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Relation:</strong> ${relation}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Phone Number:</strong> ${phone}</p>
                      <p style="margin: 3px 0; font-size: 13px;"><strong>Address:</strong> ${address}</p>
                    </div>
                  </div>
                `;
        }).join('');
      })()}
          </div>
          

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">LANGUAGES</h3>
            ${(() => {
        if (!selectedEmployee.languages || selectedEmployee.languages.length === 0) {
          return '<p style="margin: 3px 0; font-size: 13px;">N/A</p>';
        }

        return selectedEmployee.languages.map((lang: any, index: number) => {
          // Handle multiple field name variations for compatibility
          const language = lang.language || lang['Language'] || 'N/A';

          // Handle boolean values with multiple possible field names
          const canRead = lang.canRead !== undefined ?
            (lang.canRead === true ? 'Yes' : (lang.canRead === false ? 'No' : 'N/A')) :
            (lang['Can Read'] !== undefined ? lang['Can Read'] : 'N/A');

          const canWrite = lang.canWrite !== undefined ?
            (lang.canWrite === true ? 'Yes' : (lang.canWrite === false ? 'No' : 'N/A')) :
            (lang['Can Write'] !== undefined ? lang['Can Write'] : 'N/A');

          const canSpeak = lang.canSpeak !== undefined ?
            (lang.canSpeak === true ? 'Yes' : (lang.canSpeak === false ? 'No' : 'N/A')) :
            (lang['Can Speak'] !== undefined ? lang['Can Speak'] : 'N/A');

          return `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Language:</strong> ${language}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Can Read:</strong> ${canRead}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Can Write:</strong> ${canWrite}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Can Speak:</strong> ${canSpeak}</p>
                    </div>
                  </div>
                `;
        }).join('');
      })()}
          </div>
          

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">REFERENCES</h3>
            ${(() => {
        // Handle both object and array formats with fallbacks
        let referenceHTML = '';

        if (selectedEmployee.references) {
          if (Array.isArray(selectedEmployee.references) && selectedEmployee.references.length > 0) {
            // Array format
            referenceHTML = selectedEmployee.references.map((ref: any, index: number) => `
                    <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Referenced By:</strong> ${ref.referencedBy || 'N/A'}</p>
                        <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Name:</strong> ${ref.name || 'N/A'}</p>
                        <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Organization:</strong> ${ref.organization || ref.company || 'N/A'}</p>
                      </div>
                    </div>
                  `).join('');
          } else if (typeof selectedEmployee.references === 'object' && !Array.isArray(selectedEmployee.references)) {
            // Object format
            if (selectedEmployee.references.referencedBy || selectedEmployee.references.name || selectedEmployee.references.organization) {
              referenceHTML = `
                      <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                          <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Referenced By:</strong> ${selectedEmployee.references.referencedBy || 'N/A'}</p>
                          <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Name:</strong> ${selectedEmployee.references.name || 'N/A'}</p>
                          <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Organization:</strong> ${selectedEmployee.references.organization || 'N/A'}</p>
                        </div>
                      </div>
                    `;
            }
          }
        }

        // Fallback to legacy fields if no modern references found
        if (!referenceHTML && (selectedEmployee.referenceBy || selectedEmployee.referralName || selectedEmployee.referralOrganization)) {
          referenceHTML = `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Referenced By:</strong> ${selectedEmployee.referenceBy || 'N/A'}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Name:</strong> ${selectedEmployee.referralName || 'N/A'}</p>
                      <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Organization:</strong> ${selectedEmployee.referralOrganization || 'N/A'}</p>
                    </div>
                  </div>
                `;
        }

        return referenceHTML || '<p style="margin: 3px 0; font-size: 13px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">N/A</p>';
      })()}
          </div>
          

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">HEALTH INFORMATION</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Major Illness:</strong> ${selectedEmployee.health?.majorIllness || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Physical Defect:</strong> ${selectedEmployee.health?.physicalDefect || 'N/A'}</p>
            </div>
          </div>
          

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">CRIMINAL RECORD</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Has Criminal Record:</strong> ${selectedEmployee.criminalRecord?.hasCriminalRecord || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Details:</strong> ${selectedEmployee.criminalRecord?.details || 'N/A'}</p>
            </div>
          </div>
          

          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px; margin: 0 0 15px 0; border-left: 4px solid #000;">OTHER INFORMATION</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; border: 1px solid #ddd; border-radius: 5px; padding: 5px;">
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Hobbies:</strong> ${selectedEmployee.hobbies || 'N/A'}</p>
              <p style="margin: 3px 0; font-size: 13px;font-weight: bold"><strong>Extracurricular Activities:</strong> ${selectedEmployee.extracurricular || 'N/A'}</p>
            </div>
          </div>
          



          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 15px;">
            <p style="font-size: 11px; color: #000; margin: 0; font-weight: bold">
              Generated on ${new Date().toLocaleDateString()} | Employee Bio Data
            </p>
          </div>
        </div>
      `;

    document.body.appendChild(pdfContent);

    // Wait for images to load before generating PDF
    const images = pdfContent.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(true);
        } else {
          img.onload = () => resolve(true);
          img.onerror = () => {
            // Fallback to placeholder if image fails to load
            img.src = '/placeholder-user.jpg';
            resolve(true);
          };
          // Timeout after 5 seconds
          setTimeout(() => resolve(true), 5000);
        }
      });
    });

    await Promise.all(imagePromises);

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `${selectedEmployee.firstName || 'Employee'}_${selectedEmployee.middleName || ''}_${selectedEmployee.lastName || 'Profile'}_BioData.pdf`,
      image: {
        type: 'jpeg',
        quality: 1.0 // Increased quality for better image clarity
      },
      html2canvas: {
        scale: 3, // Increased scale for better image resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false, // Disable logging in production
        timeout: 30000, // 30 second timeout
        onclone: (clonedDoc: any) => {
          // Ensure all styles are applied to cloned document
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach((img: any) => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
          });
        }
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait',
        compress: true // Enable compression
      }
    };

    // Generate PDF with timeout
    const pdfPromise = html2pdf().set(opt).from(pdfContent).save();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF generation timeout')), 60000); // 60 second timeout
    });

    await Promise.race([pdfPromise, timeoutPromise]);

    document.body.removeChild(pdfContent);
    toast.dismiss("pdf-generation");
    toast.success("Bio Data PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.dismiss("pdf-generation");

    // Provide specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('timeout')) {
      toast.error("PDF generation timeout. The process took too long. Please try again.");
    } else if (errorMessage.includes('PDF library not loaded')) {
      toast.error("PDF library not loaded. Please refresh the page.");
    } else {
      toast.error(`Failed to generate PDF: ${errorMessage}`);
    }
  }
};

return (
  <SidebarInset>
    <header className="flex flex-col gap-1 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-4 mb-0">
      <h1 className="text-lg font-semibold tracking-tight">Employee Profiles</h1>
      <span className="text-muted-foreground text-sm">View and manage detailed employee information</span>
    </header>

    <div className="w-full flex flex-col gap-6 py-8 px-2 md:px-6">
      <div className="flex justify-center mb-6">
        <Popover open={employeeSelectorOpen} onOpenChange={setEmployeeSelectorOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 text-lg font-medium">
              {selectedEmployee ? (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={getProfileImageUrl(selectedEmployee)}
                    className="w-8 h-8 rounded-full border-2 border-blue-100 bg-gray-100 object-cover"
                  />
                  <span className="flex-1 text-left">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </span>
                  <Badge className="ml-2">{selectedEmployee.department}</Badge>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </div>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Select Employee
                  <ChevronDown className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput
                placeholder="Search by name, ID, department, or designation..."
                value={employeeSearchTerm}
                onValueChange={setEmployeeSearchTerm}
              />
              <CommandList>
                {filteredEmployees.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No employees found matching "{employeeSearchTerm}"
                  </div>
                ) : (
                  filteredEmployees.map((emp: any) => (
                    <CommandItem
                      key={emp.empId}
                      onSelect={() => {
                        setSelectedEmployee(emp);
                        setEmployeeSelectorOpen(false);
                        setEmployeeSearchTerm(""); // Clear search when selecting
                      }}
                    >
                      <div className="flex items-center w-full">
                        <img
                          src={getProfileImageUrl(emp)}
                          className="w-8 h-8 rounded-full border-2 border-blue-100 bg-gray-100 object-cover"
                        />
                        <div className="ml-2 flex-1 min-w-0">
                          <div className="font-medium truncate">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{emp.empId}</span>
                            <span>{getStatusBadge(emp.status)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{emp.position || 'N/A'}</span>
                            <span>{emp.department || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedEmployee && (
        <div className="flex justify-center mb-6">
          <Card className="w-full max-w-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <img
                    src={getProfileImageUrl(selectedEmployee)}
                    alt={`${selectedEmployee.firstName} ${selectedEmployee.middleName} ${selectedEmployee.lastName}`}
                    className="w-24 h-24 rounded-full border-4 border-blue-200 bg-gray-100 object-cover shadow-md"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h2>
                  <p className="text-lg text-gray-600 mb-2">{selectedEmployee.position}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📧 {selectedEmployee.email}</span>
                    <span>🏢 {selectedEmployee.department}</span>
                    <span>{getStatusBadge(selectedEmployee.status)}</span>
                  </div>
                  {selectedEmployee.empId && (
                    <>
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        Employee ID: {selectedEmployee.empId}
                      </p>
                      <div className="flex gap-3 mt-3">
                        <a href={`/hr/employees/id-card?empId=${selectedEmployee.empId}`} rel="noopener noreferrer">
                          <Button variant="default">View/Download ID Card</Button>
                        </a>
                        <Button
                          variant="outline"
                          onClick={generateBioDataPDF}
                          className="border-gray-300 hover:bg-gray-50"
                        >
                          Download Bio Data PDF (Client)
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Section */}
      {selectedEmployee && (
        <Tabs value={currentTab} onValueChange={setCurrentTab} orientation="vertical" className="w-full">
          <div className="flex flex-row gap-6 w-full">
            {/* Vertical Tabs */}
            <TabsList className="flex flex-col gap-2 bg-gray-50 rounded-xl shadow-none p-2 w-48 mt-2 h-full">
              {sectionList.map(section => (
                <TabsTrigger
                  key={section}
                  value={section}
                  className={`flex gap-2 py-2 whitespace-nowrap text-sm font-medium transition-all w-full rounded-lg ${currentTab === section ? 'bg-blue-100 text-blue-700 font-semibold shadow' : 'hover:bg-gray-100'}`}
                >
                  {sectionIcons[section]}
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Content area */}
            <main className="flex-1 w-full min-w-0">
              {sectionList.map(section => (
                <TabsContent key={section} value={section}>
                  <Card className="mb-6 bg-white border border-gray-200 shadow-sm w-full my-2">
                    <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                      <div className="font-semibold flex items-center gap-2">
                        {sectionIcons[section]}
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </div>
                      {!editMode[section] ? (
                        <Button size="sm" variant="outline" className="transition-all" onClick={() => setEditMode({ ...editMode, [section]: true })}>Edit</Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-primary hover:bg-primary-foreground text-primary-foreground" onClick={() => handleSaveSection(section)} disabled={loading}>
                            {loading ? <span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></span> : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="transition-all" onClick={() => {
                            setEditMode({ ...editMode, [section]: false });
                            setForm(selectedEmployee);
                            toast.info("Edit cancelled");
                          }}>Cancel</Button>
                        </div>
                      )}
                    </CardHeader>
                    <Separator />
                    <CardContent className="px-4 pb-4 pt-2">
                      <CardDescription className="mb-4 text-muted-foreground">
                        Update or review {section} details for this employee.
                      </CardDescription>
                      {loading ? (
                        <div className="flex justify-center items-center h-32">
                          <span className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full"></span>
                        </div>
                      ) : (
                        renderSection(section)
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </main>
          </div>
        </Tabs>
      )}

      {!selectedEmployee && (
        <div className="text-center text-gray-500 mt-8">
          <p>Select an employee to view their profile</p>
        </div>
      )}
    </div>
  </SidebarInset>
);
}

export default EmployeeProfilesPage;