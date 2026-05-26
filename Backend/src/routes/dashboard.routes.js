import express from "express";
import { getMonthlyTrend, getHRGraphData, getQuickStats } from "../controllers/dashboard/hr.dashboard.controller.js";

const router = express.Router();

// Dashboard endpoints
router.get("/punch/monthly/trend", getMonthlyTrend);
router.get("/hr/graph-data", getHRGraphData);
router.get("/hr/quick-stats", getQuickStats);

export default router;