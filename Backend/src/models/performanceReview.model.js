import mongoose from "mongoose";

const performanceReviewSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  period: { type: String, required: true }, // e.g., "Q4 2023"
  score: { type: Number, required: true },
  skills: [{ skill: String, score: Number }],
  reviewer: { type: String },
  comments: { type: String },
  date: { type: Date, default: Date.now }
});

export const PerformanceReview = mongoose.model("PerformanceReview", performanceReviewSchema); 