import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface QuickStats {
  onTimeArrivals: number
  lateArrivals: number
  absent: number
  onLeave: number
  overtimeHours: number
  pendingApprovals: number
}

interface QuickStatisticsChartProps {
  quickStats: QuickStats
}

export function QuickStatisticsChart({ quickStats }: QuickStatisticsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Statistics For Current Month</CardTitle>
        <CardDescription>Real-time dashboard metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{quickStats.onTimeArrivals}</div>
              <div className="text-sm text-green-700">On Time</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{quickStats.absent}</div>
              <div className="text-sm text-red-700">Absent</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{quickStats.onLeave}</div>
              <div className="text-sm text-blue-700">On Leave</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{quickStats.pendingApprovals}</div>
              <div className="text-sm text-purple-700">Pending Punches</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overtime Hours For This Month</span>
              <span className="text-sm font-semibold">{quickStats.overtimeHours}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}