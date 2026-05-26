import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"

interface DepartmentStat {
  name: string
  employees: number
  fill: string
}

interface DepartmentDistributionChartProps {
  departmentStats: DepartmentStat[]
}

const chartConfig = {
  departments: {
    label: "Departments",
  },
} satisfies ChartConfig

export function DepartmentDistributionChart({ departmentStats }: DepartmentDistributionChartProps) {
  // Filter out 'admin', 'ADMIN', and 'Unknown' departments
  const filteredDepartmentStats = departmentStats ? departmentStats.filter(
    (entry) =>
      entry.name &&
      entry.name.toLowerCase() !== 'admin' &&
      entry.name.toLowerCase() !== 'unknown'
  ) : []

  const totalEmployees = filteredDepartmentStats.reduce((sum, dept) => sum + dept.employees, 0)

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Distribution</CardTitle>
        <CardDescription>Employees by department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Pie Chart */}
          <div className="flex-1 min-h-[250px] flex flex-col items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[200px]">
              <PieChart aria-label="Department Distribution Chart" width={200} height={250}>
                <Pie
                  data={filteredDepartmentStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="employees"
                >
                  {filteredDepartmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>

          {/* Enhanced Legend */}
          <div className="flex-1">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Department Breakdown</h4>
              {filteredDepartmentStats.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white shadow-sm"
                      style={{ background: entry.fill }}
                    ></div>
                    <div>
                      <span className="text-xs font-medium text-gray-900">{entry.name}</span>
                      <div className="text-xs text-gray-500">
                        {entry.employees} employee{entry.employees !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    {calculatePercentage(entry.employees, totalEmployees)}%
                  </div>
                </div>
              ))}

              {/* Summary Stats */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Total:</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {totalEmployees}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs font-medium text-gray-700">Departments:</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {filteredDepartmentStats.length}
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