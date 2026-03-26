"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FinancialSummaryProps {
  inventory: any[]
  sales: any[]
}

export function FinancialSummary({ inventory, sales }: FinancialSummaryProps) {
  // Calculate total inventory value and cost
  const inventoryMetrics = inventory
    .filter((item) => !item.category?.startsWith("Consumable:"))
    .reduce(
      (acc, item) => {
        const quantity = item.quantity || 0
        const sellingPrice = item.price || 0
        const costPerSeedling = item.cost_per_seedling || 0

        acc.totalValue += quantity * sellingPrice
        acc.totalCost += quantity * costPerSeedling
        acc.totalSeedlings += quantity

        return acc
      },
      { totalValue: 0, totalCost: 0, totalSeedlings: 0 },
    )

  // Calculate sales metrics
  const salesMetrics = sales.reduce(
    (acc, sale) => {
      const costPerSeedling = sale.inventory?.cost_per_seedling || 0
      const totalCost = costPerSeedling * sale.quantity
      const profit = sale.total_amount - totalCost

      acc.totalRevenue += sale.total_amount
      acc.totalCost += totalCost
      acc.totalProfit += profit
      acc.totalSeedlingsSold += sale.quantity

      return acc
    },
    { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalSeedlingsSold: 0 },
  )

  const averageProfitMargin =
    salesMetrics.totalRevenue > 0 ? ((salesMetrics.totalProfit / salesMetrics.totalRevenue) * 100).toFixed(1) : "0"

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="text-2xl sm:text-3xl font-bold">Ksh {inventoryMetrics.totalValue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{inventoryMetrics.totalSeedlings} seedlings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Cost</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="text-2xl sm:text-3xl font-bold">Ksh {inventoryMetrics.totalCost.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Production cost</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Sales Profit</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="text-2xl sm:text-3xl font-bold">Ksh {salesMetrics.totalProfit.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{salesMetrics.totalSeedlingsSold} sold</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="text-2xl sm:text-3xl font-bold">{averageProfitMargin}%</div>
          <p className="text-xs text-muted-foreground mt-1">Average margin</p>
        </CardContent>
      </Card>
    </div>
  )
}
