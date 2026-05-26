"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import api from '@/lib/apiClient';

interface Contractor {
  _id: string;
  name: string;
  contractorNo: string;
  phoneNo: string;
  numEmployees: number;
}

export default function ContractorsTable() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get('/contractors');
        const contractorsData = response.data?.data || response.data || [];
        setContractors(Array.isArray(contractorsData) ? contractorsData : []);
      } catch (err: any) {
        console.error("API error:", err);
        const errorMessage = err.response?.data?.error || err.message || "Failed to fetch contractors";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchContractors();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000] mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading contractors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error: {error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-2 bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (contractors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No contractors found.</p>
        <p className="text-sm mt-1">Add your first contractor to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="min-w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contractor No</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone No</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"># Employees</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contractors.map((c) => (
            <tr key={c._id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
              <td className="px-4 py-3 text-sm font-mono">{c.contractorNo}</td>
              <td className="px-4 py-3 text-sm">{c.phoneNo}</td>
              <td className="px-4 py-3 text-sm">{c.numEmployees}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/hr/contractors/edit?contractorId=${c._id}`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/hr/contractors/id-card?contractorId=${c._id}`}>ID Cards</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}