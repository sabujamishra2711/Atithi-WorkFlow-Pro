import mongoose from 'mongoose';

const VisitorSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  code: { type: String, required: true }, // e.g., VISIT001
  name: { type: String, required: true },
  phone: { type: String },
  purpose: { type: String },
  timeIn: { type: String },
  timeOut: { type: String },
  company: { type: String }, // Visitor's company
  hostName: { type: String }, // Host employee name
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photo: { type: String }, // Path to uploaded photo or base64 data
}, { timestamps: true });

const Visitor = mongoose.model('Visitor', VisitorSchema);
export default Visitor; 