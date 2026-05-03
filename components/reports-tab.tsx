"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Loader2, TrendingUp, TrendingDown, Minus, Package, BarChart3, Star, Award, ShoppingCart } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DemoModeBanner } from "./demo-mode-banner"
import { exportToExcel } from "@/lib/excel-export"

// Demo data for reports
const demoReportsData = [
  {
    batch_sku: "MAN01",
    plant_name: "Mango",
    category: "Fruit Trees",
    quantity: 50,
    selling_price: 150,
    total_batch_cost: 2500,
    total_task_costs: 3250,
    total_cost_per_seedling: 115,
    profit_per_seedling: 35,
    profit_margin: 23.3,
    total_batch_value: 7500,
    total_batch_profit: 1750,
    seedlings_sold: 15,
    revenue_generated: 2250,
    profit_realized: 525,
  },
  {
    batch_sku: "AVA01",
    plant_name: "Avocado",
    category: "Fruit Trees",
    quantity: 30,
    selling_price: 200,
    total_batch_cost: 1800,
    total_task_costs: 2100,
    total_cost_per_seedling: 130,
    profit_per_seedling: 70,
    profit_margin: 35.0,
    total_batch_value: 6000,
    total_batch_profit: 2100,
    seedlings_sold: 12,
    revenue_generated: 2400,
    profit_realized: 840,
  },
  {
    batch_sku: "BLU01",
    plant_name: "Blue Gum",
    category: "Timber Trees",
    quantity: 100,
    selling_price: 80,
    total_batch_cost: 3000,
    total_task_costs: 2500,
    total_cost_per_seedling: 55,
    profit_per_seedling: 25,
    profit_margin: 31.3,
    total_batch_value: 8000,
    total_batch_profit: 2500,
    seedlings_sold: 25,
    revenue_generated: 2000,
    profit_realized: 625,
  },
]

export function ReportsTab() {
  const [profitabilityData, setProfitabilityData] = useState<any[]>([])
  const [supplierData, setSupplierData] = useState<any[]>([])
  const [salesReport, setSalesReport] = useState<{ daily: any[]; totals: { today: number; week: number; month: number; todayCount: number; weekCount: number } }>({ daily: [], totals: { today: 0, week: 0, month: 0, todayCount: 0, weekCount: 0 } })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tablesExist, setTablesExist] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchProfitabilityData()
  }, [])

  async function fetchProfitabilityData() {
    if (isDemoMode) {
      setProfitabilityData(demoReportsData)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Check if required tables exist
      const [inventoryExists, tasksExists, salesExists] = await Promise.all([
        checkTableExists("vnms_batches"),
        checkTableExists("vnms_staff_tasks"),
        checkTableExists("vnms_sales"),
      ])

      if (!inventoryExists || !tasksExists || !salesExists) {
        setTablesExist(false)
        setProfitabilityData(demoReportsData)
        setLoading(false)
        return
      }

      // Fetch inventory data with cost tracking
      const { data: inventory, error: inventoryError } = await supabase
        .from("vnms_batches")
        .select("*")
        .neq("item_type", "Consumable")

      if (inventoryError) throw inventoryError

      // Fetch task costs grouped by batch SKU
      const { data: taskCosts, error: taskError } = await supabase
        .from("vnms_staff_tasks")
        .select("batch_sku, total_cost")

      if (taskError) throw taskError

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from("vnms_sales")
        .select("*")

      if (salesError) throw salesError

      // Calculate profitability for each batch
      const profitabilityMap = new Map()

      inventory?.forEach((item: any) => {
        const batchSku = item.sku
        const batchCost = item.batch_cost || 0
        const batchSales = sales?.filter((sale: any) => sale.batch_code === batchSku || sale.batch_id === item.id) || []
        const seedlingsSold = batchSales.reduce((sum: any, sale: any) => sum + Number(sale.quantity || 0), 0)
        const revenueGenerated = batchSales.reduce((sum: any, sale: any) => sum + Number(sale.total_amount || 0), 0)
        const producedQuantity = Math.max(Number(item.quantity || 0) + seedlingsSold, 1)

        const taskCostsForBatch = taskCosts
          ?.filter((task: any) => task.batch_sku === batchSku)
          .reduce((sum: any, task: any) => sum + Number(task.total_cost || 0), 0) || 0

        const totalCostPerSeedling = (batchCost + taskCostsForBatch) / producedQuantity

        const profitPerSeedling = item.price - totalCostPerSeedling
        const profitMargin = item.price > 0 ? (profitPerSeedling / item.price) * 100 : 0

        const costRealized = seedlingsSold * totalCostPerSeedling
        const profitRealized = revenueGenerated - costRealized

        profitabilityMap.set(batchSku, {
          batch_sku: batchSku,
          plant_name: item.plant_name,
          category: item.category,
          quantity: producedQuantity,
          selling_price: item.price,
          total_batch_cost: batchCost,
          total_task_costs: taskCostsForBatch,
          total_cost_per_seedling: totalCostPerSeedling,
          profit_per_seedling: profitPerSeedling,
          profit_margin: profitMargin,
          total_batch_value: producedQuantity * item.price,
          total_batch_profit: producedQuantity * profitPerSeedling,
          seedlings_sold: seedlingsSold,
          revenue_generated: revenueGenerated,
          profit_realized: profitRealized,
        })
      })

      // Convert to array and sort by profit margin (highest first)
      const profitabilityArray = Array.from(profitabilityMap.values())
        .sort((a, b) => b.profit_margin - a.profit_margin)

      setProfitabilityData(profitabilityArray)

      // Build daily sales summary for last 14 days
      {
        const today = new Date()
        const todayStr = today.toISOString().split("T")[0]
        const mondayOffset = (today.getDay() + 6) % 7
        const weekStart = new Date(today); weekStart.setDate(today.getDate() - mondayOffset)
        const weekStartStr = weekStart.toISOString().split("T")[0]
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
        const dailyMap = new Map<string, { revenue: number; count: number }>()
        let totToday = 0, totWeek = 0, totMonth = 0, cntToday = 0, cntWeek = 0
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today); d.setDate(today.getDate() - i)
          dailyMap.set(d.toISOString().split("T")[0], { revenue: 0, count: 0 })
        }
        sales?.forEach((s: any) => {
          const dateStr = (s.sale_date || "").slice(0, 10)
          if (dailyMap.has(dateStr)) {
            const cur = dailyMap.get(dateStr)!
            cur.revenue += s.total_amount || 0
            cur.count += 1
          }
          if (dateStr === todayStr) { totToday += s.total_amount || 0; cntToday++ }
          if (dateStr >= weekStartStr) { totWeek += s.total_amount || 0; cntWeek++ }
          if (dateStr >= monthStart) { totMonth += s.total_amount || 0 }
        })
        setSalesReport({
          daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
          totals: { today: totToday, week: totWeek, month: totMonth, todayCount: cntToday, weekCount: cntWeek },
        })
      }

      // Fetch supplier leaderboard from sachets
      const sachetsRes = await supabase.from("vnms_sachets").select("supplier_name, label_germination_pct, actual_germination_pct, cost_paid, seed_count, crop_type")
      if (!sachetsRes.error && sachetsRes.data) {
        const supplierMap = new Map<string, any>()
        sachetsRes.data.forEach((s: any) => {
          const key = s.supplier_name || 'Unknown'
          const cur = supplierMap.get(key) || { supplier_name: key, total_cost: 0, batches: 0, avg_label_germ: 0, avg_actual_germ: 0, crops: new Set<string>() }
          cur.total_cost += s.cost_paid || 0
          cur.batches += 1
          cur.avg_label_germ += s.label_germination_pct || 0
          cur.avg_actual_germ += s.actual_germination_pct || 0
          if (s.crop_type) cur.crops.add(s.crop_type)
          supplierMap.set(key, cur)
        })
        const supplierArr = Array.from(supplierMap.values()).map(s => ({
          ...s,
          avg_label_germ: s.batches > 0 ? s.avg_label_germ / s.batches : 0,
          avg_actual_germ: s.batches > 0 ? s.avg_actual_germ / s.batches : 0,
          crops: Array.from(s.crops).join(', '),
        })).sort((a, b) => b.avg_actual_germ - a.avg_actual_germ)
        setSupplierData(supplierArr)
      }
    } catch (error: any) {
      console.error("Error fetching profitability data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch profitability data. Using demo data.",
        variant: "destructive",
      })
      setProfitabilityData(demoReportsData)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const exportData = profitabilityData.map((item) => ({
        "Batch SKU": item.batch_sku,
        "Plant Name": item.plant_name,
        Category: item.category,
        "Quantity in Batch": item.quantity,
        "Selling Price per Seedling (Ksh)": item.selling_price,
        "Initial Batch Cost (Ksh)": item.total_batch_cost,
        "Task Costs (Ksh)": item.total_task_costs,
        "Total Cost per Seedling (Ksh)": Math.round(item.total_cost_per_seedling * 100) / 100,
        "Profit per Seedling (Ksh)": Math.round(item.profit_per_seedling * 100) / 100,
        "Profit Margin (%)": Math.round(item.profit_margin * 100) / 100,
        "Total Batch Value (Ksh)": item.total_batch_value,
        "Potential Batch Profit (Ksh)": Math.round(item.total_batch_profit * 100) / 100,
        "Seedlings Sold": item.seedlings_sold,
        "Revenue Generated (Ksh)": item.revenue_generated,
        "Profit Realized (Ksh)": Math.round(item.profit_realized * 100) / 100,
      }))

      const success = exportToExcel(exportData, `Profitability_Report_${new Date().toISOString().split("T")[0]}`)

      if (success) {
        toast({
          title: "Export Successful",
          description: `${exportData.length} profit records exported to Excel`,
        })
      } else {
        throw new Error("Export failed")
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred during export",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  // Calculate summary metrics
  const totalBatches = profitabilityData.length
  const totalRevenue = profitabilityData.reduce((sum, item) => sum + item.revenue_generated, 0)
  const totalProfit = profitabilityData.reduce((sum, item) => sum + item.profit_realized, 0)
  const averageProfitMargin = totalBatches > 0 
    ? profitabilityData.reduce((sum, item) => sum + item.profit_margin, 0) / totalBatches 
    : 0

  const getProfitTrendIcon = (margin: number) => {
    if (margin > 25) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (margin > 10) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getProfitBadgeVariant = (margin: number) => {
    if (margin > 25) return "default"
    if (margin > 10) return "secondary"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      {(isDemoMode || !tablesExist) && (
        <DemoModeBanner isDemoMode={isDemoMode} connectionStatus={tablesExist ? 'connected' : 'demo'} />
      )}

      <div className="modern-header">
        <h1 className="modern-title">Reports</h1>
        <p className="modern-subtitle">Production cost, profitability, and supplier performance</p>
      </div>

      <Tabs defaultValue="profitability" className="w-full">
        <TabsList className="flex w-full max-w-lg">
          <TabsTrigger value="profitability" className="flex-1 flex items-center gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3" /> Profitability
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex-1 flex items-center gap-1 text-xs sm:text-sm">
            <ShoppingCart className="h-3 w-3" /> Sales
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex-1 flex items-center gap-1 text-xs sm:text-sm">
            <Award className="h-3 w-3" /> Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-4 space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{totalBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{averageProfitMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleExportToExcel}
          disabled={exporting || profitabilityData.length === 0}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export to Excel
        </Button>
      </div>

      {/* Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading profitability data...</div>
          ) : profitabilityData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No profitability data available. Add inventory and tasks to see reports.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs">#</TableHead>
                  <TableHead className="">Plant & Batch</TableHead>
                  <TableHead className="hidden sm:table-cell">Performance</TableHead>
                  <TableHead className="hidden lg:table-cell">Sales Data</TableHead>
                  <TableHead className="">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitabilityData.map((item, index) => (
                  <TableRow key={item.batch_sku} className="hover:bg-muted/50">
                    <TableCell className="font-bold text-primary text-xs w-8">{index + 1}</TableCell>
                    <TableCell className="">
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate">{item.plant_name}</div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="font-mono text-xs truncate max-w-[60px] sm:max-w-none">
                            {item.batch_sku}
                          </Badge>
                          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                            {item.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </div>
                        <div className="sm:hidden text-xs space-y-1">
                          <Badge variant={getProfitBadgeVariant(item.profit_margin)} className="text-xs">
                            {getProfitTrendIcon(item.profit_margin)}
                            {item.profit_margin.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <Badge variant={getProfitBadgeVariant(item.profit_margin)} className="text-xs">
                          {getProfitTrendIcon(item.profit_margin)}
                          {item.profit_margin.toFixed(1)}%
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Cost: Ksh {Math.round(item.total_cost_per_seedling)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">Ksh {item.revenue_generated.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {item.seedlings_sold} sold
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="">
                      <div className="space-y-1">
                        <div className="font-bold text-accent text-sm">
                          Ksh {Math.round(item.profit_realized).toLocaleString()}
                        </div>
                        <div className="lg:hidden text-xs text-muted-foreground">
                          Rev: Ksh {item.revenue_generated.toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">Today</p>
                <p className="text-2xl font-black text-green-700">Ksh {salesReport.totals.today.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-0.5">{salesReport.totals.todayCount} sale{salesReport.totals.todayCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">This Week</p>
                <p className="text-2xl font-black text-blue-700">Ksh {salesReport.totals.week.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-0.5">{salesReport.totals.weekCount} sale{salesReport.totals.weekCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase mb-1">This Month</p>
                <p className="text-2xl font-black text-orange-700">Ksh {salesReport.totals.month.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm">Daily Sales — Last 14 Days</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {salesReport.daily.filter(d => d.revenue > 0 || d.count > 0).reverse().map(d => {
                    const dateLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })
                    const maxRev = Math.max(...salesReport.daily.map(x => x.revenue), 1)
                    const pct = (d.revenue / maxRev) * 100
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28 shrink-0">{dateLabel}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div className="h-full bg-green-400 rounded transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-28 text-right shrink-0">
                          Ksh {d.revenue.toLocaleString()} <span className="text-gray-400 font-normal">({d.count})</span>
                        </span>
                      </div>
                    )
                  })}
                  {salesReport.daily.every(d => d.revenue === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-sm">No sales recorded in last 14 days</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" /> Supplier Leaderboard</CardTitle>
              <p className="text-sm text-muted-foreground">Ranked by average germination rate. Based on sachet records.</p>
            </CardHeader>
            <CardContent>
              {supplierData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No sachet data yet. Add sachets in Inventory → Sachets to track supplier performance.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[820px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Crops</TableHead>
                        <TableHead>Batches</TableHead>
                        <TableHead>Label Germ.</TableHead>
                        <TableHead>Actual Germ.</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierData.map((s, i) => (
                        <TableRow key={s.supplier_name}>
                          <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                          <TableCell className="font-semibold">{s.supplier_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.crops || '-'}</TableCell>
                          <TableCell>{s.batches}</TableCell>
                          <TableCell>
                            {s.avg_label_germ > 0 ? (
                              <Badge variant="outline">{s.avg_label_germ.toFixed(0)}%</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {s.avg_actual_germ > 0 ? (
                              <Badge className={s.avg_actual_germ >= 80 ? 'bg-green-100 text-green-800 border-green-200' : s.avg_actual_germ >= 60 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'} variant="outline">
                                {s.avg_actual_germ.toFixed(0)}%
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">Not recorded</span>}
                          </TableCell>
                          <TableCell className="font-medium">Ksh {s.total_cost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}