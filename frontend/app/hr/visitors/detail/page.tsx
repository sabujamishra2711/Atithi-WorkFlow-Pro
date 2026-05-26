"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Calendar, Clock, User, Phone, Building, FileText } from "lucide-react";
import api from "@/lib/apiClient";

interface Visitor {
  _id: string;
  name: string;
  company: string;
  phone: string;
  purpose: string;
  checkIn: string;
  checkOut: string | null;
  host: string;
  status: "checked-in" | "checked-out";
  createdAt: string;
}

function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatTime(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function VisitorDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitorId = searchParams.get('visitorId');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchVisitor() {
      if (!visitorId) {
        setError("No visitor ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/visitors/${visitorId}`);
        setVisitor(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to fetch visitor details");
      } finally {
        setLoading(false);
      }
    }

    fetchVisitor();
  }, [visitorId]);

  const handleCheckOut = async () => {
    if (!visitor) return;
    
    try {
      const res = await api.put(`/visitors/${visitor._id}/checkout`);
      setVisitor(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to check out visitor");
    }
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Loading...</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading visitor details...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error || !visitor) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Visitor Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Visitor Not Found</h2>
            <p className="text-gray-600 mb-4">{error || "The requested visitor does not exist."}</p>
            <Button asChild>
              <Link href="/hr/visitors">Back to Visitors</Link>
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4">
        
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Link href="/hr/visitors" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Visitor Details</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{visitor.name}</h2>
            <p className="text-muted-foreground">Visitor Information</p>
          </div>
          {visitor.status === "checked-in" && (
            <Button onClick={handleCheckOut} className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]">
              Check Out Visitor
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Visitor Information</CardTitle>
            <CardDescription>Details about the visitor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{visitor.name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">{visitor.company}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{visitor.phone}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Purpose</p>
                  <p className="text-sm text-muted-foreground">{visitor.purpose}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Host</p>
                  <p className="text-sm text-muted-foreground">{visitor.host}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Visit Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(visitor.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit Timeline</CardTitle>
            <CardDescription>Check-in and check-out times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Check In</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(visitor.checkIn)} at {formatTime(visitor.checkIn)}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Check Out</p>
                  <p className="text-sm text-muted-foreground">
                    {visitor.checkOut ? `${formatDate(visitor.checkOut)} at ${formatTime(visitor.checkOut)}` : "Not checked out yet"}
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm">
                  <span className="font-medium">Status:</span>{" "}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    visitor.status === "checked-in" 
                      ? "bg-yellow-100 text-yellow-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {visitor.status === "checked-in" ? "Currently Checked In" : "Checked Out"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}