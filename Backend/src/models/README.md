# Salary History and Payroll Snapshot Implementation

## Overview

This implementation adds salary history tracking and payroll snapshot functionality to the HRMS system. The solution is designed to be non-breaking and backward-compatible.

## Models

### SalaryHistory

Tracks salary changes over time for each employee with effective date ranges.

**Fields:**
- `employee`: Reference to User model
- `salary`: Salary amount
- `effectiveFrom`: Date when this salary became effective
- `effectiveTo`: Date when this salary ended (null for current)
- `source`: Source of the salary change ("manual" or "migration")
- `createdAt`: Record creation timestamp
- `updatedAt`: Record update timestamp

### PayrollSnapshot

Stores frozen payroll data to ensure historical payroll calculations remain consistent.

**Fields:**
- `employee`: Reference to User model
- `month`: Month of the payroll (1-12)
- `year`: Year of the payroll
- `salarySnapshot`: Embedded object containing payroll data
  - `monthlySalary`: Monthly salary at time of calculation
  - `presentDays`: Number of present days
  - `lopDays`: Loss of pay days
  - `grossSalary`: Gross salary amount
  - `totalDeductions`: Total deductions
  - `netSalary`: Net salary amount
- `meta`: Metadata about the snapshot
  - `generatedAt`: Timestamp when snapshot was created
  - `generatedBy`: User who generated the snapshot

## Key Features

1. **Salary History Tracking**: Every salary change creates a new SalaryHistory record
2. **Payroll Snapshots**: First-time payroll calculation is saved for future reference
3. **Backward Compatibility**: Existing APIs and UI remain unchanged
4. **Non-Breaking Changes**: All modifications are additive

## Implementation Details

### Salary Updates

When an employee's salary is updated via the `/employees/:empId` endpoint:
1. Previous active SalaryHistory records are closed (effectiveTo set to current date)
2. New SalaryHistory record is created with the updated salary
3. User's monthlySalary field is updated for backward compatibility

### Payroll Calculation

The payroll calculation logic now:
1. Checks for existing PayrollSnapshot before calculating
2. If snapshot exists, returns stored data without recalculation
3. If no snapshot exists, resolves salary using SalaryHistory
4. Creates a snapshot after first-time calculation using `$setOnInsert`

### Migration Script

A one-time migration script (`initializeSalaryHistory.js`) can be run to:
1. Create SalaryHistory records for all existing employees
2. Use existing monthlySalary and joiningDate/createdAt for effective dates
3. Be safely rerun without duplicating records

## Usage

### Running the Migration

```bash
npm run init-salary-history
```

This script is idempotent and can be safely run multiple times.

## Benefits

1. **Audit Trail**: Complete history of salary changes
2. **Historical Accuracy**: Past payroll calculations remain unchanged
3. **Performance**: Subsequent payroll requests for the same period are faster
4. **Data Integrity**: Prevents accidental changes to historical payroll data