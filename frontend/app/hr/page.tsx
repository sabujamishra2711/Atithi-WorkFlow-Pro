"use client"

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import axios from 'axios'; // Import axios directly
import {
  TotalEmployeesCard,
  PresentThisMonthCard,
  AvgSalaryCard,
  MonthlyAttendanceTrendChart,
  TodaysAttendanceStatusChart,
  QuickStatisticsChart,
  DepartmentDistributionChart
} from "@/components/hr-dashboard"
import { RefreshButton } from "@/components/shared-buttons";


type DepartmentStat = { name: string; employees: number; fill: string };
type QuickStats = {
  onTimeArrivals: number;
  lateArrivals: number;
  absent: number;
  onLeave: number;
  overtimeHours: number;
  pendingApprovals: number;
};

// Create a direct axios instance with the base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ?
      `${window.location.origin}/api/v1` :
      'http://localhost:8000/api/v1'),
  withCredentials: true,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== "undefined") {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function getRole() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("role") || ""
  }
  return ""
}

export default function HRDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    addedThisMonth: 0,
    presentToday: 0,
    attendanceRate: 0,
    avgSalary: 0,
    totalSalary: 0, // Add totalSalary to state
    pendingRequests: 0,
    absent: 0,  // Add absent count to state
    onLeave: 0, // Add onLeave count to state
  });
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  // Function to refresh dashboard data
  const refreshDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/hr/stats"); // Using direct axios instance

      // Validate that we're getting the expected data
      if (!res.data.hasOwnProperty('totalSalary')) {
        console.warn('totalSalary not found in response, calculating from avgSalary and activeUsers');
        // Fallback calculation if backend isn't sending totalSalary
        if (res.data.avgSalary && res.data.totalEmployees) {
          // This is a rough estimate - not accurate but better than 0
          const estimatedTotalSalary = res.data.avgSalary * res.data.totalEmployees;
          res.data.totalSalary = estimatedTotalSalary;
          console.log('Estimated totalSalary:', estimatedTotalSalary);
        }
      }

      // Fetch attendance trend from dashboard punch monthly trend endpoint
      const trendRes = await api.get("/dashboard/punch/monthly/trend"); // Using direct axios instance
      const graphres = await api.get("/dashboard/hr/graph-data"); // Using direct axios instance
      const quick = await api.get("/dashboard/hr/quick-stats"); // Using direct axios instance
      setAttendanceStats(trendRes.data.trend || []);
      setDepartmentStats(graphres.data.departmentData);

      // Ensure we're properly setting the totalSalary from the response
      const newStats = {
        totalEmployees: res.data.totalEmployees || 0,
        addedThisMonth: res.data.addedThisMonth || 0,
        presentToday: res.data.presentToday || 0,
        attendanceRate: res.data.attendanceRate || 0,
        avgSalary: res.data.avgSalary || 0,
        totalSalary: res.data.totalSalary || 0, // Make sure we're setting totalSalary
        pendingRequests: res.data.pendingRequests || 0,
        absent: res.data.absent || 0,
        onLeave: res.data.onLeave || 0,
      };

      setStats(newStats);

      setQuickStats(quick.data);
    } catch (err) {
      console.error('Error fetching HR stats:', err); // Debug log
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userRole = getRole();
    setRole(userRole);
    refreshDashboard();
  }, []); // Only run on mount

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">HR Dashboard</h1>
          {role && (
            <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${role === "ADMIN" ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>{role === "ADMIN" ? "Admin" : "HR"}</span>
          )}
        </div>
        <RefreshButton
          onClick={refreshDashboard}
          loading={loading}
          size="sm"
        />
      </header>
      <div id="report-section" className="flex-1 space-y-6 p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-lg">Loading dashboard...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-600 text-lg">{error}</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <TotalEmployeesCard
                totalEmployees={stats.totalEmployees}
                addedThisMonth={stats.addedThisMonth}
              />
              <PresentThisMonthCard
                presentToday={stats.presentToday}
                attendanceRate={stats.attendanceRate}
              />
              <AvgSalaryCard
                avgSalary={stats.avgSalary}
                totalSalary={stats.totalSalary} // Pass totalSalary to the card
              />
            </div>

            {/* Charts Section */}
            <div className="flex gap-4">
              {/* Attendance Trend */}
              <div className="flex-1 flex flex-col gap-6">
                <MonthlyAttendanceTrendChart attendanceStats={attendanceStats} />

                <TodaysAttendanceStatusChart
                  presentToday={stats.presentToday}
                  absent={stats.absent}
                  onLeave={stats.onLeave}
                  totalEmployees={stats.totalEmployees}
                />

                {quickStats && <QuickStatisticsChart quickStats={quickStats} />}
              </div>

              {/* Department Distribution */}
              <div className="lg:col-span-1">
                <DepartmentDistributionChart departmentStats={departmentStats} />
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarInset>
  )
}