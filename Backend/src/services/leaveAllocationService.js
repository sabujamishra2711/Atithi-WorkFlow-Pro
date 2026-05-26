import { User } from '../models/user.model.js';
import { Leave } from '../models/leave.model.js';

class LeaveAllocationService {
  /**
   * Calculate leave entitlements based on employment factors
   */
  static calculateLeaveEntitlements(employee) {
    const { shiftDetails, leaveConfig } = employee;
    const currentDate = new Date();
    const joiningDate = new Date(shiftDetails?.joiningDate || currentDate);
    
    // Calculate years of service
    const yearsOfService = this.calculateYearsOfService(joiningDate, currentDate);
    
    // Base entitlements
    const entitlements = {
      CL: 0,  // Casual Leave
      SL: 0,  // Sick Leave
      EL: 0,  // Earned Leave
      COFF: 0, // Comp Off
      WPL: 0,  // Without Pay Leave
      PL: 0    // Privilege Leave
    };

    // Calculate based on employment type and years of service
    if (shiftDetails?.employmentType === 'Full-Time') {
      entitlements.CL = this.calculateCL(yearsOfService);
      entitlements.SL = this.calculateSL(yearsOfService);
      entitlements.EL = this.calculateEL(yearsOfService);
      entitlements.PL = this.calculatePL(yearsOfService);
      entitlements.COFF = this.calculateCOFF(yearsOfService);
      entitlements.WPL = 30; // Unlimited but capped at 30 for tracking
    } else if (shiftDetails?.employmentType === 'Part-Time') {
      entitlements.CL = Math.floor(this.calculateCL(yearsOfService) * 0.5);
      entitlements.SL = Math.floor(this.calculateSL(yearsOfService) * 0.5);
      entitlements.EL = Math.floor(this.calculateEL(yearsOfService) * 0.5);
      entitlements.PL = Math.floor(this.calculatePL(yearsOfService) * 0.5);
      entitlements.COFF = Math.floor(this.calculateCOFF(yearsOfService) * 0.5);
      entitlements.WPL = 15;
    } else if (shiftDetails?.employmentType === 'Contract') {
      entitlements.CL = Math.floor(this.calculateCL(yearsOfService) * 0.75);
      entitlements.SL = Math.floor(this.calculateSL(yearsOfService) * 0.75);
      entitlements.EL = Math.floor(this.calculateEL(yearsOfService) * 0.75);
      entitlements.PL = Math.floor(this.calculatePL(yearsOfService) * 0.75);
      entitlements.COFF = Math.floor(this.calculateCOFF(yearsOfService) * 0.75);
      entitlements.WPL = 20;
    }

    // Apply probation period restrictions
    if (this.isInProbationPeriod(joiningDate, currentDate)) {
      entitlements.CL = Math.min(entitlements.CL, 3);
      entitlements.SL = Math.min(entitlements.SL, 5);
      entitlements.EL = 0;
      entitlements.PL = 0;
      entitlements.COFF = 0;
    }

    // Apply custom leave config if exists
    if (leaveConfig) {
      Object.keys(leaveConfig).forEach(leaveType => {
        if (leaveConfig[leaveType] !== undefined) {
          entitlements[leaveType] = leaveConfig[leaveType];
        }
      });
    }

    return entitlements;
  }

  /**
   * Calculate years of service
   */
  static calculateYearsOfService(joiningDate, currentDate) {
    const diffTime = Math.abs(currentDate - joiningDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 365);
  }

  /**
   * Check if employee is in probation period (first 6 months)
   */
  static isInProbationPeriod(joiningDate, currentDate) {
    const probationEnd = new Date(joiningDate);
    probationEnd.setMonth(probationEnd.getMonth() + 6);
    return currentDate < probationEnd;
  }

  /**
   * Calculate Casual Leave based on years of service
   */
  static calculateCL(yearsOfService) {
    if (yearsOfService < 1) return 7;
    if (yearsOfService < 3) return 10;
    if (yearsOfService < 5) return 12;
    return 15; // 5+ years
  }

  /**
   * Calculate Sick Leave based on years of service
   */
  static calculateSL(yearsOfService) {
    if (yearsOfService < 1) return 10;
    if (yearsOfService < 3) return 12;
    if (yearsOfService < 5) return 15;
    return 18; // 5+ years
  }

  /**
   * Calculate Earned Leave based on years of service
   */
  static calculateEL(yearsOfService) {
    if (yearsOfService < 1) return 0;
    if (yearsOfService < 3) return 15;
    if (yearsOfService < 5) return 20;
    return 25; // 5+ years
  }

  /**
   * Calculate Privilege Leave based on years of service
   */
  static calculatePL(yearsOfService) {
    if (yearsOfService < 1) return 0;
    if (yearsOfService < 3) return 10;
    if (yearsOfService < 5) return 15;
    return 20; // 5+ years
  }

  /**
   * Calculate Comp Off based on years of service
   */
  static calculateCOFF(yearsOfService) {
    if (yearsOfService < 1) return 5;
    if (yearsOfService < 3) return 7;
    if (yearsOfService < 5) return 10;
    return 12; // 5+ years
  }

  /**
   * Allocate leaves to all employees
   */
  static async allocateLeavesToAllEmployees() {
    try {
      const employees = await User.find({ role: { $ne: 'ADMIN', $eq: 'employee' } });
      const results = [];

      for (const employee of employees) {
        const entitlements = this.calculateLeaveEntitlements(employee);
        
        // Update employee's leave config
        await User.findByIdAndUpdate(employee._id, {
          leaveConfig: entitlements
        });

        results.push({
          employeeId: employee.employeeId,
          name: employee.name,
          entitlements
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Error allocating leaves: ${error.message}`);
    }
  }

  /**
   * Allocate leaves to a specific employee
   */
  static async allocateLeavesToEmployee(employeeId) {
    try {
      const employee = await User.findOne({ employeeId });
      if (!employee) {
        throw new Error('Employee not found');
      }

      const entitlements = this.calculateLeaveEntitlements(employee);
      
      // Update employee's leave config
      await User.findByIdAndUpdate(employee._id, {
        leaveConfig: entitlements
      });

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        entitlements
      };
    } catch (error) {
      throw new Error(`Error allocating leaves to employee: ${error.message}`);
    }
  }

  /**
   * Get current leave balance for an employee
   */
  static async getLeaveBalance(employeeId) {
    try {
      const employee = await User.findOne({ employeeId });
      if (!employee) {
        throw new Error('Employee not found');
      }

      const entitlements = employee.leaveConfig || {};
      const currentYear = new Date().getFullYear();
      
      // Get used leaves for current year
      const usedLeaves = await Leave.aggregate([
        {
          $match: {
            employeeId: employeeId,
            status: { $in: ['approved', 'completed'] },
            $expr: {
              $eq: [{ $year: '$startDate' }, currentYear]
            }
          }
        },
        {
          $group: {
            _id: '$leaveType',
            totalDays: { $sum: '$numberOfDays' }
          }
        }
      ]);

      // Calculate balance
      const balance = { ...entitlements };
      usedLeaves.forEach(used => {
        if (balance[used._id] !== undefined) {
          balance[used._id] = Math.max(0, balance[used._id] - used.totalDays);
        }
      });

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        entitlements,
        usedLeaves: usedLeaves.reduce((acc, curr) => {
          acc[curr._id] = curr.totalDays;
          return acc;
        }, {}),
        balance
      };
    } catch (error) {
      throw new Error(`Error getting leave balance: ${error.message}`);
    }
  }
}

export default LeaveAllocationService; 