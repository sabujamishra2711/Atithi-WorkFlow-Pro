import mongoose from 'mongoose';

const ContractorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contractorNo: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true },
  numEmployees: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contractorIds: [{ type: String }], // Array of 8-char IDs for punching
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' } // Add status field
}, { timestamps: true });

export default mongoose.model('Contractor', ContractorSchema);