"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import api, { handleApiResponse } from "@/lib/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditContractorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractorId = searchParams.get('contractorId');
  const [name, setName] = useState("");
  const [contractorNo, setContractorNo] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [numEmployees, setNumEmployees] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchContractor() {
      if (!contractorId) {
        setError("No contractor ID provided");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const res = await api.get(`/contractors/${contractorId}`);
        const data = handleApiResponse(res);
        
        if (data) {
          setName(data.name);
          setContractorNo(data.contractorNo);
          setPhoneNo(data.phoneNo);
          setNumEmployees(data.numEmployees || data.numEmployees === 0 ? data.numEmployees : 1);
        } else {
          setError("Failed to load contractor");
          toast({
            title: "Error",
            description: "Failed to load contractor",
            variant: "destructive"
          });
        }
      } catch (err: any) {
        console.error("Error fetching contractor:", err);
        setError("Network error");
        toast({
          title: "Network Error",
          description: err.response?.data?.error || err.response?.data?.message || err.message || "Failed to connect to the server",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchContractor();
  }, [contractorId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      const res = await api.put(`/contractors/${contractorId}`, {
        name,
        contractorNo,
        phoneNo,
        numEmployees,
      });
      const data = handleApiResponse(res);
      
      if (data) {
        setSuccess("Contractor updated successfully!");
        toast({
          title: "Success",
          description: "Contractor updated successfully!",
          variant: "default"
        });
        setTimeout(() => router.push("/hr/contractors"), 1200);
      } else {
        setError("Failed to update contractor");
        toast({
          title: "Error",
          description: "Failed to update contractor",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Error updating contractor:", err);
      setError("Network error");
      toast({
        title: "Network Error",
        description: err.response?.data?.error || err.response?.data?.message || err.message || "Failed to connect to the server",
        variant: "destructive"
      });
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this contractor? This action cannot be undone.")) return;
    setError("");
    setSuccess("");
    
    try {
      const res = await api.delete(`/contractors/${contractorId}`);
      const data = handleApiResponse(res);
      
      if (data) {
        setSuccess("Contractor deleted successfully!");
        toast({
          title: "Success",
          description: "Contractor deleted successfully!",
          variant: "default"
        });
        setTimeout(() => router.push("/hr/contractors"), 1000);
      } else {
        setError("Failed to delete contractor");
        toast({
          title: "Error",
          description: "Failed to delete contractor",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Error deleting contractor:", err);
      setError("Network error");
      toast({
        title: "Network Error",
        description: err.response?.data?.error || err.response?.data?.message || err.message || "Failed to connect to the server",
        variant: "destructive"
      });
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Contractor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Edit Contractor</h2>
            <p className="text-muted-foreground">Update contractor information</p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading contractor...</p>
          </div>
        ) : error && !success ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-red-600 mb-4">{error}</div>
              <Button variant="outline" onClick={() => router.push("/hr/contractors")}>
                Back to Contractors
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Contractor Information</CardTitle>
              <CardDescription>Update the details for this contractor</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractorNo">Contractor Number</Label>
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
                      value={numEmployees}
                      min={1}
                      onChange={e => setNumEmployees(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                
                {success && <div className="text-green-600">{success}</div>}
                {error && <div className="text-red-600">{error}</div>}
                
                <div className="flex gap-2">
                  <Button type="submit">Update Contractor</Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/hr/contractors")}>
                    Cancel
                  </Button>
                </div>
              </form>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Delete this contractor from the system. This action cannot be undone.
                </p>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Contractor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  );
}