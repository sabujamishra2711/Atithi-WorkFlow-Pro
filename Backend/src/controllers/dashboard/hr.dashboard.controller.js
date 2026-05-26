import { User } from '../../models/user.model.js';
import { AttendanceSession } from '../../models/attendanceSession.model.js';
import { Leave } from '../../models/leave.model.js';

// Get monthly attendance trend data
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

// Get HR graph data for department distribution
export const getHRGraphData = async (req, res) => {
  try {
    // Get department distribution data
    const users = await User.find({}, 'department');
    
    const departmentMap = {};
    users.forEach(user => {
      const dept = user.department || 'Unknown';
      if (!departmentMap[dept]) {
        departmentMap[dept] = 0;
      }
      departmentMap[dept]++;
    });
    
    const departmentData = Object.entries(departmentMap).map(([name, employees]) => ({
      name,
      employees,
      fill: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
    }));
    
    res.status(200).json({
      departmentData
    });
  } catch (err) {
    console.error("HR Graph Data error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get quick statistics for HR dashboard
export const getQuickStats = async (req, res) => {
  try {
    // Get the current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Get total employees
    const totalEmployees = await User.countDocuments({});
    
    // Get attendance data for the current month with overtime calculation
    const attendanceData = await AttendanceSession.aggregate([
      {
        $match: {
          inTime: { $gte: startOfMonth, $lte: endOfMonth },
          status: 'CLOSED',
          outTime: { $ne: null }
        }
      },
      {
        $project: {
          employeeId: 1,
          inTime: 1,
          outTime: 1,
          // Calculate work duration in minutes
          workDurationMinutes: {
            $divide: [
              { $subtract: ["$outTime", "$inTime"] },
              60000 // Convert milliseconds to minutes
            ]
          },
          // Calculate if the employee was on time (before 9:30 AM)
          isOnTime: {
            $cond: {
              if: {
                $lt: [
                  { $dateToString: { format: "%H:%M", date: "$inTime" } },
                  "09:30"
                ]
              },
              then: 1,
              else: 0
            }
          },
          // Calculate if the employee was late (after 9:30 AM)
          isLate: {
            $cond: {
              if: {
                $gte: [
                  { $dateToString: { format: "%H:%M", date: "$inTime" } },
                  "09:30"
                ]
              },
              then: 1,
              else: 0
            }
          }
        }
      },
      {
        $project: {
          employeeId: 1,
          workDurationMinutes: 1,
          isOnTime: 1,
          isLate: 1,
          // Calculate overtime in hours (work beyond 8 hours = 480 minutes)
          overtimeHours: {
            $cond: {
              if: { $gt: ["$workDurationMinutes", 480] },
              then: {
                $divide: [
                  { $subtract: ["$workDurationMinutes", 480] },
                  60 // Convert minutes to hours
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: "$employeeId",
          totalSessions: { $sum: 1 },
          onTimeCount: { $sum: "$isOnTime" },
          lateCount: { $sum: "$isLate" },
          totalOvertimeHours: { $sum: "$overtimeHours" }
        }
      },
      {
        $group: {
          _id: null,
          uniqueEmployees: { $addToSet: "$_id" },
          totalOnTime: { $sum: "$onTimeCount" },
          totalLate: { $sum: "$lateCount" },
          totalOvertimeHours: { $sum: "$totalOvertimeHours" }
        }
      }
    ]);
    
    // Calculate absent employees (employees who have no attendance records this month)
    const employeesWithAttendance = attendanceData.length > 0 ? attendanceData[0].uniqueEmployees : [];
    const absentCount = totalEmployees - employeesWithAttendance.length;
    
    // Calculate "IN Only" punch counts (employees who have punched in but not out)
    const inOnlyCount = await AttendanceSession.countDocuments({
      punchStatus: 'In Only',
      inTime: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    // For now, using placeholder data for onLeave since we don't have real-time tracking
    // In a real implementation, you would query active leave records
    const onLeaveCount = 0; // Placeholder
    
    // Get the total overtime hours, rounded to 1 decimal place
    const totalOvertimeHours = attendanceData.length > 0 
      ? Math.round(attendanceData[0].totalOvertimeHours * 10) / 10 
      : 0;
    
    res.status(200).json({
      onTimeArrivals: attendanceData.length > 0 ? attendanceData[0].totalOnTime : 0,
      lateArrivals: attendanceData.length > 0 ? attendanceData[0].totalLate : 0,
      absent: absentCount,
      onLeave: onLeaveCount,
      overtimeHours: totalOvertimeHours,
      pendingApprovals: inOnlyCount // Changed to show "IN Only" punch counts
    });
  } catch (err) {
    console.error("Quick Stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
};