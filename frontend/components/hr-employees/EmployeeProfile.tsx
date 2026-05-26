import { useState, useEffect, useMemo } from "react";
import api from "@/lib/apiClient";
import { downloadFile } from "@/utils/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { EmployeeSearchDropdown } from "./EmployeeSearchDropdown";
import { EmployeeProfileHeader } from "./EmployeeProfileHeader";
import { EmployeeProfileTabs } from "./EmployeeProfileTabs";
import { PersonalSection, EmploymentSection, BankSection, StatutorySection, EducationSection, FamilySection, EmergencySection, WorkSection, LanguagesSection, CriminalSection, HealthSection, ReferencesSection, OtherSection } from "./profile-sections";
import { SalaryHistoryManager } from "./profile-sections/SalaryHistoryManager";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function EmployeeProfile() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [currentTab, setCurrentTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);

  // Add safety check for sectionList
  const sectionList = useMemo(() => [
    "personal", "employment", "bank", "statutory",
    "education", "family", "emergency", "work",
    "languages", "criminal", "health", "references", "other"
  ], []);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) return employees;

    const term = employeeSearchTerm.toLowerCase().trim();
    return employees.filter(emp => {
      // Add safety checks for emp properties
      if (!emp) return false;

      const firstName = emp.firstName || '';
      const middleName = emp.middleName || '';
      const lastName = emp.lastName || '';
      const fullName = `${firstName} ${middleName} ${lastName}`.toLowerCase().trim();

      return (
        (emp.empId && emp.empId.toLowerCase().includes(term)) ||
        fullName.includes(term) ||
        (emp.department && emp.department.toLowerCase().includes(term)) ||
        (emp.position && emp.position.toLowerCase().includes(term))
      );
    });
  }, [employees, employeeSearchTerm]);

  const getProfileImageUrl = (employee: any) => {
    // Add safety checks
    if (!employee) return "/placeholder-user.jpg";

    if (employee.profileImage) {
      if (employee.profileImage.startsWith('http')) {
        return employee.profileImage;
      } else {
        // Determine base URL based on environment
        const baseUrl = process.env.NODE_ENV === 'production'
          ? 'https://atithi-workflow-pro.onrender.com'
          : 'http://localhost:8000'; // Localhost in development
        return `${baseUrl}${employee.profileImage}?t=${Date.now()}`;
      }
    }
    return "/placeholder-user.jpg";
  };

  // Handle profile image update
  const handleProfileImageUpdate = (newImageUrl: string) => {
    console.log('handleProfileImageUpdate called with newImageUrl:', newImageUrl);

    // Add safety checks
    if (!newImageUrl) {
      console.warn('handleProfileImageUpdate called with empty newImageUrl');
      return;
    }

    // Update the selected employee's profile image
    setSelectedEmployee((prev: any) => {
      if (!prev) return prev;
      const updatedPrev = {
        ...prev,
        profileImage: newImageUrl
      };
      console.log('setSelectedEmployee updated to:', updatedPrev);
      return updatedPrev;
    });

    // Update the form data
    setForm((prev: any) => {
      if (!prev) return { profileImage: newImageUrl };
      const updatedForm = {
        ...prev,
        profileImage: newImageUrl
      };
      console.log('setForm updated to:', updatedForm);
      return updatedForm;
    });

    // Update the employees list
    setEmployees((prev: any[]) => {
      if (!prev || !Array.isArray(prev)) return prev || [];
      if (!selectedEmployee || !selectedEmployee.empId) return prev;

      const updatedEmployees = prev.map(emp => {
        if (!emp || !emp.empId) return emp;
        return emp.empId === selectedEmployee.empId
          ? { ...emp, profileImage: newImageUrl }
          : emp;
      });
      console.log('setEmployees updated, relevant employee:', updatedEmployees.find(emp => emp && emp.empId === selectedEmployee.empId));
      return updatedEmployees;
    });

    // Show success message
    toast.success('Profile image updated successfully!');
  };

  useEffect(() => {
    // Fetch employees data
    api.get("/employees/getAllEmployees")
      .then(res => {
        console.log("Employees API Response:", res);
        // Handle different response formats
        let employeesData: any[] = [];
        if (res.data.employees) {
          employeesData = res.data.employees;
        } else if (res.data.data?.employees) {
          employeesData = res.data.data.employees;
        } else if (Array.isArray(res.data)) {
          employeesData = res.data;
        } else {
          console.error("Unexpected response format:", res.data);
          toast.error("Unexpected data format received from server");
          return;
        }

        // Ensure employeesData is an array of objects
        if (Array.isArray(employeesData)) {
          setEmployees(employeesData);
          if (employeesData.length > 0 && !selectedEmployee) {
            setSelectedEmployee(employeesData[0]);
            setForm(employeesData[0]);
          }
        }
      })
      .catch(error => {
        console.error("Error fetching employees:", error);
        // Handle different types of errors
        let errorMessage = "Failed to fetch employees data";
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 401) {
            errorMessage = "Authentication required. Please log in.";
          } else if (status >= 500) {
            errorMessage = "Server error. Please try again later.";
          } else if (data?.message || data?.error) {
            errorMessage = data.message || data.error || errorMessage;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
      });
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
      if (formData.hobbies === undefined) formData.hobbies = "";
      if (formData.referenceBy === undefined) formData.referenceBy = "";
      if (formData.referralName === undefined) formData.referralName = "";
      if (formData.referralOrganization === undefined) formData.referralOrganization = "";
      if (formData.notes === undefined) formData.notes = "";

      // Handle references format conversion
      if (Array.isArray(formData.references) && formData.references.length > 0) {
        // Convert from array to object format to match add employee page
        formData.references = {
          referencedBy: formData.references[0]?.referencedBy || "",
          name: formData.references[0]?.name || "",
          organization: formData.references[0]?.organization || ""
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

      if (!formData.emergencyContacts || !Array.isArray(formData.emergencyContacts)) {
        formData.emergencyContacts = [];
      }

      if (!formData.languages || !Array.isArray(formData.languages)) {
        formData.languages = [];
      }

      if (!formData.workExperience || !Array.isArray(formData.workExperience)) {
        formData.workExperience = [];
      }

      // Ensure criminalRecord exists
      if (!formData.criminalRecord) {
        formData.criminalRecord = {
          hasCriminalRecord: "no",
          details: ""
        };
      }

      // Ensure health exists
      if (!formData.health) {
        formData.health = {
          majorIllness: "",
          physicalDefect: ""
        };
      }

      // Ensure bankDetails exists
      if (!formData.bankDetails) {
        formData.bankDetails = {
          nameOnBank: "",
          accountNo: "",
          ifsc: "",
          branchAddress: ""
        };
      }

      // Ensure shiftDetails exists
      if (!formData.shiftDetails) {
        formData.shiftDetails = {
          workHoursPerDay: 8,
          weeklyOff: "Sunday"
        };
      }

      setForm(formData);
    }
  }, [selectedEmployee]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => {
      if (!prev) return { [field]: value };
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setForm((prev: any) => {
      if (!prev) return { [parent]: { [field]: value } };
      return {
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [field]: value
        }
      };
    });
  };

  const handleNestedArrayChange = (parent: string, index: number, field: string, value: any) => {
    setForm((prev: any) => {
      // Add safety checks
      if (!prev) return { [parent]: [] };
      if (!prev[parent] || !Array.isArray(prev[parent])) {
        return { ...prev, [parent]: [] };
      }

      const newArray = [...prev[parent]];
      // Ensure index is valid
      if (index < 0 || index >= newArray.length) {
        // If index is out of bounds, extend the array
        while (newArray.length <= index) {
          newArray.push({});
        }
      }

      newArray[index] = {
        ...(newArray[index] || {}),
        [field]: value
      };
      return {
        ...prev,
        [parent]: newArray
      };
    });
  };

  const handleAddArrayItem = (field: string, newItem: any) => {
    setForm((prev: any) => {
      if (!prev) return { [field]: [newItem] };
      return {
        ...prev,
        [field]: [...(prev[field] || []), newItem]
      };
    });
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setForm((prev: any) => {
      // Add safety checks
      if (!prev) return {};
      if (!prev[field] || !Array.isArray(prev[field])) {
        return prev;
      }

      const newArray = [...prev[field]];
      // Ensure index is valid
      if (index < 0 || index >= newArray.length) {
        return prev;
      }

      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const handleEditToggle = (section: string) => {
    setEditMode(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSaveSection = async (section: string) => {
    if (!selectedEmployee || !selectedEmployee.empId) {
      toast.error("No employee selected");
      return;
    }

    setLoading(true);
    try {
      let patchData: any = {};

      switch (section) {
        case "personal":
          patchData = {
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            email: form.email,
            mobile: form.mobile,
            phone: form.phone,
            dob: form.dob,
            gender: form.gender,
            fatherName: form.fatherName,
            bloodGroup: form.bloodGroup,
            maritalStatus: form.maritalStatus,
            nationality: form.nationality,
            presentAddress: form.presentAddress,
            currentAddress: form.currentAddress,
            profileImage: form.profileImage
          };
          break;

        case "employment":
          // Prepare the base patch data
          patchData = {
            department: form.department,
            position: form.position,
            employeeCategory: form.employeeCategory,
            employeeType: form.employeeType,
            status: form.status,
            monthlySalary: form.monthlySalary,
            joiningDate: form.joiningDate,
            shiftDetails: form.shiftDetails
          };

          // Handle salary effective date - only include if both month and year are selected
          // This is an additive change that maintains backward compatibility
          const { effectiveMonth, effectiveYear } = form;
          if (effectiveMonth && effectiveYear) {
            // Create a date string for the first day of the selected month/year
            const effectiveDate = new Date(`${effectiveYear}-${effectiveMonth}-01T00:00:00.000Z`);
            // Add the effectiveFrom field to the patch data
            patchData.effectiveFrom = effectiveDate.toISOString();
          }
          break;

        case "bank":
          patchData = {
            bankDetails: form.bankDetails
          };
          break;

        case "statutory":
          patchData = {
            pan: form.pan,
            aadhaarNo: form.aadhaarNo,
            uanNo: form.uanNo,
            pfNo: form.pfNo
          };
          break;

        case "education":
          patchData = {
            education: form.education
          };
          break;

        case "family":
          patchData = {
            familyDetails: form.familyDetails
          };
          break;

        case "emergency":
          patchData = {
            emergencyContacts: form.emergencyContacts
          };
          break;

        case "work":
          patchData = {
            workExperience: form.workExperience
          };
          break;

        case "languages":
          patchData = {
            languages: form.languages
          };
          break;

        case "criminal":
          patchData = {
            criminalRecord: form.criminalRecord
          };
          break;

        case "health":
          patchData = {
            health: form.health
          };
          break;

        case "references":
          patchData = {
            references: form.references
          };
          break;

        case "other":
          patchData = {
            hobbies: form.hobbies,
            extracurricular: form.extracurricular
          };
          break;

        default:
          patchData = null;
      }

      // Remove empty fields
      if (patchData) {
        Object.keys(patchData).forEach(key => {
          if (patchData[key] === "" || patchData[key] === null || patchData[key] === undefined) {
            delete patchData[key];
          }
        });

        // Remove empty objects
        Object.keys(patchData).forEach(key => {
          if (typeof patchData[key] === 'object' && patchData[key] !== null && !Array.isArray(patchData[key])) {
            if (Object.keys(patchData[key]).length === 0) {
              delete patchData[key];
            }
          }
        });

        // Remove empty arrays
        Object.keys(patchData).forEach(key => {
          if (Array.isArray(patchData[key]) && patchData[key].length === 0) {
            delete patchData[key];
          }
        });
      }

      // If no data to save, show a message and return
      if (!patchData || Object.keys(patchData).length === 0) {
        toast.info("No changes to save");
        setLoading(false);
        return;
      }

      console.log("Employee ID:", selectedEmployee.empId);
      console.log("Selected Employee Object:", selectedEmployee);
      console.log("Patch Data:", JSON.stringify(patchData, null, 2));

      try {
        // Use specific endpoint for health section
        let response: any;
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

        // Check if response has the expected structure
        if (response && typeof response === 'object') {
          // Handle both success formats
          const isSuccess = response.data?.success === true ||
            response.data?.employee ||
            (response.status >= 200 && response.status < 300);

          if (isSuccess) {
            console.log("✅ Save successful");

            // Extract updated employee data from response
            let updatedEmployeeData = null;
            if (response.data?.employee) {
              updatedEmployeeData = response.data.employee;
            } else if (response.data?.data) {
              updatedEmployeeData = response.data.data;
            } else {
              updatedEmployeeData = response.data;
            }

            // Update the selected employee with the new data
            if (updatedEmployeeData) {
              setSelectedEmployee((prev: any) => {
                // If updatedEmployeeData is the full employee object, use it directly
                // Otherwise merge with previous data
                if (updatedEmployeeData && updatedEmployeeData.empId) {
                  return updatedEmployeeData;
                }
                return { ...(prev || {}), ...updatedEmployeeData };
              });

              // Update the form with the new data
              setForm((prev: any) => {
                // If updatedEmployeeData is the full employee object, use it directly
                // Otherwise merge with previous data
                if (updatedEmployeeData && updatedEmployeeData.empId) {
                  return updatedEmployeeData;
                }
                return { ...(prev || {}), ...updatedEmployeeData };
              });

              // Update the employees list
              setEmployees((prev: any[]) => {
                if (!prev || !Array.isArray(prev)) return prev || [];
                return prev.map(emp => {
                  if (!emp || !emp.empId) return emp;
                  return emp.empId === selectedEmployee.empId
                    ? { ...(emp.empId ? emp : {}), ...updatedEmployeeData }
                    : emp;
                });
              });
            }

            setEditMode({ ...editMode, [section]: false });
            toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
          } else {
            console.log("❌ API returned success: false with message:", response.data?.message || response.data?.error);
            throw new Error(response.data?.message || response.data?.error || "Failed to update employee information");
          }
        } else {
          // Handle case where response doesn't have expected structure
          // But still treat as success if HTTP status is OK
          if (response && response.status >= 200 && response.status < 300) {
            console.log("⚠️ HTTP success but no success field, treating as success");
            // Still proceed with the success flow
            // Refresh the employee data from the server to ensure we have the latest
            try {
              const refreshResponse = await api.get("/employees/getAllEmployees");
              console.log("Refresh Response:", refreshResponse);
              if (refreshResponse.data && refreshResponse.data.employees) {
                const refreshedEmployees = refreshResponse.data.employees;
                setEmployees(refreshedEmployees);

                // Find and update the selected employee
                const updatedEmployee = refreshedEmployees.find(
                  (emp: any) => emp && emp.empId === selectedEmployee.empId
                );
                if (updatedEmployee) {
                  setSelectedEmployee(updatedEmployee);
                  setForm(updatedEmployee);
                }
              }
            } catch (refreshError) {
              console.error("Error refreshing employee data:", refreshError);
            }

            setEditMode({ ...editMode, [section]: false });
            toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
          } else {
            throw new Error("Unexpected response format");
          }
        }
      } catch (error: any) {
        console.error("Error saving section:", error);
        let errorMessage = `Failed to save ${section}: `;
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 400) {
            errorMessage += "Invalid data provided";
          } else if (status === 401) {
            errorMessage += "Authentication required";
          } else if (status === 403) {
            errorMessage += "Permission denied";
          } else if (status === 404) {
            errorMessage += "Employee not found";
          } else if (status === 409) {
            errorMessage += "Data conflict - possibly duplicate information";
          } else if (status >= 500) {
            errorMessage += "Server error - please try again later";
          } else if (data?.message) {
            errorMessage += data.message;
          } else if (data?.error) {
            errorMessage += data.error;
          } else {
            errorMessage += "Unknown error occurred";
          }
        } else if (error.request) {
          errorMessage += "Network error - please check your connection";
        } else {
          errorMessage += error.message || "Unknown error";
        }
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error in handleSaveSection:", error);
      toast.error(`Failed to save ${section}: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBioDataPDF = async () => {
    if (!selectedEmployee?.empId) {
      toast.error("No employee selected");
      return;
    }

    // Set loading state
    setIsGeneratingPDF(true);
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
    } finally {
      // Reset loading state
      setIsGeneratingPDF(false);
    }
  };

  // Add this function to render sections properly
  const renderSection = (section: string) => {
    // Add safety check
    if (!section) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Invalid section</p>
        </div>
      );
    }

    try {
      switch (section) {
        case "personal":
          return (
            <PersonalSection
              form={form}
              isEditing={editMode.personal || false}
              handleChange={handleChange}
              handleProfileImageUpdate={handleProfileImageUpdate}
              selectedEmployee={selectedEmployee}
            />
          );
        case "employment":
          return (
            <EmploymentSection
              form={form}
              isEditing={editMode.employment || false}
              handleChange={handleChange}
              handleNestedChange={handleNestedChange}
              selectedEmployee={selectedEmployee}
              setShowSalaryHistory={setShowSalaryHistory}
            />
          );
        case "bank":
          return (
            <BankSection
              form={form}
              isEditing={editMode.bank || false}
              handleNestedChange={handleNestedChange}
            />
          );
        case "statutory":
          return (
            <StatutorySection
              form={form}
              isEditing={editMode.statutory || false}
              handleChange={handleChange}
            />
          );
        case "education":
          return (
            <EducationSection
              form={form}
              isEditing={editMode.education || false}
              handleNestedArrayChange={handleNestedArrayChange}
              handleAddArrayItem={handleAddArrayItem}
              handleRemoveArrayItem={handleRemoveArrayItem}
            />
          );
        case "family":
          return (
            <FamilySection
              form={form}
              isEditing={editMode.family || false}
              handleNestedArrayChange={handleNestedArrayChange}
              handleAddArrayItem={handleAddArrayItem}
              handleRemoveArrayItem={handleRemoveArrayItem}
            />
          );
        case "emergency":
          return (
            <EmergencySection
              form={form}
              isEditing={editMode.emergency || false}
              handleNestedArrayChange={handleNestedArrayChange}
              handleAddArrayItem={handleAddArrayItem}
              handleRemoveArrayItem={handleRemoveArrayItem}
            />
          );
        case "work":
          return (
            <WorkSection
              form={form}
              isEditing={editMode.work || false}
              handleNestedArrayChange={handleNestedArrayChange}
              handleAddArrayItem={handleAddArrayItem}
              handleRemoveArrayItem={handleRemoveArrayItem}
            />
          );
        case "languages":
          return (
            <LanguagesSection
              form={form}
              isEditing={editMode.languages || false}
              handleNestedArrayChange={handleNestedArrayChange}
              handleAddArrayItem={handleAddArrayItem}
              handleRemoveArrayItem={handleRemoveArrayItem}
            />
          );
        case "criminal":
          return (
            <CriminalSection
              form={form}
              isEditing={editMode.criminal || false}
              handleNestedChange={handleNestedChange}
            />
          );
        case "health":
          return (
            <HealthSection
              form={form}
              isEditing={editMode.health || false}
              handleNestedChange={handleNestedChange}
            />
          );
        case "references":
          return (
            <ReferencesSection
              form={form}
              isEditing={editMode.references || false}
              handleNestedChange={handleNestedChange}
            />
          );
        case "other":
          return (
            <OtherSection
              form={form}
              isEditing={editMode.other || false}
              handleChange={handleChange}
            />
          );
        default:
          return (
            <div className="text-center py-8 text-gray-500">
              <p>This section is under development</p>
            </div>
          );
      }
    } catch (error) {
      console.error(`Error rendering section ${section}:`, error);
      return (
        <div className="text-center py-8 text-red-500">
          <p>Error loading {section} section</p>
        </div>
      );
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Employee Profile</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <EmployeeSearchDropdown
          employeeSelectorOpen={employeeSelectorOpen}
          setEmployeeSelectorOpen={setEmployeeSelectorOpen}
          employeeSearchTerm={employeeSearchTerm}
          setEmployeeSearchTerm={setEmployeeSearchTerm}
          filteredEmployees={filteredEmployees}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
          getProfileImageUrl={getProfileImageUrl}
        />

        {selectedEmployee ? (
          <>
            <EmployeeProfileHeader
              selectedEmployee={selectedEmployee}
              getProfileImageUrl={getProfileImageUrl}
              generateBioDataPDF={generateBioDataPDF}
              isGeneratingPDF={isGeneratingPDF}
            />

            <EmployeeProfileTabs
              sectionList={sectionList}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              editMode={editMode}
              setEditMode={setEditMode}
              handleSaveSection={handleSaveSection}
              loading={loading}
              renderSection={renderSection}
            />

            <SalaryHistoryManager
              employee={selectedEmployee}
              open={showSalaryHistory}
              onOpenChange={setShowSalaryHistory}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">Select an employee to view their profile</p>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}