import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"

interface TodaysAttendanceStatusChartProps {
  presentToday: number
  absent: number
  onLeave: number
  totalEmployees: number
}

const chartConfig = {
  present: {
    label: "Present",
    color: "#22c55e",
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
  },
  onLeave: {
    label: "On Leave",
    color: "#f59e0b",
  },
} satisfies ChartConfig

export function TodaysAttendanceStatusChart({ 
  presentToday, 
  absent, 
  onLeave, 
  totalEmployees 
}: TodaysAttendanceStatusChartProps) {
  const attendanceData = [
    { name: 'Present', value: presentToday || 0, fill: '#22c55e' },
    { name: 'Absent', value: absent || 0, fill: '#ef4444' },
    { name: 'On Leave', value: onLeave || 0, fill: '#f59e0b' },
  ]

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Attendance Status</CardTitle>
        <CardDescription>Current day attendance breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Pie Chart */}
          <div className="flex-1 min-h-[250px] flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[200px]">
              <PieChart aria-label="Attendance Status Chart" width={200} height={250}>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>

          {/* Legend */}
          <div className="flex-1">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Attendance Breakdown</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-green-500"></div>
                    <span className="text-xs font-medium text-gray-900">Present</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    {presentToday} ({calculatePercentage(presentToday, totalEmployees)}%)
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-red-500"></div>
                    <span className="text-xs font-medium text-gray-900">Absent</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    {absent} ({calculatePercentage(absent, totalEmployees)}%)
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-yellow-500"></div>
                    <span className="text-xs font-medium text-gray-900">On Leave</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    {onLeave} ({calculatePercentage(onLeave, totalEmployees)}%)
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Attendance Rate:</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {calculatePercentage(presentToday, totalEmployees)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}