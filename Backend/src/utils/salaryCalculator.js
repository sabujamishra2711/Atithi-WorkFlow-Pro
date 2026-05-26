/**
 * Salary Calculator Utility
 * Implements specific salary calculation rules:
 * 1. Fixed monthly salary for each employee
 * 2. Standard number of working days in a month
 * 3. If absent days ≤ 4: Employee receives full fixed salary
 * 4. If absent days > 4: Salary is calculated based on present days only
 */

/**
 * Calculate final payable salary based on attendance and fixed salary rules
 * @param {Object} params - Salary calculation parameters
 * @param {number} params.fixedMonthlySalary - Employee's fixed monthly salary
 * @param {number} params.standardWorkingDays - Standard working days in the month
 * @param {number} params.presentDays - Actual days employee was present
 * @param {number} params.absentDays - Actual days employee was absent
 * @param {string} params.employeeType - Employee type (e.g., 'fullMonth', 'weeklyOff')
 * @returns {number} Final payable salary
 */
export function calculateFinalSalary({ fixedMonthlySalary, standardWorkingDays, presentDays, absentDays, employeeType }) {
    throw new Error("DO NOT USE – payroll.service.js is source of truth");
}