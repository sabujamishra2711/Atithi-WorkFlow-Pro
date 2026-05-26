"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import proxyApi from '@/lib/proxyApiClient';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface LeaveDashboard {
  stats: Array<{
    _id: string;
    totalAllocated: number;
    totalUsed: number;
    totalBalance: number;
    totalCarriedForward: number;
  }>;
  pendingApplications: number;
  currentYear: number;
}

interface LeaveApplication {
  _id: string;
  empId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedAt: string;
}

interface PendingDetail {
  name?: string;
  firstName?: string;
  lastName?: string;
  empId: string;
  mismatchedLeaves: string[];
}

export default function LeaveDashboardPage() {
  const [dashboardData, setDashboardData] = useState<LeaveDashboard | null>(null);
  const [pendingApplications, setPendingApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [allocating, setAllocating] = useState(false);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [pendingDetails, setPendingDetails] = useState<PendingDetail[]>([]);
  const [pendingDetailsLoading, setPendingDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'allocations'>('dashboard');

  // Check authentication and role on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const role = localStorage.getItem('role');
      
      // Check if user has required role
      if (role && (role !== 'HR' && role !== 'ADMIN')) {
        setError('Access denied. Only HR and Admin users can access this page.');
        setLoading(false);
        return;
      }
      
      // If no token, redirect to login
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
    }
  }, []);

  // Load dashboard data only
  useEffect(() => {
    // Skip if we already have an error or are not authenticated
    if (error || typeof window === 'undefined') return;
    
    // Check if we have a valid token
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('role');
    if (!token || (role !== 'HR' && role !== 'ADMIN')) {
      return;
    }
    
    // Load only essential dashboard data initially
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await fetchDashboardData();
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [error]);

  // Load other data when tabs are activated
  useEffect(() => {
    if (activeTab === 'applications' && pendingApplications.length === 0) {
      fetchPendingApplications();
    }
    
    if (activeTab === 'allocations' && pendingAllocations.length === 0) {
      checkPendingAllocations();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await proxyApi.get('/api/v1/leave/dashboard');
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (error: any) {
      // More specific error handling
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view this data.');
      }
      throw error;
    }
  };

  const fetchPendingApplications = async () => {
    try {
      const response = await proxyApi.get('/api/v1/leave/applications');
      
      if (response.data.success) {
        setPendingApplications(response.data.applications || []);
      } else {
        throw new Error('Failed to load pending applications');
      }
    } catch (error: any) {
      console.error('Error fetching pending applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending applications.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const checkPendingAllocations = async () => {
    try {
      const response = await proxyApi.get('/api/v1/leave/pending-allocations');
      
      const data = response.data;
      if (data.success && data.pending && data.pending.length > 0) {
        setPendingAllocations(data.pending);
      } else {
        setPendingAllocations([]);
      }
    } catch (error: any) {
      console.error('Error checking pending allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to check pending allocations.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const fetchPendingDetails = async () => {
    setPendingDetailsLoading(true);
    try {
      const response = await proxyApi.get('/api/v1/leave/pending-allocations?details=1');
      const data = response.data;
      if (data.success && data.pendingDetails) {
        setPendingDetails(data.pendingDetails);
      }
    } catch (error) {
      console.error('Error fetching pending allocation details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending allocation details.',
        variant: 'destructive'
      });
    } finally {
      setPendingDetailsLoading(false);
    }
  };

  const handleAllocatePending = async () => {
    setAllocating(true);
    try {
      const response = await proxyApi.post('/api/v1/leave/allocate/pending');
      const data = response.data;
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Pending leave allocations completed successfully.',
          variant: 'default'
        });
        // Refresh the data
        await checkPendingAllocations();
        await fetchDashboardData();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to allocate pending leaves.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to allocate pending leaves.',
        variant: 'destructive'
      });
    } finally {
      setAllocating(false);
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'PL': return 'bg-blue-100 text-blue-800';
      case 'CL': return 'bg-green-100 text-green-800';
      case 'SL': return 'bg-orange-100 text-orange-800';
      case 'LWP': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading skeleton component
  if (loading) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-gray-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading leave dashboard...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                // Trigger data reload
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => {
                // Clear local storage and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('role');
                localStorage.removeItem('empId');
                window.location.href = '/login';
              }}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      {/* Modern HR Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Leave Management Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview and quick actions for leave management</p>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        {/* Pending Allocations Banner */}
        {pendingAllocations.length > 0 && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 flex items-center justify-between mb-4">
            <div>
              <span className="font-semibold text-yellow-800">{pendingAllocations.length} employee(s) have pending leave allocations.</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAllocatePending} disabled={allocating} className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-2">
                {allocating && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>}
                {allocating ? 'Allocating...' : 'Allocate Now'}
              </Button>
              <Button onClick={fetchPendingDetails} variant="outline" className="flex items-center gap-2">
                {pendingDetailsLoading && <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></span>}
                View Details
              </Button>
            </div>
          </div>
        )}
        {/* Pending Details Modal/Section */}
        {showPendingDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
              <h2 className="text-xl font-bold mb-4">Pending Allocations Details</h2>
              <Button onClick={() => setShowPendingDetails(false)} className="absolute top-4 right-4">Close</Button>
              {pendingDetailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <span className="animate-spin h-8 w-8 border-4 border-gray-400 border-t-transparent rounded-full"></span>
                </div>
              ) : pendingDetails.length === 0 ? (
                <p>No pending details found.</p>
              ) : (
                <table className="w-full text-sm border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Employee</th>
                      <th className="border px-2 py-1">Emp ID</th>
                      <th className="border px-2 py-1">Mismatched Leaves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDetails.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1">{item.name || item.firstName + ' ' + item.lastName}</td>
                        <td className="border px-2 py-1">{item.empId}</td>
                        <td className="border px-2 py-1">{item.mismatchedLeaves?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'applications' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'allocations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('allocations')}
          >
            Allocations
          </button>
        </div>
        {/* Main content based on active tab */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-md rounded-xl border bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.stats.reduce((sum, stat) => sum + stat.totalAllocated, 0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all leave types
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md rounded-xl border bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Used</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.stats.reduce((sum, stat) => sum + stat.totalUsed, 0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave days consumed
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md rounded-xl border bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.stats.reduce((sum, stat) => sum + stat.totalBalance, 0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remaining leave days
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md rounded-xl border bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pendingApplications.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This year
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Modern Quick Actions */}
              <Card className="shadow-md rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Button 
                      className="h-24 flex flex-col items-center justify-center bg-white hover:bg-blue-100 border border-blue-200 shadow-sm transition-all"
                      onClick={() => window.location.href = '/hr/leaves/allocation'}
                    >
                      <Users className="h-8 w-8 mb-2 text-blue-600" />
                      <span className="font-medium text-blue-900">Allocate Leaves</span>
                    </Button>
                    <Button 
                      className="h-24 flex flex-col items-center justify-center bg-white hover:bg-blue-100 border border-blue-200 shadow-sm transition-all"
                      onClick={() => window.location.href = '/hr/leaves/applications'}
                    >
                      <Clock className="h-8 w-8 mb-2 text-blue-600" />
                      <span className="font-medium text-blue-900">Add Applications</span>
                    </Button>
                    <Button 
                      className="h-24 flex flex-col items-center justify-center bg-white hover:bg-blue-100 border border-blue-200 shadow-sm transition-all"
                      onClick={() => window.location.href = '/hr/leaves/balance'}
                    >
                      <Calendar className="h-8 w-8 mb-2 text-blue-600" />
                      <span className="font-medium text-blue-900">Check Balances</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Type Breakdown */}
              <Card className="shadow-md rounded-xl border bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold tracking-tight">Leave Type Breakdown - {dashboardData?.currentYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dashboardData?.stats.map((stat) => (
                      <div key={stat._id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{stat._id}</h3>
                          <Badge className={getLeaveTypeColor(stat._id)}>
                            {stat._id}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Allocated:</span>
                            <span className="font-medium">{stat.totalAllocated}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Used:</span>
                            <span className="font-medium">{stat.totalUsed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Balance:</span>
                            <span className="font-medium">{stat.totalBalance}</span>
                          </div>
                          {(stat._id === 'PL' || stat._id === 'LWP') && (
                            <div className="flex justify-between">
                              <span>Carried Forward:</span>
                              <span className="font-medium">{stat.totalCarriedForward}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'applications' && (
            <Card className="shadow-md rounded-xl border bg-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">Recent Leave Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApplications.length === 0 ? (
                  <p className="text-muted-foreground">No applications found</p>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.slice(0, 5).map((app) => (
                      <div key={app._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{app.employeeName}</p>
                            <p className="text-sm text-muted-foreground">{app.empId}</p>
                          </div>
                          <Badge className={getLeaveTypeColor(app.leaveType)}>
                            {app.leaveType}
                          </Badge>
                          <div className="text-sm">
                            <p>{new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">{app.days} day(s)</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                          <Button size="sm" onClick={() => window.location.href = `/hr/leaves/applications`}>
                            View All
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingApplications.length > 5 && (
                      <div className="text-center">
                        <Button variant="outline" onClick={() => window.location.href = '/hr/leaves/applications'}>
                          View All Applications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'allocations' && (
            <div className="text-center py-10">
              <p>Allocation details would be shown here.</p>
              <Button onClick={checkPendingAllocations} className="mt-4">
                Refresh Allocations
              </Button>
            </div>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}