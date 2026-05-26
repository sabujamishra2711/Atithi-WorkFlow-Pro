import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCheck } from "lucide-react"

interface PresentThisMonthCardProps {
  presentToday: number
  attendanceRate: number
}

export function PresentThisMonthCard({ presentToday, attendanceRate }: PresentThisMonthCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Present This Month</CardTitle>
        <UserCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{presentToday}</div>
        <p className="text-xs text-muted-foreground">{attendanceRate}% monthly attendance rate</p>
      </CardContent>
    </Card>
  )
}