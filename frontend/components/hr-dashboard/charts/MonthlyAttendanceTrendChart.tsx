import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

interface MonthlyAttendanceTrendChartProps {
  attendanceStats: any[]
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
} satisfies ChartConfig

export function MonthlyAttendanceTrendChart({ attendanceStats }: MonthlyAttendanceTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Attendance Trend</CardTitle>
        <CardDescription>Employee attendance over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={attendanceStats} aria-label="Attendance Trend Chart">
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="present" fill="var(--color-present)" />
            <Bar dataKey="absent" fill="var(--color-absent)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}