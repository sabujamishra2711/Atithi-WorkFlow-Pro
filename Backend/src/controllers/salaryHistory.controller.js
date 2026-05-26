import { SalaryHistory } from '../models/salaryHistory.model.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';

// Get salary history for an employee
export const getSalaryHistory = async (req, res) => {
    try {
        console.log('=== SALARY HISTORY REQUEST RECEIVED ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Params:', req.params);
        console.log('Query:', req.query);
        console.log('Headers:', req.headers);

        const { empId } = req.params;
        console.log('Employee ID:', empId);

        // Find the user by empId
        const user = await User.findOne({ empId });
        console.log('User lookup result:', user ? 'Found' : 'Not found');

        if (!user) {
            console.log('Employee not found for empId:', empId);
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Find salary history records for this employee
        const salaryHistory = await SalaryHistory.find({ employee: user._id })
            .sort({ effectiveFrom: -1 });

        // Map records for frontend compatibility
        const mappedSalaryHistory = salaryHistory.map(record => ({
            ...record.toObject(),
            salaryAmount: record.salary,
            startMonth: record.effectiveFrom,
            endMonth: record.effectiveTo
        }));

        res.status(200).json({
            salaryHistory: mappedSalaryHistory
        });
    } catch (error) {
        console.error('Error fetching salary history:', error);
        res.status(500).json({ error: 'Failed to fetch salary history' });
    }
};

// Add a new salary history record
export const addSalaryHistory = async (req, res) => {
    try {
        console.log('=== ADD SALARY HISTORY REQUEST RECEIVED ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Params:', req.params);
        console.log('Body:', req.body);

        const { empId } = req.params;
        const { 
            salary, 
            effectiveFrom, 
            effectiveTo,
            salaryAmount,
            startMonth,
            endMonth
        } = req.body;

        // Use frontend names if backend names are missing
        const finalSalary = salary || salaryAmount;
        const finalEffectiveFrom = effectiveFrom || startMonth;
        const finalEffectiveTo = effectiveTo !== undefined ? effectiveTo : endMonth;

        console.log('Employee ID:', empId);
        console.log('Salary data (final):', { finalSalary, finalEffectiveFrom, finalEffectiveTo });

        // Find the user by empId
        const user = await User.findOne({ empId });
        console.log('User lookup result:', user ? 'Found' : 'Not found');

        if (!user) {
            console.log('Employee not found for empId:', empId);
            return res.status(404).json({ error: 'Employee not found' });
        }

        // 🔒 HARD VALIDATION
        if (!finalSalary || isNaN(Number(finalSalary))) {
            return res.status(400).json({ error: 'Valid salary is required' });
        }

        if (!finalEffectiveFrom) {
            return res.status(400).json({ error: 'effectiveFrom date is required' });
        }

        const effectiveFromDate = new Date(finalEffectiveFrom);
        if (Number.isNaN(effectiveFromDate.getTime())) {
            return res.status(400).json({ error: 'Invalid effectiveFrom date' });
        }

        // Validate effectiveTo if provided
        if (finalEffectiveTo) {
            const effectiveToDate = new Date(finalEffectiveTo);
            if (Number.isNaN(effectiveToDate.getTime())) {
                return res.status(400).json({ error: 'Invalid effectiveTo date' });
            }
        }

        // Close any existing active salary history record
        const prevEndDate = new Date(effectiveFromDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);

        await SalaryHistory.updateMany(
            { employee: user._id, effectiveTo: null },
            { $set: { effectiveTo: prevEndDate } }
        );

        // Create new salary history record
        const newSalaryHistory = new SalaryHistory({
            employee: user._id,
            salary: finalSalary,
            effectiveFrom: new Date(finalEffectiveFrom),
            effectiveTo: finalEffectiveTo ? new Date(finalEffectiveTo) : null,
            source: "manual"
        });

        await newSalaryHistory.save();

        // Update the user's current salary based on active salary history
        await updateCurrentSalary(user._id);

        res.status(201).json({
            message: 'Salary history record added successfully',
            salaryHistory: {
                ...newSalaryHistory.toObject(),
                salaryAmount: newSalaryHistory.salary,
                startMonth: newSalaryHistory.effectiveFrom,
                endMonth: newSalaryHistory.effectiveTo
            }
        });
    } catch (error) {
        console.error('Error adding salary history:', error);
        res.status(500).json({ error: 'Failed to add salary history record' });
    }
};

// Update a salary history record
export const updateSalaryHistory = async (req, res) => {
    try {
        console.log('=== UPDATE SALARY HISTORY REQUEST RECEIVED ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Params:', req.params);
        console.log('Body:', req.body);

        const { id } = req.params;
        const { 
            salary, 
            effectiveFrom, 
            effectiveTo,
            salaryAmount,
            startMonth,
            endMonth
        } = req.body;

        // Use frontend names if backend names are missing
        const finalSalary = salary || salaryAmount;
        const finalEffectiveFrom = effectiveFrom || startMonth;
        const finalEffectiveTo = effectiveTo !== undefined ? effectiveTo : endMonth;

        console.log('Salary history ID:', id);
        console.log('Update data (final):', { finalSalary, finalEffectiveFrom, finalEffectiveTo });

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid salary history ID:', id);
            return res.status(400).json({ error: 'Invalid salary history ID' });
        }

        // Find the existing salary history record to get the employee ID
        const existingRecord = await SalaryHistory.findById(id);
        if (!existingRecord) {
            console.log('Salary history record not found for ID:', id);
            return res.status(404).json({ error: 'Salary history record not found' });
        }

        // Validate salary value if provided
        if (finalSalary !== undefined && (typeof finalSalary !== 'number' || finalSalary <= 0)) {
            return res.status(400).json({ error: 'Invalid salary value' });
        }

        // If effectiveFrom is being updated, adjust neighboring records to prevent overlaps
        if (finalEffectiveFrom) {
            const effectiveFromDate = new Date(finalEffectiveFrom);
            if (Number.isNaN(effectiveFromDate.getTime())) {
                return res.status(400).json({ error: 'Invalid effectiveFrom date' });
            }
            const prevEnd = new Date(effectiveFromDate);
            prevEnd.setDate(prevEnd.getDate() - 1);

            await SalaryHistory.updateMany(
                {
                    employee: existingRecord.employee,
                    _id: { $ne: existingRecord._id },
                    effectiveTo: null
                },
                { $set: { effectiveTo: prevEnd } }
            );
        }

        // Validate effectiveTo if provided
        if (finalEffectiveTo) {
            const effectiveToDate = new Date(finalEffectiveTo);
            if (Number.isNaN(effectiveToDate.getTime())) {
                return res.status(400).json({ error: 'Invalid effectiveTo date' });
            }
        }

        // Find and update the salary history record
        const updateData = {};
        if (finalSalary !== undefined) updateData.salary = finalSalary;
        if (finalEffectiveFrom) updateData.effectiveFrom = new Date(finalEffectiveFrom);
        if (finalEffectiveTo !== undefined) updateData.effectiveTo = finalEffectiveTo ? new Date(finalEffectiveTo) : null;

        const updatedSalaryHistory = await SalaryHistory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        console.log('Update result:', updatedSalaryHistory ? 'Success' : 'Not found');

        if (!updatedSalaryHistory) {
            console.log('Salary history record not found for ID:', id);
            return res.status(404).json({ error: 'Salary history record not found' });
        }

        // Update the user's current salary based on active salary history
        await updateCurrentSalary(existingRecord.employee);

        res.status(200).json({
            message: 'Salary history record updated successfully',
            salaryHistory: {
                ...updatedSalaryHistory.toObject(),
                salaryAmount: updatedSalaryHistory.salary,
                startMonth: updatedSalaryHistory.effectiveFrom,
                endMonth: updatedSalaryHistory.effectiveTo
            }
        });
    } catch (error) {
        console.error('Error updating salary history:', error);
        res.status(500).json({ error: 'Failed to update salary history record' });
    }
};

// Delete a salary history record
export const deleteSalaryHistory = async (req, res) => {
    try {
        console.log('=== DELETE SALARY HISTORY REQUEST RECEIVED ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Params:', req.params);

        const { id } = req.params;
        console.log('Salary history ID:', id);

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid salary history ID:', id);
            return res.status(400).json({ error: 'Invalid salary history ID' });
        }

        // Find the existing salary history record to get the employee ID
        const existingRecord = await SalaryHistory.findById(id);
        if (!existingRecord) {
            console.log('Salary history record not found for ID:', id);
            return res.status(404).json({ error: 'Salary history record not found' });
        }

        // Find and delete the salary history record
        const deletedSalaryHistory = await SalaryHistory.findByIdAndDelete(id);
        console.log('Delete result:', deletedSalaryHistory ? 'Success' : 'Not found');

        if (!deletedSalaryHistory) {
            console.log('Salary history record not found for ID:', id);
            return res.status(404).json({ error: 'Salary history record not found' });
        }

        // Update the user's current salary based on active salary history
        await updateCurrentSalary(existingRecord.employee);

        res.status(200).json({
            message: 'Salary history record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting salary history:', error);
        res.status(500).json({ error: 'Failed to delete salary history record' });
    }
};

// Function to update current salary based on active salary history
export const updateCurrentSalary = async (employeeId) => {
    try {
        const today = new Date();
        today.setDate(1); // Set to first day of current month

        const activeHistory = await SalaryHistory.findOne({
            employee: employeeId,
            effectiveFrom: { $lte: today },
            $or: [
                { effectiveTo: null },
                { effectiveTo: { $gte: today } }
            ]
        }).sort({ effectiveFrom: -1 });

        if (activeHistory) {
            await User.findByIdAndUpdate(employeeId, {
                monthlySalary: activeHistory.salary
            });
        }
    } catch (error) {
        console.error('Error updating current salary:', error);
        throw error;
    }
};