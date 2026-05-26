"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Save, Bell, Shield, Users, Building } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/apiClient"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: "WorkFlow Pro",
    timezone: "America/New_York",
    workingHours: "9:00 AM - 5:00 PM",
    emailNotifications: true,
    smsNotifications: false,
    autoApproval: false,
    requireApproval: true,
  })
  const [employees, setEmployees] = useState<any[]>([])
  const [hrRoles, setHrRoles] = useState<string[]>([]) // empIds with HR role
  const [originalHrRoles, setOriginalHrRoles] = useState<string[]>([]) // Original HR roles for comparison
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/employees/getAllEmployees")
      .then(res => {
        setEmployees(res.data.employees || []);
        // Pre-tick HR roles if employee.role === 'HR' or 'ADMIN'
        const currentHrRoles = (res.data.employees || []).filter((e: any) => e.role === 'HR' || e.role === 'ADMIN').map((e: any) => e.empId);
        setHrRoles(currentHrRoles);
        setOriginalHrRoles(currentHrRoles);
      })
      .catch(err => {
        console.error("Error fetching employees:", err);
      });
  }, []);

  const handleHrRoleChange = (empId: string, checked: boolean) => {
    setHrRoles(prev => checked ? [...prev, empId] : prev.filter(id => id !== empId))
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get the access token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      
      // Find employees whose HR role status has changed
      const employeesToUpdate = employees.filter(emp => {
        const wasHr = originalHrRoles.includes(emp.empId);
        const isHr = hrRoles.includes(emp.empId);
        return wasHr !== isHr && emp.role !== 'ADMIN'; // Don't update ADMIN roles
      });

      // Update each employee's role
      const updatePromises = employeesToUpdate.map(async (emp) => {
        const isHr = hrRoles.includes(emp.empId);
        const newRole = isHr ? 'HR' : 'EMPLOYEE';
        
        return api.patch(`/employees/${emp.empId}`, { role: newRole });
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Update original HR roles to current state
      setOriginalHrRoles([...hrRoles]);
      
      toast.success("HR role assignments updated successfully!");
    } catch (error: any) {
      console.error("Error saving HR roles:", error);
      toast.error(`Failed to save HR role assignments: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">HR Settings</h2>
            <p className="text-muted-foreground">Manage your HR system configuration and preferences</p>
          </div>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="permissions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>User Permissions</CardTitle>
                </div>
                <CardDescription>Assign or remove HR role for employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <input
                    className="border px-2 py-1 rounded w-48 mb-2"
                    placeholder="Search by Employee ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {employees.length === 0 ? (
                    <div>Loading employees...</div>
                  ) : (
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2 py-1">Employee</th>
                          <th className="border px-2 py-1">HR Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.filter(emp => emp.empId.toLowerCase().includes(search.toLowerCase())).map(emp => (
                          <tr key={emp.empId}>
                            <td className="border px-2 py-1">{emp.empId} - {emp.firstName} {emp.lastName}</td>
                            <td className="border px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={hrRoles.includes(emp.empId)}
                                onChange={e => handleHrRoleChange(emp.empId, e.target.checked)}
                                disabled={emp.role === 'ADMIN'}
                              />
                              {emp.role === 'ADMIN' && (
                                <span className="ml-2 text-xs text-gray-500">Admin (cannot change)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  )
}