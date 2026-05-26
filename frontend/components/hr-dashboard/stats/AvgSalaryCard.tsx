import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { useState, useEffect } from "react"

interface AvgSalaryCardProps {
  avgSalary: number
  totalSalary?: number // Make it optional
}

export function AvgSalaryCard({ avgSalary, totalSalary = 0 }: AvgSalaryCardProps) { // Default to 0 if undefined
  const [showTotal, setShowTotal] = useState(false)

  const formatCurrency = (value: number) => {
    // Handle NaN, null, or undefined values
    if (!value || isNaN(value)) {
      return "₹0"
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  }

  const displayedValue = showTotal ? totalSalary : avgSalary
  const label = showTotal ? "Total Salary" : "Avg. Salary"
  const description = showTotal ? "Across all employees" : "+2.6% from last month"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(displayedValue)}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center">
          <span className="text-xs text-muted-foreground mr-2">Avg.</span>
          <button
            onClick={() => setShowTotal(!showTotal)}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${showTotal ? 'bg-blue-600' : 'bg-gray-300'
              }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showTotal ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
          <span className="text-xs text-muted-foreground ml-2">Total</span>
        </div>
      </CardContent>
    </Card>
  )
}