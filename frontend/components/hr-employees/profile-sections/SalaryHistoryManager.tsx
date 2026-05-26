"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api, { salaryHistoryApi } from "@/lib/apiClient";
import { toast } from "sonner";

interface SalaryHistory {
    _id: string;
    salaryAmount: number;
    startMonth: string;
    endMonth: string | null;
    createdAt: string;
}

interface SalaryHistoryManagerProps {
    employee: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SalaryHistoryManager({ employee, open, onOpenChange }: SalaryHistoryManagerProps) {
    const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        salaryAmount: "",
        startMonth: "",
        endMonth: ""
    });

    // Fetch salary history when employee changes or modal opens
    useEffect(() => {
        if (open && employee) {
            fetchSalaryHistory();
        }
    }, [open, employee]);

    const fetchSalaryHistory = async () => {
        try {
            setLoading(true);
            const response = await salaryHistoryApi.getSalaryHistory(employee.empId);
            setSalaryHistory(response.data.salaryHistory || []);
        } catch (error) {
            console.error("Error fetching salary history:", error);
            toast.error("Failed to fetch salary history");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                salaryAmount: parseFloat(formData.salaryAmount),
                startMonth: formData.startMonth,
                endMonth: formData.endMonth || null
            };

            if (editingId) {
                // Update existing record
                await salaryHistoryApi.updateSalaryHistory(editingId, payload);
                toast.success("Salary history updated successfully");
            } else {
                // Add new record
                await salaryHistoryApi.addSalaryHistory(employee.empId, payload);
                toast.success("Salary history added successfully");
            }

            // Reset form and refresh data
            setFormData({ salaryAmount: "", startMonth: "", endMonth: "" });
            setIsAdding(false);
            setEditingId(null);
            fetchSalaryHistory();
        } catch (error: any) {
            console.error("Error saving salary history:", error);
            toast.error(error.response?.data?.error || "Failed to save salary history");
        }
    };

    const handleEdit = (record: SalaryHistory) => {
        setEditingId(record._id);
        setFormData({
            salaryAmount: record.salaryAmount.toString(),
            startMonth: record.startMonth.split('T')[0],
            endMonth: record.endMonth ? record.endMonth.split('T')[0] : ""
        });
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this salary history record?")) {
            return;
        }

        try {
            await salaryHistoryApi.deleteSalaryHistory(id);
            toast.success("Salary history record deleted successfully");
            fetchSalaryHistory();
        } catch (error) {
            console.error("Error deleting salary history:", error);
            toast.error("Failed to delete salary history record");
        }
    };

    const handleCancel = () => {
        setFormData({ salaryAmount: "", startMonth: "", endMonth: "" });
        setIsAdding(false);
        setEditingId(null);
    };

    const getCurrentSalary = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed

        // Find the active salary history record
        const activeRecord = salaryHistory.find(record => {
            const startDate = new Date(record.startMonth);
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth();

            // Check if start date is before or equal to current date
            if (startYear < currentYear || (startYear === currentYear && startMonth <= currentMonth)) {
                // If end date exists, check if it's after or equal to current date
                if (record.endMonth) {
                    const endDate = new Date(record.endMonth);
                    const endYear = endDate.getFullYear();
                    const endMonth = endDate.getMonth();

                    return endYear > currentYear || (endYear === currentYear && endMonth >= currentMonth);
                }
                // If no end date, it's active
                return true;
            }
            return false;
        });

        return activeRecord ? activeRecord.salaryAmount : employee?.monthlySalary || 0;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Salary History for {employee?.firstName} {employee?.lastName}</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="text-center py-8">Loading salary history...</div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Salary Amount</TableHead>
                                            <TableHead>Start Date</TableHead>
                                            <TableHead>End Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salaryHistory.map((record) => (
                                            <TableRow key={record._id}>
                                                <TableCell>₹{record.salaryAmount.toLocaleString()}</TableCell>
                                                <TableCell>{new Date(record.startMonth).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</TableCell>
                                                <TableCell>
                                                    {record.endMonth
                                                        ? new Date(record.endMonth).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
                                                        : 'Open-ended'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(record)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDelete(record._id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {salaryHistory.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No salary history records found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-4">
                                <Button onClick={() => setIsAdding(true)}>
                                    + Add New Salary History
                                </Button>
                            </div>

                            {(isAdding || editingId) && (
                                <div className="mt-6 p-4 border rounded-lg bg-muted">
                                    <h3 className="text-lg font-medium mb-4">
                                        {editingId ? "Edit Salary History" : "Add New Salary History"}
                                    </h3>

                                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="salaryAmount">Salary Amount</Label>
                                            <Input
                                                id="salaryAmount"
                                                name="salaryAmount"
                                                type="number"
                                                value={formData.salaryAmount}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="startMonth">Start Month</Label>
                                            <Input
                                                id="startMonth"
                                                name="startMonth"
                                                type="month"
                                                value={formData.startMonth}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="endMonth">End Month (Optional)</Label>
                                            <Input
                                                id="endMonth"
                                                name="endMonth"
                                                type="month"
                                                value={formData.endMonth}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="md:col-span-3 flex justify-end gap-2">
                                            <Button type="button" variant="outline" onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                            <Button type="submit">
                                                {editingId ? "Update History" : "Add History"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="mt-8 p-4 border rounded-lg bg-primary/5">
                                <h3 className="text-lg font-medium mb-2">Current Salary (Auto-calculated)</h3>
                                <p className="text-2xl font-bold">₹{getCurrentSalary().toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This is automatically calculated based on the active salary history record
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}