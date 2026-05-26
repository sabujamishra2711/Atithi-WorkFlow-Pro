"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VisitorsTable from "./VisitorsTable";
import Link from "next/link";
import { Users, Plus, Calendar, TrendingUp, Clock, Building2 } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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

export default function VisitorManagementPage({ searchParams }: { searchParams: { date?: string } }) {
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = searchParams.date || today;
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    activeVisitors: 0,
    completedVisits: 0,
    companies: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/visitors?date=${selectedDate}`);
        const data = handleApiResponse(response);
        
        if (Array.isArray(data)) {
          setVisitors(data);
          
          // Calculate stats
          const totalVisitors = data.length;
          const activeVisitors = data.filter(v => v.timeIn && !v.timeOut).length;
          const completedVisits = data.filter(v => v.timeIn && v.timeOut).length;
          const companies = [...new Set(data.filter(v => v.company).map(v => v.company))].length;
          
          setStats({
            totalVisitors,
            activeVisitors,
            completedVisits,
            companies
          });
        } else {
          setVisitors([]);
          setStats({
            totalVisitors: 0,
            activeVisitors: 0,
            completedVisits: 0,
            companies: 0
          });
        }
      } catch (err: any) {
        console.error('Error fetching visitors:', err);
        setError(err.message || 'Failed to fetch visitors');
        setVisitors([]);
        setStats({
          totalVisitors: 0,
          activeVisitors: 0,
          completedVisits: 0,
          companies: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVisitors();
  }, [selectedDate]);

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Visitor Management</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">Visitor Management</h1>
              <p className="text-muted-foreground">Manage and track all visitor activities</p>
            </div>
          </div>
          <div className="text-center py-8">Loading visitor data...</div>
        </div>
      </SidebarInset>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Visitor Management</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">Visitor Management</h1>
              <p className="text-muted-foreground">Manage and track all visitor activities</p>
            </div>
            <div className="flex gap-3">
              <Link href="/visitor/pass">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Pass
                </Button>
              </Link>
              <Link href="/visitor">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Public View
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Visitor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Visitor Management</h1>
            <p className="text-muted-foreground">Manage and track all visitor activities</p>
          </div>
          <div className="flex gap-3">
            <Link href="/visitor/pass">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Pass
              </Button>
            </Link>
            <Link href="/visitor">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Public View
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Visitors</p>
                  <p className="text-3xl font-bold">{stats.totalVisitors}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Visitors</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeVisitors}</p>
                </div>
                <div className="p-3 bg-green-600/10 rounded-full">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-green-600/10 text-green-600">
                  Currently In
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Visits</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.completedVisits}</p>
                </div>
                <div className="p-3 bg-purple-600/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-purple-600/10 text-purple-600">
                  Checked Out
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Companies</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.companies}</p>
                </div>
                <div className="p-3 bg-orange-600/10 rounded-full">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-orange-600/10 text-orange-600">
                  Unique
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitor Records Table */}
        <Card>
          <CardHeader className="bg-muted">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Visitor Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <VisitorsTable initialDate={selectedDate} initialVisitors={visitors} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/visitor/pass">
                <div className="p-4 bg-muted rounded-lg border border-dashed hover:bg-accent transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Generate Visitor Pass</h3>
                      <p className="text-sm text-muted-foreground">Create new visitor pass with photo</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <Link href={`/hr/visitors?date=${new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]}`}>
                <div className="p-4 bg-muted rounded-lg border border-dashed hover:bg-accent transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Yesterday's Records</h3>
                      <p className="text-sm text-muted-foreground">View previous day visitors</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <div className="p-4 bg-muted rounded-lg border border-dashed hover:bg-accent transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Export Report</h3>
                    <p className="text-sm text-muted-foreground">Download visitor data</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}