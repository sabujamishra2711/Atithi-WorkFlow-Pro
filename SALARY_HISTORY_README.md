# Salary History Management System

This document describes the implementation of the Salary History Management System for the Atithi WorkFlow Pro application.

## Overview

The Salary History Management System allows HR personnel to manage employee salary changes over time with full historical tracking. This system ensures accurate payroll calculations by maintaining a complete history of salary changes with defined start and end periods.

## Features

1. **Period-Based Salary Tracking**: Salaries are tracked with defined start and end periods
2. **Multiple Salary Histories**: Employees can have multiple salary records over time
3. **Automatic Current Salary Calculation**: The system automatically calculates and updates the current salary based on active salary history
4. **Payroll Integration**: Payroll calculations use historical salary data for accurate compensation
5. **Overlap Prevention**: The system prevents overlapping salary periods
6. **User-Friendly Interface**: Simple UI for managing salary history through the employee profile

## Database Schema

### SalaryHistory Model

```javascript
const salaryHistorySchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    salaryAmount: {
        type: Number,
        required: true,
        min: 0
    },
    startMonth: {
        type: Date,
        required: true
    },
    endMonth: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
```

### Employee Model (Current Salary Field)

```javascript
const userSchema = new mongoose.Schema({
    // ... other fields
    currentSalary: {
        type: Number,
        default: 0
    }
    // ... other fields
});
```

## API Endpoints

### Get Salary History
```
GET /employees/salary-history/:empId
```
Retrieves all salary history records for an employee.

### Add Salary History
```
POST /employees/salary-history/:empId
```
Adds a new salary history record for an employee.

Request Body:
```json
{
    "salaryAmount": 40000,
    "startMonth": "2024-07-01",
    "endMonth": "2024-12-31"
}
```

### Update Salary History
```
PATCH /employees/salary-history/:id
```
Updates an existing salary history record.

### Delete Salary History
```
DELETE /employees/salary-history/:id
```
Deletes a salary history record.

## Business Logic

### Automatic Current Salary Update

When any salary history record is added, updated, or deleted, the system automatically updates the employee's current salary based on the active salary history record.

```javascript
export const updateCurrentSalary = async (employeeId) => {
  const today = new Date();
  today.setDate(1); // Set to first day of current month
  
  const activeHistory = await SalaryHistory.findOne({
    employee: employeeId,
    startMonth: { $lte: today },
    $or: [
      { endMonth: null },
      { endMonth: { $gte: today } }
    ]
  }).sort({ startMonth: -1 });
  
  if (activeHistory) {
    await User.findByIdAndUpdate(employeeId, {
      currentSalary: activeHistory.salaryAmount
    });
  }
};
```

### Payroll Salary Calculation

During payroll generation, the system uses salary history to determine the correct salary for the payroll period.

```javascript
export const getSalaryForPayroll = async (employeeId, year, month) => {
  const payrollDate = new Date(year, month - 1, 1); // First day of the payroll month
  
  const history = await SalaryHistory.findOne({
    employee: employeeId,
    startMonth: { $lte: payrollDate },
    $or: [
      { endMonth: null },
      { endMonth: { $gte: payrollDate } }
    ]
  }).sort({ startMonth: -1 });
  
  return history ? history.salaryAmount : 0;
};
```

## Frontend Components

### Salary History Manager Modal

The Salary History Manager is a modal component that displays all salary history records for an employee and allows HR personnel to add, edit, or delete records.

### Employee Profile Integration

The "Increase Salary" button has been added to the Employment section of the employee profile page, which opens the Salary History Manager modal.

## Migration Scripts

### Initial Migration

The system includes a migration script to populate salary history records for existing employees based on their current salary.

### Cleanup Scripts

Additional scripts are provided to clean up old salary history records and fix any data inconsistencies.

## Usage Instructions

1. Navigate to the employee profile page
2. Click the "Increase Salary" button in the Employment section
3. Use the Salary History Manager modal to:
   - View existing salary history records
   - Add new salary history records
   - Edit existing salary history records
   - Delete salary history records
4. The system will automatically update the employee's current salary
5. During payroll generation, the system will use the appropriate historical salary

## Validation Rules

1. **Start Month Required**: Every salary history record must have a start month
2. **No Overlapping Periods**: The system prevents creation of overlapping salary periods
3. **End Month Optional**: End month can be null for ongoing salary periods
4. **Positive Salary Amount**: Salary amounts must be positive numbers

## Error Handling

The system provides appropriate error messages for:
- Overlapping salary periods
- Invalid date formats
- Missing required fields
- Database errors

## Testing

The system includes comprehensive test scripts to verify:
- Salary history creation and management
- Current salary automatic calculation
- Payroll salary determination
- Data migration and cleanup

## Future Enhancements

1. **Salary Change Notifications**: Email notifications for salary changes
2. **Audit Trail**: Detailed logging of all salary history changes
3. **Bulk Operations**: Ability to update salary history for multiple employees
4. **Reporting**: Salary history reports and analytics