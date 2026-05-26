"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddContractorPage() {
  const [name, setName] = useState("");
  const [contractorNo, setContractorNo] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [numEmployees, setNumEmployees] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await api.post("/contractors", {
        name,
        contractorNo,
        phoneNo,
        numEmployees,
      });
      
      if (res.data) {
        toast({
          title: "Success",
          description: "Contractor added successfully!",
          variant: "default"
        });
        router.push("/hr/contractors");
      } else {
        setError(res.data.error || "Failed to add contractor");
        toast({
          title: "Error",
          description: res.data.error || "Failed to add contractor",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      setError("Network error");
      toast({
        title: "Network Error",
        description: err.response?.data?.error || "Failed to connect to the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Contractor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Add Contractor</h2>
            <p className="text-muted-foreground">Register a new contractor in the system</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Contractor Information</CardTitle>
            <CardDescription>Enter the details for the new contractor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Contractor Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractorNo">Contractor Number(Only first 5 letters)</Label>
                  <Input
                    id="contractorNo"
                    type="text"
                    value={contractorNo}
                    onChange={e => setContractorNo(e.target.value)}
                    required
                    placeholder="e.g., CON001"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNo">Phone Number</Label>
                  <Input
                    id="phoneNo"
                    type="tel"
                    value={phoneNo}
                    onChange={e => setPhoneNo(e.target.value)}
                    required
                    placeholder="e.g., +1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="numEmployees">Number of Employees</Label>
                  <Input
                    id="numEmployees"
                    type="number"
                    min={1}
                    value={numEmployees}
                    onChange={e => setNumEmployees(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Contractor"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/hr/contractors")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}