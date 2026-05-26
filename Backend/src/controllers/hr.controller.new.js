import { AttendanceSession } from '../models/attendanceSession.model.js';
import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import { validateDatabaseConnection } from '../utils/productionExportFixes.js';

// Basic HR controller functions
export const getDailyAttendanceSummary = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: "Month is required (YYYY-MM)" });
    }

    console.log('Starting daily attendance summary for month:', month);

    // Validate database connection
    if (!(await validateDatabaseConnection(mongoose))) {
      throw new Error('Database connection failed');
    }

    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    // Get all users (employees)
    const employees = await User.find({});
    
    // Get all leave data
    const leaveData = await Leave.find({});
    
    // Create a map of leave dates by employee ID
    const leaveMap = {};
    leaveData.forEach(leave => {
      if (!leaveMap[leave.empId]) {
        leaveMap[leave.empId] = {};
      }
      
      // Mark all dates between start and end date
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        leaveMap[leave.empId][dateStr] = leave.leaveType;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    // Get all attendance sessions
    const sessions = await AttendanceSession.find({});
    
    // Create a map of sessions by employee ID
    const sessionMap = {};
    sessions.forEach(session => {
      if (!sessionMap[session.empId]) {
        sessionMap[session.empId] = [];
      }
      sessionMap[session.empId].push(session);
    });
    
    const results = [];
    
    for (const emp of employees) {
      const daily = {};
      
      // Get employee sessions
      const empSessions = sessionMap[emp.empId] || [];
      
      // Get leave configuration for this employee
      const leaveConfig = emp.leaveConfig || {};
      const phDates = emp.phDates || [];
      const weeklyOffDay = emp.weeklyOffDay;
      
      // Process each day of the month
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${monthNum.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const dateObj = new Date(year, monthNum - 1, d);
        
        // 1. Check for PH
        if (phDates.includes(dateStr)) {
          daily[d] = { code: 'PH' };
        }
        
        // 2. Check for Leave
        const leaveType = leaveMap[emp.empId]?.[d];
        if (leaveType) {
          daily[d] = { code: leaveType };
        }
        
        // 3. Check for Weekly Off - Only for weeklyOff and weeklyOffWithCoff employee types
        // Full month employees work on all days including Sundays
        const isWeeklyOffEmployee = emp.employeeType === 'weeklyOff' || emp.employeeType === 'weeklyOffWithCoff';
        if (isWeeklyOffEmployee && weeklyOffDay && dateObj.toLocaleString('en-US', { weekday: 'long' }) === weeklyOffDay) {
          daily[d] = { code: 'WO' };
        }
      }
      
      // Define workerType variable
      const workerType = emp.workerType || '8hr_weeklyoff';
      
      results.push({
        empId: emp.empId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        designation: emp.designation,
        fixedSalary: emp.monthlySalary,
        daily,
        leaveConfig: emp.leaveConfig || {},
        shiftDetails: emp.shiftDetails || {},
        workerType,
        otHours: 0 // Placeholder value
      });
    }
    
    res.status(200).json({ data: results });
  } catch (err) {
    console.error("Attendance summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Implement the required endpoints for the dashboard
export const getHRStats = async (req, res) => {
  try {
    // Get total employees
    const totalEmployees = await User.countDocuments({});
    
    // Get present today (employees with sessions today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const presentToday = await AttendanceSession.countDocuments({
      inTime: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Calculate attendance rate (present/total * 100)
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
    
    // Get employees added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const addedThisMonth = await User.countDocuments({
      createdAt: {
        $gte: startOfMonth
      }
    });
    
    // Calculate average salary
    // Only include non-admin employees with valid monthly salary
    const users = await User.find({ 
      role: { $ne: 'ADMIN' },
      monthlySalary: { $exists: true, $ne: null, $gt: 0 }
    }, 'monthlySalary');
    
    let totalSalary = 0;
    let activeUsers = 0;
    
    console.log('Processing salary data for', users.length, 'users');
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, { empId: user.empId, monthlySalary: user.monthlySalary });
      if (user.monthlySalary && user.monthlySalary > 0) {
        totalSalary += user.monthlySalary;
        activeUsers++;
        console.log(`Added to total: ${user.monthlySalary}, Running total: ${totalSalary}, Active users: ${activeUsers}`);
      }
    });
    
    const avgSalary = activeUsers > 0 ? Math.round(totalSalary / activeUsers) : 0;
    
    // Debug logging
    console.log('Final salary calculation:', { 
      totalSalary, 
      activeUsers, 
      avgSalary, 
      userCount: users.length,
      calculation: `${totalSalary} / ${activeUsers} = ${avgSalary}`
    });
    
    const response = {
      totalEmployees,
      addedThisMonth,
      presentToday,
      attendanceRate,
      avgSalary,
      totalSalary, // Add total salary to the response
      pendingRequests: 0, // Placeholder
      absent: totalEmployees - presentToday, // Simple calculation
      onLeave: 0 // Placeholder
    };
    
    console.log('Sending HR stats response:', response);
    res.status(200).json(response);

  } catch (err) {
    console.error("HR Stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    // Get recent attendance sessions
    const recentSessions = await AttendanceSession.find({})
      .sort({ inTime: -1 })
      .limit(10)
      .populate('employeeId', 'firstName lastName empId');
    
    const activities = recentSessions.map(session => ({
      employee: session.employeeId ? `${session.employeeId.firstName} ${session.employeeId.lastName}` : 'Unknown',
      action: session.outTime ? 'Clocked Out' : 'Clocked In',
      time: session.inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: session.outTime ? 'success' : 'pending'
    }));
    
    res.status(200).json({
      activities
    });
  } catch (err) {
    console.error("Recent Activities error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSalaryTrend = async (req, res) => {
  try {
    // Generate mock salary trend data for the last 6 months
    const trend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      
      // Generate a realistic average salary (increasing over time)
      const baseSalary = 25000;
      const growth = i * 500; // 500 rupees increase per month
      const average = baseSalary + growth;
      
      trend.push({
        month,
        average
      });
    }
    
    res.status(200).json({
      trend
    });
  } catch (err) {
    console.error("Salary Trend error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Empty implementations for required routes
export const addPerformanceReview = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

export const getPerformanceReviews = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};