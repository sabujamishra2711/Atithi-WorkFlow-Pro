import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const CL_PER_YEAR = 6;
const SL_PER_YEAR = 6;
const CL_PER_MONTH = 1;
const SL_PER_MONTH = 1;
const MAX_CARRY_FORWARD = 36;

class LeaveAllocator {
  constructor(employee, year) {
    this.employee = employee;
    this.year = year;
  }

  async getLeaveRecord(leaveType) {
    let leave = await Leave.findOne({
      empId: this.employee.empId,
      year: this.year,
      leaveType
    });

    if (!leave) {
      leave = new Leave({
        employee: this.employee._id,
        empId: this.employee.empId,
        year: this.year,
        leaveType,
        allocated: 0,
        used: 0,
        balance: 0
      });
    }

    return leave;
  }

  async allocate(attendanceData) {
    throw new Error('Must implement allocate method');
  }
}

class PLAllocator extends LeaveAllocator {
  async allocate(attendanceData) {
    const leave = await this.getLeaveRecord('PL');
    return leave;
  }
}

class CLAllocator extends LeaveAllocator {
  async allocate(attendanceData) {
    const leave = await this.getLeaveRecord('CL');
    const { month } = attendanceData;

    if (month && month >= 1 && month <= 12) {
      if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
        leave.monthlyAllocation = Array(12).fill().map((_, i) => ({
          month: i + 1,
          allocated: 0,
          used: 0,
          balance: 0
        }));
      }

      const monthlyRecord = leave.monthlyAllocation[month - 1];

      if (monthlyRecord.allocated === 0) {
        monthlyRecord.allocated = CL_PER_MONTH;
        monthlyRecord.balance = CL_PER_MONTH;

        leave.allocated = Math.min(CL_PER_YEAR, leave.allocated + CL_PER_MONTH);
        leave.balance = leave.monthlyAllocation.reduce((sum, m) => sum + m.balance, 0);

        await leave.save();
      }
    }

    return leave;
  }
}

class SLAllocator extends LeaveAllocator {
  async allocate(attendanceData) {
    const leave = await this.getLeaveRecord('SL');
    const { month } = attendanceData;

    if (month && month >= 1 && month <= 12) {
      if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
        leave.monthlyAllocation = Array(12).fill().map((_, i) => ({
          month: i + 1,
          allocated: 0,
          used: 0,
          balance: 0
        }));
      }

      const monthlyRecord = leave.monthlyAllocation[month - 1];

      if (monthlyRecord.allocated === 0) {
        monthlyRecord.allocated = SL_PER_MONTH;
        monthlyRecord.balance = SL_PER_MONTH;

        leave.allocated = Math.min(SL_PER_YEAR, leave.allocated + SL_PER_MONTH);
        leave.balance = leave.monthlyAllocation.reduce((sum, m) => sum + m.balance, 0);

        await leave.save();
      }
    }

    return leave;
  }
}

class COFFAllocator extends LeaveAllocator {
  async allocate(attendanceData) {
    const leave = await this.getLeaveRecord('COFF');
    const { sundayWorked, year } = attendanceData;

    if (sundayWorked && this.employee.employeeType === 'weeklyOffWithCoff') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;

      if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
        leave.monthlyAllocation = Array(12).fill().map((_, i) => ({
          month: i + 1,
          allocated: 0,
          used: 0,
          balance: 0
        }));
      }

      const currentMonthIndex = currentMonth - 1;
      if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
        leave.monthlyAllocation[currentMonthIndex].allocated += 1;
        leave.monthlyAllocation[currentMonthIndex].balance += 1;
        leave.allocated += 1;
        leave.balance += 1;

        await leave.save();
      }
    }

    return leave;
  }
}

class LWPAllocator extends LeaveAllocator {
  async allocate(attendanceData) {
    const leave = await this.getLeaveRecord('LWP');
    return leave;
  }
}

class LeaveAllocatorFactory {
  static getAllocator(employee, year, leaveType) {
    switch (leaveType) {
      case 'PL':
        return new PLAllocator(employee, year);
      case 'CL':
        return new CLAllocator(employee, year);
      case 'SL':
        return new SLAllocator(employee, year);
      case 'COFF':
        return new COFFAllocator(employee, year);
      case 'LWP':
        return new LWPAllocator(employee, year);
      default:
        throw new Error(`Unknown leave type: ${leaveType}`);
    }
  }
}

const allocateLeave = asyncHandler(async (employeeId, attendanceData, leaveType) => {
  try {
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const year = attendanceData.year || new Date().getFullYear();
    const allocator = LeaveAllocatorFactory.getAllocator(employee, year, leaveType);
    return await allocator.allocate(attendanceData);
  } catch (error) {
    console.error(`Error allocating ${leaveType} for ${employeeId}:`, error);
    throw error;
  }
});

const allocateMonthlyLeaves = asyncHandler(async (month, year) => {
  try {
    const currentDate = new Date();
    const currentMonth = month || (currentDate.getMonth() + 1);
    const currentYear = year || currentDate.getFullYear();

    console.log(`Allocating monthly leaves for ${currentMonth}/${currentYear}`);

    const employees = await User.find({ role: { $ne: 'ADMIN' }, status: 'Active' });
    const results = {};

    for (const employee of employees) {
      try {
        results[employee.empId] = {};

        results[employee.empId].CL = await allocateLeave(
          employee.empId,
          { month: currentMonth, year: currentYear },
          'CL'
        );

        results[employee.empId].SL = await allocateLeave(
          employee.empId,
          { month: currentMonth, year: currentYear },
          'SL'
        );

        console.log(`Successfully allocated CL/SL for employee ${employee.empId}`);
      } catch (employeeError) {
        console.error(`Error allocating leaves for employee ${employee.empId}:`, employeeError.message);
        results[employee.empId] = { error: employeeError.message };
      }
    }

    return results;
  } catch (error) {
    console.error(`Error allocating monthly leaves for ${month}/${year}:`, error);
    throw error;
  }
});

const processYearEnd = asyncHandler(async (year) => {
  try {
    const employees = await User.find({ role: { $ne: 'ADMIN' }, status: 'Active' });
    const results = {};

    for (const employee of employees) {
      results[employee.empId] = {
        PL: await processPLCarryForward(employee.empId, year),
        CL: await processLeaveExpiration(employee.empId, year, 'CL'),
        SL: await processLeaveExpiration(employee.empId, year, 'SL'),
        LWP: await processLWPCarryForward(employee.empId, year)
      };
    }

    return results;
  } catch (error) {
    console.error(`Error processing year-end for ${year}:`, error);
    throw error;
  }
});

const processPLCarryForward = asyncHandler(async (employeeId, year) => {
  try {
    const leave = await Leave.findOne({
      empId: employeeId,
      year: year - 1,
      leaveType: 'PL'
    });

    if (!leave) {
      return { carriedForward: 0 };
    }

    if (leave.balance > 0) {
      leave.carriedForward += leave.balance;
      leave.balance = 0;

      if (leave.carriedForward > MAX_CARRY_FORWARD) {
        leave.carriedForward = MAX_CARRY_FORWARD;
      }

      await leave.save();
    }

    return { carriedForward: leave.carriedForward };
  } catch (error) {
    console.error(`Error processing PL carry forward for ${employeeId}:`, error);
    throw error;
  }
});

const processLWPCarryForward = asyncHandler(async (employeeId, year) => {
  try {
    const leave = await Leave.findOne({
      empId: employeeId,
      year: year - 1,
      leaveType: 'LWP'
    });

    if (!leave) {
      return { carriedForward: 0 };
    }

    if (leave.balance > 0) {
      leave.carriedForward += leave.balance;
      leave.balance = 0;

      if (leave.carriedForward > MAX_CARRY_FORWARD) {
        leave.carriedForward = MAX_CARRY_FORWARD;
      }

      await leave.save();
    }

    return { carriedForward: leave.carriedForward };
  } catch (error) {
    console.error(`Error processing LWP carry forward for ${employeeId}:`, error);
    throw error;
  }
});

const processLeaveExpiration = asyncHandler(async (employeeId, year, leaveType) => {
  try {
    const leave = await Leave.findOne({
      empId: employeeId,
      year,
      leaveType
    });

    if (!leave) {
      return { expired: 0 };
    }

    const expired = leave.balance;

    if (expired > 0) {
      leave.balance = 0;
      if (leave.monthlyAllocation) {
        leave.monthlyAllocation = leave.monthlyAllocation.map(m => ({ ...m.toObject(), balance: 0 }));
      }
      await leave.save();
    }

    return { expired };
  } catch (error) {
    console.error(`Error processing ${leaveType} expiration for ${employeeId}:`, error);
    throw error;
  }
});

const processCOFFExpiration = asyncHandler(async (employeeId, year, month) => {
  try {
    const leave = await Leave.findOne({
      empId: employeeId,
      year,
      leaveType: 'COFF'
    });

    if (!leave) {
      return { expired: 0 };
    }

    const sixMonthsAgo = new Date(year, month - 1 - 6, 1);
    let expired = 0;

    if (leave.monthlyAllocation && leave.monthlyAllocation.length > 0) {
      for (let i = 0; i < leave.monthlyAllocation.length; i++) {
        const allocationMonth = leave.monthlyAllocation[i].month;
        const allocationYear = allocationMonth > month ? year - 1 : year;

        if (allocationYear < sixMonthsAgo.getFullYear() ||
          (allocationYear === sixMonthsAgo.getFullYear() && allocationMonth < sixMonthsAgo.getMonth() + 1)) {

          if (leave.monthlyAllocation[i].balance > 0) {
            expired += leave.monthlyAllocation[i].balance;
            leave.monthlyAllocation[i].balance = 0;
          }
        }
      }

      if (expired > 0) {
        leave.balance = leave.monthlyAllocation.reduce((sum, m) => sum + m.balance, 0);
        await leave.save();
      }
    }

    return { expired };
  } catch (error) {
    console.error(`Error processing COFF expiration for ${employeeId}:`, error);
    throw error;
  }
});

const triggerLeaveAllocation = async (employeeId, punchDate) => {
  try {
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const date = new Date(punchDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const isSunday = date.getDay() === 0;

    const clAllocation = await allocateLeave(employeeId, { month, year }, 'CL');
    const slAllocation = await allocateLeave(employeeId, { month, year }, 'SL');

    let coffAllocation = null;
    if (employee.employeeType === 'weeklyOffWithCoff' && isSunday) {
      const sundayStart = new Date(date);
      sundayStart.setHours(0, 0, 0, 0);
      const sundayEnd = new Date(date);
      sundayEnd.setHours(23, 59, 59, 999);

      const sundaySession = await AttendanceSession.findOne({
        employeeId: employeeId,
        inTime: { $gte: sundayStart, $lte: sundayEnd }
      });

      if (sundaySession) {
        coffAllocation = await allocateLeave(employeeId, { sundayWorked: true, year }, 'COFF');
      }
    }

    return {
      CL: clAllocation,
      SL: slAllocation,
      COFF: coffAllocation
    };
  } catch (error) {
    console.error(`Error triggering leave allocation for ${employeeId}:`, error);
    throw error;
  }
};

export {
  allocateLeave,
  allocateMonthlyLeaves,
  processYearEnd,
  processPLCarryForward,
  processLWPCarryForward,
  processLeaveExpiration,
  processCOFFExpiration,
  triggerLeaveAllocation
};
