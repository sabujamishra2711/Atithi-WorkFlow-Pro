"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api, { handleApiResponse } from "@/lib/apiClient";

interface Visitor {
  _id: string;
  name: string;
  phone?: string;
  purpose?: string;
  timeIn?: string;
  timeOut?: string;
  company?: string;
  hostName?: string;
  code: string;
  date: string;
  photo?: string;
}

export default function VisitorsTable({ initialDate, initialVisitors }: { initialDate: string; initialVisitors: Visitor[] }) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate === initialDate) {
      setVisitors(initialVisitors);
      return;
    }
    setLoading(true);
    api.get(`/visitors?date=${selectedDate}`)
      .then(res => {
        // Use handleApiResponse helper for consistent response handling
        const data = handleApiResponse(res);
        setVisitors(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Error fetching visitors:", err);
        setVisitors([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate, initialDate, initialVisitors]);

  const [deleting, setDeleting] = useState<string | null>(null);

  // Delete visitor record
  const deleteVisitor = async (visitor: Visitor) => {
    if (!confirm(`Are you sure you want to delete the visitor record for ${visitor.name} (${visitor.code})?`)) {
      return;
    }

    setDeleting(visitor._id);
    try {
      const response = await api.delete(`/visitors/${visitor._id}`);
      const data = handleApiResponse(response);
      
      if (data) {
        // Remove the visitor from the local state
        setVisitors(prevVisitors => prevVisitors.filter(v => v._id !== visitor._id));
        
        toast({
          title: "Success",
          description: "Visitor record deleted successfully"
        });
      } else {
        throw new Error('Failed to delete visitor record');
      }
    } catch (error: any) {
      console.error('Error deleting visitor:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete visitor record. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <input
        type="date"
        className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        style={{ minWidth: 150 }}
      />
      <div className="mt-4">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No visitors recorded for this date.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Purpose</th>
                  <th className="px-4 py-2 text-left">Time In</th>
                  <th className="px-4 py-2 text-left">Host</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v._id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-2 font-mono text-primary">{v.code}</td>
                    <td className="px-4 py-2">{v.name}</td>
                    <td className="px-4 py-2">{v.phone || "-"}</td>
                    <td className="px-4 py-2">{v.company || "-"}</td>
                    <td className="px-4 py-2">{v.purpose || "-"}</td>
                    <td className="px-4 py-2">{v.timeIn || "-"}</td>
                    <td className="px-4 py-2">{v.hostName || "-"}</td>
                    <td className="px-4 py-2">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteVisitor(v)}
                        disabled={deleting === v._id}
                      >
                        {deleting === v._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}