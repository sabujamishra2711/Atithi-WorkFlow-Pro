"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SidebarInset } from '@/components/ui/sidebar';
import api from '@/lib/apiClient';

interface Deduction {
  _id: string;
  employee: {
    empId: string;
    firstName: string;
    lastName: string;
    department?: string;
    position?: string;
  };
  month: number;
  year: number;
  type: string;
  amount: number;
  notes?: string;
}

interface Employee {
  _id: string;
  empId: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
}

interface DeductionType {
  value: string;
  label: string;
}

export default function DeductionsPage() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState(''); // New state for employee search
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [formData, setFormData] = useState({
    employee: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    type: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchEmployees();
    fetchDeductionTypes();
  }, [limit, skip]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/deductions/all`, {
        params: {
          limit: limit,
          skip: skip
        }
      });
      // Handle ApiResponse wrapper
      const data = response.data.data || response.data;
      setDeductions(data.deductions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/getAllEmployees');
      // Handle ApiResponse wrapper
      const data = response.data.data || response.data;
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDeductionTypes = async () => {
    try {
      const response = await api.get('/deductions/types');
      // Handle ApiResponse wrapper
      const data = response.data.data || response.data;
      const typesData = data.types || [];
      setDeductionTypes(typesData);
      console.log('Fetched deduction types:', typesData);
    } catch (error) {
      console.error('Error fetching deduction types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee || !formData.type || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        employee: formData.employee,
        month: Number(formData.month),
        year: Number(formData.year),
        type: formData.type,
        amount: Number(formData.amount),
        notes: formData.notes
      };

      if (editingDeduction) {
        await api.patch(`/deductions/${editingDeduction._id}`, payload);
      } else {
        await api.post('/deductions', payload);
      }

      setShowForm(false);
      setEditingDeduction(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving deduction:', error);
      alert(`Error: ${error.response?.data?.error || 'Error saving deduction'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deduction?')) return;

    try {
      await api.delete(`/deductions/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting deduction:', error);
      alert('Error deleting deduction');
    }
  };

  const handleEdit = (deduction: Deduction) => {
    const employee = employees.find(emp => emp.empId === deduction.employee.empId);
    setEditingDeduction(deduction);
    setFormData({
      employee: employee?._id || '',
      month: deduction.month,
      year: deduction.year,
      type: deduction.type,
      amount: deduction.amount.toString(),
      notes: deduction.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      employee: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      type: '',
      amount: '',
      notes: ''
    });
    setEmployeeSearch(''); // Reset employee search when form is closed
  };

  const filtered = search.length < 2 ? deductions : deductions.filter(d => {
    const emp = d.employee;
    const q = search.toLowerCase();
    return (
      emp.empId.toLowerCase().includes(q) ||
      (emp.firstName + ' ' + (emp.lastName || '')).toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-lg font-semibold tracking-tight">Deduction Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Deductions</h2>
            <p className="text-muted-foreground">Manage and track all employee deductions</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Deduction
          </Button>
        </div>
        <Card className="mb-6">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by employee, type, or notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-80"
              />
              <span className="text-muted-foreground">Total: {total}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9}>Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9}>No deductions found.</TableCell></TableRow>
                  ) : filtered.map(d => (
                    <TableRow key={d._id}>
                      <TableCell>{d.employee.empId} - {d.employee.firstName} {d.employee.lastName}</TableCell>
                      <TableCell>{d.employee.department || '-'}</TableCell>
                      <TableCell>{d.employee.position || '-'}</TableCell>
                      <TableCell>{d.month.toString().padStart(2, '0')}</TableCell>
                      <TableCell>{d.year}</TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{d.amount.toFixed(2)}</TableCell>
                      <TableCell>{d.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(d)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(d._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setSkip(Math.max(0, skip - limit))}
            disabled={skip === 0}
          >Prev</Button>
          <span>Page {Math.floor(skip / limit) + 1} / {Math.ceil(total / limit) || 1}</span>
          <Button
            variant="outline"
            onClick={() => setSkip(skip + limit)}
            disabled={skip + limit >= total}
          >Next</Button>
        </div>
        {/* Deduction Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md p-0">
              <CardHeader>
                <CardTitle>{editingDeduction ? 'Edit Deduction' : 'Add New Deduction'}</CardTitle>
                <CardDescription>Fill in the details below to {editingDeduction ? 'update' : 'add'} a deduction</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Employee *</label>
                    <div className="relative">
                      <Select value={formData.employee} onValueChange={(value) => setFormData({ ...formData, employee: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2 sticky top-0 bg-white z-10">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by ID, name, designation, department..."
                                value={employeeSearch}
                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {employees
                              .filter(emp => {
                                const fullName = `${emp.firstName} ${emp.lastName || ''}`.toLowerCase();
                                const searchLower = employeeSearch.toLowerCase();
                                return (
                                  emp.empId.toLowerCase().includes(searchLower) ||
                                  fullName.includes(searchLower) ||
                                  (emp.position && emp.position.toLowerCase().includes(searchLower)) ||
                                  (emp.department && emp.department.toLowerCase().includes(searchLower))
                                );
                              })
                              .map(emp => (
                                <SelectItem key={emp._id} value={emp._id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{emp.empId} - {emp.firstName} {emp.lastName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {emp.position || 'N/A'} • {emp.department || 'N/A'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Month *</label>
                      <Select value={formData.month.toString()} onValueChange={(value) => setFormData({ ...formData, month: Number(value) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year *</label>
                      <Input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                        min="2020"
                        max="2030"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deduction Type *</label>

                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deduction type" />
                      </SelectTrigger>
                      <SelectContent>
                        {deductionTypes && deductionTypes.length > 0 ? (
                          deductionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            No deduction types available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {editingDeduction ? 'Update' : 'Add'} Deduction
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingDeduction(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}