"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, Area, AreaChart } from "recharts"
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Target } from "lucide-react"
import { useEffect, useState } from "react"
import axios from 'axios'

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

type PerformanceData = {
  month: string;
  performance: number;
  satisfaction: number;
  productivity: number;
}

type DepartmentPerformance = {
  department: string;
  score: number;
  employees: number;
}

const chartConfig = {
  performance: {
    label: "Performance",
    color: "#3b82f6",
  },
  satisfaction: {
    label: "Satisfaction",
    color: "#10b981",
  },
  productivity: {
    label: "Productivity",
    color: "#f59e0b",
  },
  score: {
    label: "Score",
    color: "#8b5cf6",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch performance analytics data
        const performanceRes = await api.get("/hr/analytics/performance")

        // If we get real data, use it; otherwise, use mock data
        if (performanceRes.data.performanceData && performanceRes.data.performanceData.length > 0) {
          setPerformanceData(performanceRes.data.performanceData)
          setDepartmentPerformance(performanceRes.data.topPerformers || [])
        } else {
          // Fallback to mock data
          setPerformanceData([
            { month: "Jan", performance: 0, satisfaction: 0, productivity: 0 },
            { month: "Feb", performance: 0, satisfaction: 0, productivity: 0 },
            { month: "Mar", performance: 0, satisfaction: 0, productivity: 0 },
            { month: "Apr", performance: 0, satisfaction: 0, productivity: 0 },
            { month: "May", performance: 0, satisfaction: 0, productivity: 0 },
            { month: "Jun", performance: 0, satisfaction: 0, productivity: 0 },
          ])

          setDepartmentPerformance([
            { department: "Engineering", score: 0, employees: 0 },
            { department: "Sales", score: 0, employees: 0 },
            { department: "Marketing", score: 0, employees: 0 },
            { department: "HR", score: 0, employees: 0 },
            { department: "Finance", score: 0, employees: 0 },
          ])
        }
      } catch (err) {
        console.error("Error fetching analytics data:", err)
        setError("Failed to load analytics data")

        // Fallback to mock data on error
        setPerformanceData([
          { month: "Jan", performance: 85, satisfaction: 78, productivity: 82 },
          { month: "Feb", performance: 88, satisfaction: 81, productivity: 85 },
          { month: "Mar", performance: 92, satisfaction: 85, productivity: 89 },
          { month: "Apr", performance: 89, satisfaction: 83, productivity: 87 },
          { month: "May", performance: 94, satisfaction: 88, productivity: 91 },
          { month: "Jun", performance: 91, satisfaction: 86, productivity: 88 },
        ])

        setDepartmentPerformance([
          { department: "Engineering", score: 92, employees: 45 },
          { department: "Sales", score: 88, employees: 32 },
          { department: "Marketing", score: 85, employees: 28 },
          { department: "HR", score: 90, employees: 12 },
          { department: "Finance", score: 87, employees: 18 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Analytics Overview</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex justify-center items-center h-64">
            Loading analytics data...
          </div>
        </div>
      </SidebarInset>
    )
  }

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Analytics Overview</h1>
        </header>
        <div className="flex-1 space-y-6 p-6">
          <div className="flex justify-center items-center h-64 text-red-600">
            {error}
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Analytics Overview</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HR Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into workforce performance and trends</p>
        </div>

        {/* KPI Cards - Using mock data for now as the backend doesn't provide these specific values */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">91%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +3% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employee Satisfaction</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">86%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +2% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity Index</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">88%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                -1% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Employee</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">$5,700</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +2.6% from last month
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>6-month trend analysis of key HR metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <AreaChart data={performanceData}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="performance"
                  stroke="var(--color-performance)"
                  fill="var(--color-performance)"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="var(--color-satisfaction)"
                  fill="var(--color-satisfaction)"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="productivity"
                  stroke="var(--color-productivity)"
                  fill="var(--color-productivity)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Performance scores by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={departmentPerformance} layout="horizontal">
                <XAxis type="number" />
                <YAxis dataKey="department" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="score" fill="var(--color-score)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}