import mongoose, { Schema } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true }, // e.g., "empId"
  seq: { type: Number, default: 0 },
});

// Create the Counter model (kept for potential future use)
const Counter = mongoose.model('Counter', counterSchema);

const EducationSchema = new mongoose.Schema({
  courseName: String,
  institution: String,
  passingYear: String,
  marksPercentage: String,
  specialization: String,
}, { _id: false });

const WorkExperienceSchema = new mongoose.Schema({
  employerName: String,
  address: String,
  designation: String,
  joiningDate: Date,
  leavingDate: Date,
  salary: String,
  reasonForLeaving: String,
}, { _id: false });

const FamilyDetailsSchema = new mongoose.Schema({
  name: String,
  age: String,
  occupation: String,
  relation: String,
  otherDetails: String,
}, { _id: false });

const BankDetailsSchema = new mongoose.Schema({
  nameOnBank: String,
  accountNo: String,
  ifsc: String,
  branchAddress: String,
  mobileNo: String,
}, { _id: false });

const LanguageSchema = new mongoose.Schema({
  language: String,
  canRead: Boolean,
  canWrite: Boolean,
  canSpeak: Boolean,
}, { _id: false });

const CriminalRecordSchema = new mongoose.Schema({
  hasCriminalRecord: String,
  details: String,
}, { _id: false });

const HealthSchema = new mongoose.Schema({
  majorIllness: String,
  physicalDefect: String,
}, { _id: false });

const ReferenceSchema = new mongoose.Schema({
  referencedBy: String,
  name: String,
  organization: String,
}, { _id: false });

const EmergencyContactSchema = new mongoose.Schema({
  name: String,
  address: String,
  relation: String,
  mobile: String,
}, { _id: false });

const shiftDetailsSchema = new mongoose.Schema({
  workHoursPerDay: { type: Number, enum: [8, 9, 12], default: 9 },
  weeklyOff: { type: String }, // e.g., Sunday
  type: { type: String, enum: ["Full-time", "Casual"], default: "Full-time" },
}, { _id: false });

const leaveConfigSchema = new mongoose.Schema({
  PH: { type: Number, default: 0 }, // Paid Holiday
  CL: { type: Number, default: 0 }, // Casual Leave
  SL: { type: Number, default: 0 }, // Sick Leave
  EL: { type: Number, default: 0 }, // Earned Leave
  COFF: { type: Number, default: 0 }, // Comp Off
  WPL: { type: Number, default: 0 }, // Without Pay Leave
}, { _id: false });

const userSchema = new mongoose.Schema({
  empId: { type: String, required: true, unique: true },
  profileImage: { type: String, default: "" },
  profileImageUrl: { type: String, default: "" },

  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  pan: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String }, // Main mobile number
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  dob: { type: Date },
  placeOfBirth: { type: String },
  fatherName: { type: String },
  caste: { type: String },
  subCaste: { type: String },
  religion: { type: String },
  uanNo: { type: String },
  aadhaarNo: { type: String },
  bloodGroup: { type: String },
  identificationMark: { type: String },
  nationality: { type: String },
  maritalStatus: { type: String },
  height: { type: String },
  weight: { type: String },
  workingHrs: { type: String },
  presentAddress: { type: String },
  currentAddress: { type: String },
  extracurricular: { type: String },
  hobbies: { type: String },
  referenceBy: { type: String },
  referralName: { type: String },
  referralOrganization: { type: String },
  employeeType: { type: String, default: "fullMonth" },
  employeeCategory: { type: String, enum: ['STAFFS(OFFICE)', 'STAFFS(PLANT)', 'WORKERS (PLANT)'], required: true },
  monthlySalary: { type: Number, min: 0, required: true },
  joiningDate: { type: Date },
  password: { type: String, required: true },

  // New fields for employee management
  department: { type: String, default: "" },
  position: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

  education: [EducationSchema],
  workExperience: [WorkExperienceSchema],
  familyDetails: [FamilyDetailsSchema],
  bankDetails: BankDetailsSchema,
  languages: [LanguageSchema],
  criminalRecord: CriminalRecordSchema,
  health: HealthSchema,
  references: ReferenceSchema,
  emergencyContacts: [EmergencyContactSchema],
  shiftDetails: shiftDetailsSchema,
  leaveConfig: leaveConfigSchema,
  role: { type: String, enum: ["ADMIN", "HR", "EMPLOYEE"], default: "EMPLOYEE" },
}, {
  timestamps: true,
});


export const User = mongoose.model("User", userSchema);

/*
// Migration Script (MongoDB Shell)
// Run this in your MongoDB shell to set default values for department, position, and status for all users:

// Set department and position to empty string, status to 'Active' if not set

db.users.updateMany(
  { department: { $exists: false } },
  { $set: { department: "" } }
)
db.users.updateMany(
  { position: { $exists: false } },
  { $set: { position: "" } }
)
db.users.updateMany(
  { status: { $exists: false } },
  { $set: { status: "Active" } }
)
*/