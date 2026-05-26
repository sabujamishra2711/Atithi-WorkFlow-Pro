import { AttendanceSession } from "../../models/attendanceSession.model.js";
import { User } from "../../models/user.model.js";

// Get monthly attendance summary
export const getMonthlySummary = async (req, res) => {
  try {
    const { month, department } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: "Month parameter is required" });
    }
    
    // Parse month parameter (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    
    // Build match conditions
    const matchConditions = {
      inTime: { $gte: startDate, $lte: endDate }
      // Removed status filter to include both OPEN and CLOSED sessions
    };
    
    // If department filter is provided, we'll filter after aggregation
    let departmentFilter = null;
    if (department && department !== 'All') {
      departmentFilter = department;
    }
    
    // Get attendance summary data
    const summaryData = await AttendanceSession.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: 'empId',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employeeId',
          employee: { $first: '$employee' },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          partialSessions: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
          totalHours: { 
            $sum: {
              $divide: [
                { $subtract: ['$outTime', '$inTime'] },
                1000 * 60 * 60 // Convert milliseconds to hours
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalPresent: { $sum: '$presentDays' },
          totalPartial: { $sum: '$partialSessions' },
          totalHours: { $sum: '$totalHours' },
          employees: { $push: '$$ROOT' }
        }
      }
    ]);
    
    // Filter by department if needed
    let filteredEmployees = summaryData.length > 0 ? summaryData[0].employees : [];
    if (departmentFilter) {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.employee.department === departmentFilter
      );
    }
    
    // Calculate summary statistics
    const totalEmployees = filteredEmployees.length;
    let totalPresent = 0;
    let totalHours = 0;
    let onTimeCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let partialCount = 0;
    
    filteredEmployees.forEach(emp => {
      totalPresent += emp.presentDays;
      totalHours += emp.totalHours;
      partialCount += emp.partialSessions;
      
      // For now, we'll consider all present days as "on time"
      // In a real implementation, you might have more sophisticated logic
      onTimeCount += emp.presentDays;
    });
    
    // Estimate absent days (assuming 26 working days per month)
    const workingDaysInMonth = 26;
    absentCount = Math.max(0, totalEmployees * workingDaysInMonth - totalPresent);
    
    // Calculate average attendance rate
    const avgAttendance = totalEmployees > 0 ? 
      Math.round((totalPresent / (totalEmployees * workingDaysInMonth)) * 100) : 0;
    
    // Fix: Calculate correct percentages based on total working days rather than employees
    // This prevents percentages from exceeding 100% when summing present/absent/leave
    const totalWorkingDays = totalEmployees * workingDaysInMonth;
    const presentPercentage = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;
    const absentPercentage = totalWorkingDays > 0 ? Math.round((absentCount / totalWorkingDays) * 100) : 0;
    const leavePercentage = totalWorkingDays > 0 ? Math.round((onLeaveCount / totalWorkingDays) * 100) : 0;
    
    res.status(200).json({
      totalEmployees,
      onTime: onTimeCount,
      onLeave: onLeaveCount,
      totalAbsences: absentCount,
      partial: partialCount,
      avgAttendance,
      totalHours: Math.round(totalHours * 100) / 100,
      // Add the corrected percentages to the response
      presentPercentage,
      absentPercentage,
      leavePercentage
    });
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get monthly attendance trend for the last 6 months
export const getMonthlyTrend = async (req, res) => {
  try {
    // Calculate the date range for the last 6 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5); // 6 months including current month
    
    // Set to beginning of the start month
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    // Set to end of current month
    endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
    endDate.setHours(23, 59, 59, 999);
    
    // Use MongoDB aggregation to calculate monthly attendance trends
    const trendData = await AttendanceSession.aggregate([
      {
        $match: {
          inTime: { $gte: startDate, $lte: endDate },
          status: 'CLOSED' // Only consider closed sessions
        }
      },
      {
        $project: {
          employeeId: 1,
          inTime: 1,
          outTime: 1,
          monthYear: {
            $dateToString: {
              format: "%Y-%m",
              date: "$inTime"
            }
          },
          monthName: {
            $let: {
              vars: {
                months: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
              },
              in: {
                $concat: [
                  { $arrayElemAt: ["$$months", { $month: "$inTime" }] },
                  " ",
                  { $toString: { $year: "$inTime" } }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            monthYear: "$monthYear",
            monthName: "$monthName"
          },
          presentDays: { $sum: 1 } // Count sessions as present days
        }
      },
      {
        $group: {
          _id: {
            monthYear: "$_id.monthYear",
            monthName: "$_id.monthName"
          },
          employees: { $push: { employeeId: "$_id.employeeId", presentDays: "$presentDays" } },
          totalPresent: { $sum: "$presentDays" },
          uniqueEmployees: { $addToSet: "$_id.employeeId" }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.monthName",
          present: "$totalPresent",
          // Estimate absent days (assuming 22 working days per employee per month)
          absent: {
            $multiply: [
              { $size: "$uniqueEmployees" },
              22
            ]
          },
          total: {
            $add: [
              "$totalPresent",
              {
                $multiply: [
                  { $size: "$uniqueEmployees" },
                  22
                ]
              }
            ]
          }
        }
      },
      {
        $sort: {
          month: 1
        }
      }
    ]);
    
    // Format the data to ensure we have all 6 months, even if no data exists
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedTrendData = [];
    
    // Generate the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      // Check if we have data for this month
      const monthData = trendData.find(data => data.month === monthName);
      
      if (monthData) {
        formattedTrendData.push(monthData);
      } else {
        // If no data, add empty month
        formattedTrendData.push({
          month: monthName,
          present: 0,
          absent: 0,
          total: 0
        });
      }
    }
    
    // Return data in the format expected by the frontend
    res.status(200).json({ trend: formattedTrendData });
  } catch (err) {
    console.error("Error fetching monthly trend:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get employee monthly attendance data
export const getEmployeeMonthlyAttendance = async (req, res) => {
  try {
    const { month, department } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: "Month parameter is required" });
    }
    
    // Parse month parameter (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    
    // Build match conditions for sessions
    const sessionMatchConditions = {
      inTime: { $gte: startDate, $lte: endDate }
      // Removed status filter to include both OPEN and CLOSED sessions
    };
    
    // Get all active employees
    const allEmployees = await User.find({ status: 'Active' });
    
    // Get attendance data for the month
    const attendanceData = await AttendanceSession.aggregate([
      { $match: sessionMatchConditions },
      {
        $group: {
          _id: '$employeeId',
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          partialSessions: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
          totalHours: { 
            $sum: {
              $cond: [
                { $eq: ['$status', 'CLOSED'] },
                {
                  $divide: [
                    { $subtract: ['$outTime', '$inTime'] },
                    1000 * 60 * 60 // Convert milliseconds to hours
                  ]
                },
                0
              ]
            }
          },
          firstPunch: { $min: '$inTime' },
          lastPunch: { $max: '$outTime' }
        }
      }
    ]);
    
    // Create a map for quick lookup of attendance data
    const attendanceMap = {};
    attendanceData.forEach(att => {
      attendanceMap[att._id] = att;
    });
    
    // Combine all employees with their attendance data
    const employeeData = allEmployees.map(employee => {
      const attendance = attendanceMap[employee.empId] || {
        presentDays: 0,
        partialSessions: 0,
        totalHours: 0
      };
      
      return {
        empId: employee.empId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department || '',
        present: attendance.presentDays,
        partial: attendance.partialSessions,
        absent: Math.max(0, 26 - attendance.presentDays), // Assuming 26 working days
        totalDays: 26,
        attendanceRate: parseFloat(((attendance.presentDays / 26) * 100).toFixed(2)) || 0,
        totalHours: Math.round(attendance.totalHours * 100) / 100,
        trend: 'up' // Simplified trend calculation
      };
    });
    
    // Filter by department if needed
    let filteredEmployees = employeeData;
    if (department && department !== 'All') {
      filteredEmployees = employeeData.filter(emp => emp.department === department);
    }
    
    res.status(200).json({ employees: filteredEmployees });
  } catch (err) {
    console.error("Error fetching employee monthly attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get available months for attendance data
export const getAttendanceMonths = async (req, res) => {
  console.log("[getAttendanceMonths] Route hit");
  try {
    // Aggregate all unique months from AttendanceSession timestamps
    const months = await AttendanceSession.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$inTime" } },
        },
      },
      { $sort: { "_id": -1 } },
    ]);
    
    // Format for dropdown: { month: 'YYYY-MM', label: 'MonthName YYYY' }
    const result = months.map(m => {
      const [year, month] = m._id.split("-");
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
      const label = date.toLocaleString("default", { month: "long" }) + " " + year;
      return { month: m._id, label };
    });
    
    res.status(200).json({ months: result });
  } catch (err) {
    console.error("[getAttendanceMonths]", err);
    res.status(500).json({ error: "Failed to get attendance months" });
  }
};