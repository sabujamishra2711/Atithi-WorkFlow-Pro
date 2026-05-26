import { User } from "../../models/user.model.js";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAllEmployees = async (_, res) => {
  try {
    const employees = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 }); // Exclude admins
    res.status(200).json({
      success: true,
      employees
    });
  } catch (err) {
    console.error("Fetch Employees Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch employees"
    });
  }
};

export const getSingleEmployees = async (req, res) => {
  try {
    const { empId } = req.params;
    const employee = await User.findOne({ empId: empId.toUpperCase() });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { empId } = req.params;
    const updateFields = req.body;

    // Check if employee exists
    const existingEmployee = await User.findOne({ empId: empId.toUpperCase() });
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // If empId or email is being updated, check for duplicates
    if (updateFields.empId || updateFields.email) {
      const duplicateQuery = {
        $or: []
      };

      if (updateFields.empId) {
        duplicateQuery.$or.push({ empId: updateFields.empId });
      }
      if (updateFields.email) {
        duplicateQuery.$or.push({ email: updateFields.email });
      }

      // Exclude current employee from duplicate check
      duplicateQuery._id = { $ne: existingEmployee._id };

      const duplicate = await User.findOne(duplicateQuery);
      if (duplicate) {
        return res.status(409).json({
          message: 'Employee ID or Email already exists'
        });
      }
    }

    // Ensure shiftDetails is created if missing and updateFields.shiftDetails is present
    if (updateFields.shiftDetails) {
      if (!existingEmployee.shiftDetails) {
        existingEmployee.shiftDetails = {};
      }
      existingEmployee.shiftDetails = {
        ...existingEmployee.shiftDetails,
        ...updateFields.shiftDetails
      };
      updateFields.shiftDetails = existingEmployee.shiftDetails;
    }

    // Handle unset for shiftDetails.workHoursPerDay
    let unsetFields = {};
    if (updateFields.shiftDetails && updateFields.shiftDetails.workHoursPerDay === undefined) {
      unsetFields['shiftDetails.workHoursPerDay'] = "";
      // Remove from updateFields so it doesn't get set as undefined
      delete updateFields.shiftDetails.workHoursPerDay;
    }
    const updateQuery = {};
    if (Object.keys(updateFields).length > 0) updateQuery['$set'] = updateFields;
    if (Object.keys(unsetFields).length > 0) updateQuery['$unset'] = unsetFields;
    const updatedEmployee = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      updateQuery,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ employee: updatedEmployee });
  } catch (err) {
    console.error('Update Employee Error:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { empId } = req.params;

    // Find the employee first to get their data before deletion
    const employee = await User.findOne({ empId: empId.toUpperCase() });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Store employee's Cloudinary public_id for image deletion
    let cloudinaryPublicId = null;
    if (employee.profileImage) {
      // Extract public_id from Cloudinary URL
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/employee-profiles/A0000001.jpg
      cloudinaryPublicId = `employee-profiles/${empId.toUpperCase()}`;
    }

    // Track deletion results
    const deletionResults = {
      employee: false,
      cloudinaryImage: false,
      punches: 0,
      leaves: 0,
      deductions: 0,
      performanceReviews: 0
    };

    try {
      // 1. Delete Cloudinary profile image if exists
      if (cloudinaryPublicId) {
        try {
          const { v2: cloudinary } = await import('cloudinary');
          // Configure Cloudinary
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });

          // Delete image from Cloudinary
          const destroyResult = await cloudinary.uploader.destroy(cloudinaryPublicId);
          deletionResults.cloudinaryImage = destroyResult.result === 'ok' || destroyResult.result === 'not_found';
          console.log(`Cloudinary deletion result for employee ${empId}:`, destroyResult);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error:', cloudinaryError);
          // We don't fail the entire operation if Cloudinary deletion fails
          // but we log it for manual cleanup
        }
      }

      // 2. Delete all related punches (no longer needed as we're using sessions)
      deletionResults.punches = 0;

      // 3. Delete all related leaves
      const { Leave } = await import('../../models/leave.model.js');
      const leaveDeleteResult = await Leave.deleteMany({ empId });
      deletionResults.leaves = leaveDeleteResult.deletedCount;

      // 4. Delete all related deductions
      const { Deduction } = await import('../../models/deduction.model.js');
      const deductionDeleteResult = await Deduction.deleteMany({ employee: employee._id });
      deletionResults.deductions = deductionDeleteResult.deletedCount;

      // 5. Delete all related performance reviews
      const { PerformanceReview } = await import('../../models/performanceReview.model.js');
      const performanceReviewDeleteResult = await PerformanceReview.deleteMany({ employeeId: empId });
      deletionResults.performanceReviews = performanceReviewDeleteResult.deletedCount;

      // 6. Delete employee record (do this last to ensure all related data is deleted first)
      const deletedEmployee = await User.findOneAndDelete({ empId: empId.toUpperCase() });
      if (!deletedEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      deletionResults.employee = true;

      // Log deletion results
      console.log(`Deleted employee ${empId}:`, deletionResults);

      res.status(200).json({
        success: true,
        message: 'Employee and all related records deleted successfully',
        deletedCounts: {
          leaves: deletionResults.leaves,
          deductions: deletionResults.deductions,
          performanceReviews: deletionResults.performanceReviews
        }
      });
    } catch (deletionError) {
      console.error('Delete Employee Error:', deletionError);
      // If we've already deleted the employee but failed on related data,
      // we should log this for manual cleanup
      res.status(500).json({
        success: false,
        error: 'Failed to delete employee and related records',
        message: deletionError.message
      });
    }
  } catch (err) {
    console.error('Delete Employee Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee and related records',
      message: err.message
    });
  }
};

// Update employee profile image
export const updateProfileImage = async (req, res) => {
  try {
    console.log('Update profile image called with params:', req.params);
    console.log('Request file:', req.file);

    const { empId } = req.params;

    // Check if file exists
    if (!req.file) {
      console.error('No file provided in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('File received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });

    // Import the Cloudinary upload function using a more robust approach
    let uploadOnCloudinary;
    try {
      console.log('Attempting to import Cloudinary utility...');
      // Fix: Use correct relative path for ES modules
      const cloudinaryModule = await import('../../utils/cloudinary.js');
      uploadOnCloudinary = cloudinaryModule.uploadOnCloudinary;
      console.log('Cloudinary utility imported successfully');
    } catch (importError) {
      console.error('Failed to import Cloudinary utility:', importError);
      return res.status(500).json({
        success: false,
        message: 'Failed to load Cloudinary utility',
        error: importError.message
      });
    }

    // Upload image to Cloudinary
    console.log('Attempting to upload to Cloudinary...');
    const cloudinaryResult = await uploadOnCloudinary(req.file.path, empId);

    if (!cloudinaryResult) {
      console.error('Cloudinary upload returned null or undefined');
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Cloudinary'
      });
    }

    console.log('Cloudinary upload successful:', cloudinaryResult);

    // Update profile image URL in database
    console.log('Updating employee profile image in database...');
    const updatedEmployee = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      { profileImage: cloudinaryResult.secure_url },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      console.error('Employee not found for empId:', empId);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('Employee profile image updated successfully:', updatedEmployee.empId);

    // Return consistent response format
    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        empId: updatedEmployee.empId,
        profileImage: updatedEmployee.profileImage
      },
      employee: updatedEmployee // Also include full employee object for compatibility
    });
  } catch (err) {
    console.error('Update Profile Image Error:', err);
    // Send a more detailed error message to help with debugging
    res.status(500).json({
      success: false,
      message: 'Failed to update profile image',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get employee health data
export const getEmployeeHealth = async (req, res) => {
  try {
    const { empId } = req.params;
    const employee = await User.findOne({ empId: empId.toUpperCase() });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        health: employee.health || {}
      }
    });
  } catch (err) {
    console.error("Get Employee Health Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch employee health data"
    });
  }
};

// Update employee health data
export const updateEmployeeHealth = async (req, res) => {
  try {
    const { empId } = req.params;
    const { majorIllness, physicalDefect } = req.body;

    // Check if employee exists
    const existingEmployee = await User.findOne({ empId: empId.toUpperCase() });
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update health data
    const updatedEmployee = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      {
        $set: {
          "health.majorIllness": majorIllness,
          "health.physicalDefect": physicalDefect
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Health information updated successfully',
      data: {
        health: updatedEmployee.health
      }
    });
  } catch (err) {
    console.error('Update Employee Health Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee health information'
    });
  }
};

// Generate and download employee bio data as PDF
export const downloadEmployeeBioData = async (req, res) => {
  try {
    const { empId } = req.params;
    const employee = await User.findOne({ empId: empId.toUpperCase() });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${employee.empId}_bio_data.pdf"`);

    doc.pipe(res);

    // Helper function to add section header
    const addSectionHeader = (title, y) => {
      doc.fillColor('#2c3e50')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(title, 40, y);
      doc.moveTo(40, y + 18)
        .lineTo(555, y + 18)
        .stroke('#2c3e50');
      return y + 30;
    };

    // Helper function to add field
    const addField = (label, value, x, y, width = 250) => {
      doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${label}:`, x, y);
      doc.font('Helvetica')
        .text(value || 'N/A', x + 100, y, { width: width - 100 });
      return y + 15;
    };

    let currentY = 40;

    // Title
    doc.fillColor('#2c3e50')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('EMPLOYEE BIO DATA', 40, currentY, { align: 'center' });
    currentY += 40;

    // Personal Information Section
    currentY = addSectionHeader('PERSONAL INFORMATION', currentY);
    currentY = addField('Employee ID', employee.empId, 40, currentY);
    currentY = addField('First Name', employee.firstName, 40, currentY);
    currentY = addField('Middle Name', employee.middleName, 40, currentY);
    currentY = addField('Last Name', employee.lastName, 40, currentY);
    currentY = addField('Date of Birth', employee.dob ? employee.dob.toLocaleDateString() : '', 40, currentY);
    currentY = addField('Place of Birth', employee.placeOfBirth, 40, currentY);
    currentY = addField('Father Name', employee.fatherName, 40, currentY);
    currentY = addField('Caste', employee.caste, 40, currentY);
    currentY = addField('Sub Caste', employee.subCaste, 40, currentY);
    currentY = addField('Religion', employee.religion, 40, currentY);
    currentY = addField('Blood Group', employee.bloodGroup, 40, currentY);
    currentY = addField('Identification Mark', employee.identificationMark, 40, currentY);
    currentY = addField('Nationality', employee.nationality, 40, currentY);
    currentY = addField('Marital Status', employee.maritalStatus, 40, currentY);
    currentY = addField('Height', employee.height, 40, currentY);
    currentY = addField('Weight', employee.weight, 40, currentY);
    currentY = addField('Present Address', employee.presentAddress, 40, currentY, 500);
    currentY = addField('Current Address', employee.currentAddress, 40, currentY, 500);
    currentY += 10;

    // Employment Information Section
    currentY = addSectionHeader('EMPLOYMENT INFORMATION', currentY);
    currentY = addField('Email', employee.email, 40, currentY);
    currentY = addField('Mobile Number', employee.mobile || employee.phone, 40, currentY);
    currentY = addField('Department', employee.department, 40, currentY);
    currentY = addField('Position/Designation', employee.position, 40, currentY);
    currentY = addField('Employee Type', employee.employeeType, 40, currentY);
    currentY = addField('Employee Category', employee.employeeCategory, 40, currentY);
    currentY = addField('Monthly Salary', employee.monthlySalary ? `₹${employee.monthlySalary}` : '', 40, currentY);
    currentY = addField('Joining Date', employee.joiningDate ? employee.joiningDate.toLocaleDateString() : '', 40, currentY);
    currentY = addField('Status', employee.status, 40, currentY);
    currentY = addField('Working Hours', employee.workingHrs, 40, currentY);
    currentY += 10;

    // Bank Details Section
    if (employee.bankDetails) {
      currentY = addSectionHeader('BANK DETAILS', currentY);
      currentY = addField('Bank Name', employee.bankDetails.nameOnBank, 40, currentY);
      currentY = addField('Account Number', employee.bankDetails.accountNo, 40, currentY);
      currentY = addField('IFSC Code', employee.bankDetails.ifsc, 40, currentY);
      currentY = addField('Branch Address', employee.bankDetails.branchAddress, 40, currentY, 500);
      currentY = addField('Mobile Number', employee.bankDetails.mobileNo, 40, currentY);
      currentY += 10;
    }

    // Statutory Information Section
    currentY = addSectionHeader('STATUTORY INFORMATION', currentY);
    currentY = addField('PAN Number', employee.pan, 40, currentY);
    currentY = addField('UAN Number', employee.uanNo, 40, currentY);
    currentY = addField('Aadhaar Number', employee.aadhaarNo, 40, currentY);
    currentY += 10;

    // Check if we need a new page
    if (currentY > 700) {
      doc.addPage();
      currentY = 40;
    }

    // Education Section
    if (employee.education && employee.education.length > 0) {
      currentY = addSectionHeader('EDUCATION', currentY);
      employee.education.forEach((edu, index) => {
        doc.fillColor('#34495e')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`Education ${index + 1}:`, 40, currentY);
        currentY += 15;
        currentY = addField('Course Name', edu.courseName, 60, currentY);
        currentY = addField('Institution', edu.institution, 60, currentY);
        currentY = addField('Passing Year', edu.passingYear, 60, currentY);
        currentY = addField('Marks/Percentage', edu.marksPercentage, 60, currentY);
        currentY = addField('Specialization', edu.specialization, 60, currentY);
        currentY += 5;
      });
      currentY += 10;
    }

    // Family Details Section
    if (employee.familyDetails && employee.familyDetails.length > 0) {
      currentY = addSectionHeader('FAMILY DETAILS', currentY);
      employee.familyDetails.forEach((family, index) => {
        // Handle multiple field name variations for compatibility
        const name = family.name || family['Name'];
        const relation = family.relation || family['Relation'] || family.relationship;
        const age = family.age || family['Age'];
        const occupation = family.occupation || family['Occupation'];
        const otherDetails = family.otherDetails || family['Other Details'] || family.details;

        // Only show family entries that have at least a name or relation
        if (name || relation) {
          doc.fillColor('#34495e')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(`Family Member ${index + 1}:`, 40, currentY);
          currentY += 15;
          currentY = addField('Name', name || '', 60, currentY);
          currentY = addField('Age', age || '', 60, currentY);
          currentY = addField('Occupation', occupation || '', 60, currentY);
          currentY = addField('Relation', relation || '', 60, currentY);
          currentY = addField('Other Details', otherDetails || '', 60, currentY, 450);
          currentY += 5;
        }
      });
      currentY += 10;
    }

    // Emergency Contacts Section
    if (employee.emergencyContacts && employee.emergencyContacts.length > 0) {
      currentY = addSectionHeader('EMERGENCY CONTACTS', currentY);
      employee.emergencyContacts.forEach((contact, index) => {
        // Handle multiple field name variations for compatibility
        const name = contact.name || contact['Name'];
        const relation = contact.relation || contact['Relation'] || contact.relationship;
        const mobile = contact.mobile || contact.phone || contact['Phone Number'] || contact['Mobile'];
        const address = contact.address || contact['Address'];

        // Only show contacts that have at least a name or mobile
        if (name || mobile || relation) {
          doc.fillColor('#34495e')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(`Emergency Contact ${index + 1}:`, 40, currentY);
          currentY += 15;
          currentY = addField('Name', name || '', 60, currentY);
          currentY = addField('Address', address || '', 60, currentY, 450);
          currentY = addField('Relation', relation || '', 60, currentY);
          currentY = addField('Phone Number', mobile || '', 60, currentY);
          currentY += 5;
        }
      });
      currentY += 10;
    }

    // Check if we need a new page
    if (currentY > 650) {
      doc.addPage();
      currentY = 40;
    }

    // Work Experience Section
    if (employee.workExperience && employee.workExperience.length > 0) {
      currentY = addSectionHeader('WORK EXPERIENCE', currentY);
      employee.workExperience.forEach((work, index) => {
        // Handle multiple field name variations for compatibility
        const employerName = work.employerName || work['Name of Employer'] || work.employer;
        const designation = work.designation || work['Designation'] || work.position;
        const address = work.address || work['Address'];
        const salary = work.salary || work['Salary'];
        const reasonForLeaving = work.reasonForLeaving || work['Reason for Leaving'];

        // Only show work experience entries that have at least an employer name
        if (employerName || designation || address) {
          doc.fillColor('#34495e')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(`Work Experience ${index + 1}:`, 40, currentY);
          currentY += 15;
          currentY = addField('Employer Name', employerName, 60, currentY);
          currentY = addField('Address', address, 60, currentY, 450);
          currentY = addField('Designation', designation, 60, currentY);

          // Handle dates properly with multiple field name variations
          let joiningDateStr = 'N/A';
          const joiningDate = work.joiningDate || work['Date of Joining'] || work.joinDate;
          if (joiningDate) {
            try {
              joiningDateStr = new Date(joiningDate).toLocaleDateString();
            } catch (e) {
              joiningDateStr = joiningDate.toString();
            }
          }

          let leavingDateStr = 'N/A';
          const leavingDate = work.leavingDate || work['Date of Leaving'] || work.leaveDate;
          if (leavingDate) {
            try {
              leavingDateStr = new Date(leavingDate).toLocaleDateString();
            } catch (e) {
              leavingDateStr = leavingDate.toString();
            }
          }

          currentY = addField('Joining Date', joiningDateStr, 60, currentY);
          currentY = addField('Leaving Date', leavingDateStr, 60, currentY);
          currentY = addField('Salary', salary, 60, currentY);
          currentY = addField('Reason for Leaving', reasonForLeaving, 60, currentY, 450);
          currentY += 5;
        }
      });
      currentY += 10;
    }

    // Languages Section
    if (employee.languages && employee.languages.length > 0) {
      currentY = addSectionHeader('LANGUAGES', currentY);
      employee.languages.forEach((lang, index) => {
        // Handle multiple field name variations for compatibility
        const language = lang.language || lang['Language'];

        // Only show languages that have at least a language name
        if (language) {
          doc.fillColor('#34495e')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(`Language ${index + 1}:`, 40, currentY);
          currentY += 15;
          currentY = addField('Language', language, 60, currentY);

          // Properly handle boolean values for language skills with multiple field name variations
          const canRead = lang.canRead !== undefined ?
            (lang.canRead === true ? 'Yes' : (lang.canRead === false ? 'No' : 'N/A')) :
            (lang['Can Read'] !== undefined ? lang['Can Read'] : 'N/A');

          const canWrite = lang.canWrite !== undefined ?
            (lang.canWrite === true ? 'Yes' : (lang.canWrite === false ? 'No' : 'N/A')) :
            (lang['Can Write'] !== undefined ? lang['Can Write'] : 'N/A');

          const canSpeak = lang.canSpeak !== undefined ?
            (lang.canSpeak === true ? 'Yes' : (lang.canSpeak === false ? 'No' : 'N/A')) :
            (lang['Can Speak'] !== undefined ? lang['Can Speak'] : 'N/A');

          currentY = addField('Can Read', canRead, 60, currentY);
          currentY = addField('Can Write', canWrite, 60, currentY);
          currentY = addField('Can Speak', canSpeak, 60, currentY);
          currentY += 5;
        }
      });
      currentY += 10;
    }

    // Criminal Record Section
    if (employee.criminalRecord) {
      currentY = addSectionHeader('CRIMINAL RECORD', currentY);
      currentY = addField('Has Criminal Record', employee.criminalRecord.hasCriminalRecord, 40, currentY);
      currentY = addField('Details', employee.criminalRecord.details, 40, currentY, 500);
      currentY += 10;
    }

    // Health Information Section
    if (employee.health) {
      currentY = addSectionHeader('HEALTH INFORMATION', currentY);
      currentY = addField('Major Illness', employee.health.majorIllness, 40, currentY, 500);
      currentY = addField('Physical Defect', employee.health.physicalDefect, 40, currentY, 500);
      currentY += 10;
    }

    // References Section - Handle both object and array formats
    let hasReferenceData = false;
    if (employee.references) {
      if (Array.isArray(employee.references) && employee.references.length > 0) {
        // Handle array format
        currentY = addSectionHeader('REFERENCES', currentY);
        employee.references.forEach((ref, index) => {
          doc.fillColor('#34495e')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(`Reference ${index + 1}:`, 40, currentY);
          currentY += 15;
          currentY = addField('Referenced By', ref.referencedBy, 60, currentY);
          currentY = addField('Name', ref.name, 60, currentY);
          currentY = addField('Organization', ref.organization || ref.company, 60, currentY);
          currentY += 5;
        });
        hasReferenceData = true;
      } else if (typeof employee.references === 'object' && !Array.isArray(employee.references)) {
        // Handle object format
        if (employee.references.referencedBy || employee.references.name || employee.references.organization) {
          currentY = addSectionHeader('REFERENCES', currentY);
          currentY = addField('Referenced By', employee.references.referencedBy, 40, currentY);
          currentY = addField('Name', employee.references.name, 40, currentY);
          currentY = addField('Organization', employee.references.organization, 40, currentY);
          hasReferenceData = true;
        }
      }
    }

    // Fallback to legacy reference fields if no modern references found
    if (!hasReferenceData && (employee.referenceBy || employee.referralName || employee.referralOrganization)) {
      currentY = addSectionHeader('REFERENCES (LEGACY)', currentY);
      currentY = addField('Reference By', employee.referenceBy, 40, currentY);
      currentY = addField('Referral Name', employee.referralName, 40, currentY);
      currentY = addField('Referral Organization', employee.referralOrganization, 40, currentY);
    }

    if (hasReferenceData || employee.referenceBy || employee.referralName || employee.referralOrganization) {
      currentY += 10;
    }

    // Other Information Section
    currentY = addSectionHeader('OTHER INFORMATION', currentY);
    currentY = addField('Extracurricular Activities', employee.extracurricular, 40, currentY, 500);
    currentY = addField('Hobbies', employee.hobbies, 40, currentY, 500);
    currentY = addField('Reference By', employee.referenceBy, 40, currentY);
    currentY = addField('Referral Name', employee.referralName, 40, currentY);
    currentY = addField('Referral Organization', employee.referralOrganization, 40, currentY);

    // Shift Details Section
    if (employee.shiftDetails) {
      currentY += 10;
      currentY = addSectionHeader('SHIFT DETAILS', currentY);
      currentY = addField('Work Hours Per Day', employee.shiftDetails.workHoursPerDay ? `${employee.shiftDetails.workHoursPerDay} hours` : '', 40, currentY);
      currentY = addField('Weekly Off', employee.shiftDetails.weeklyOff, 40, currentY);
      currentY = addField('Type', employee.shiftDetails.type, 40, currentY);
    }

    // Footer
    doc.fontSize(10)
      .fillColor('#7f8c8d')
      .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 40, doc.page.height - 60);

    doc.end();
  } catch (err) {
    console.error('Generate Employee Bio Data Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Generate and download all employees ID cards as PDF
export const downloadEmployeeIdCard = async (req, res) => {
  try {
    const { empId } = req.params;
    const employee = await User.findOne({ empId: empId.toUpperCase() });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${employee.empId}_idcard.pdf"`);

    doc.pipe(res);

    // Card design - Professional Employee ID Card Layout

    const cardX = 50;
    const cardY = 100;
    const cardWidth = 495;
    const cardHeight = 350;

    // Card border and background
    doc.rect(cardX, cardY, cardWidth, cardHeight)
      .stroke('#2c3e50')
      .lineWidth(2);

    // Header section
    doc.rect(cardX, cardY, cardWidth, 60)
      .fill('#27ae60')
      .stroke();

    // Company/Organization name
    doc.fillColor('white')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('EMPLOYEE ID CARD', cardX + 20, cardY + 20, { width: cardWidth - 40, align: 'center' });

    // Main content area
    doc.fillColor('black')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Employee ID:', cardX + 30, cardY + 90);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.empId, cardX + 180, cardY + 90);

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Employee Name:', cardX + 30, cardY + 130);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.name || 'N/A', cardX + 180, cardY + 130);

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Department:', cardX + 30, cardY + 170);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.department || 'N/A', cardX + 180, cardY + 170);

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Designation:', cardX + 30, cardY + 210);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.position || employee.designation || 'N/A', cardX + 180, cardY + 210);

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Email:', cardX + 30, cardY + 250);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.email || 'N/A', cardX + 180, cardY + 250);

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Phone:', cardX + 30, cardY + 290);

    doc.fontSize(16)
      .font('Helvetica')
      .text(employee.mobile || employee.phone || 'N/A', cardX + 180, cardY + 290);

    // Footer with issue date
    doc.fontSize(12)
      .font('Helvetica')
      .text(`Issued: ${new Date().toLocaleDateString()}`, cardX + 30, cardY + 320);

    // QR Code placeholder or barcode area
    doc.rect(cardX + 350, cardY + 80, 120, 120)
      .stroke('#cccccc');

    doc.fontSize(10)
      .text('QR/Barcode', cardX + 380, cardY + 135, { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Generate All Employee ID Cards Error:', err);
    res.status(500).json({ error: err.message });
  }
};