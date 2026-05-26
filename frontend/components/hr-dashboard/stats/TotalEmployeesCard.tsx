import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

interface TotalEmployeesCardProps {
  totalEmployees: number
  addedThisMonth: number
}

export function TotalEmployeesCard({ totalEmployees, addedThisMonth }: TotalEmployeesCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalEmployees}</div>
        <p className="text-xs text-muted-foreground">+{addedThisMonth} from last month</p>
      </CardContent>
    </Card>
  )
}