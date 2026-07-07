"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Loader2, TrendingUp, TrendingDown, Minus, Package, BarChart3, Star, Award, ShoppingCart, CreditCard, AlertTriangle } from "lucide-react"
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
  const [creditReport, setCreditReport] = useState<{
    byCustomer: { id: string; name: string; outstanding: number; count: number }[]
    aging: { bucket: string; amount: number; count: number }[]
    weekly: { week: string; issued: number; outstanding: number }[]
    totalOutstanding: number
    totalIssued: number
    totalCollected: number
  }>({ byCustomer: [], aging: [], weekly: [], totalOutstanding: 0, totalIssued: 0, totalCollected: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tablesExist, setTablesExist] = useState(true)
  const [profitView, setProfitView] = useState<"batch" | "crop">("crop")
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
        .select("batch_sku, batch_id, total_cost")

      if (taskError) throw taskError

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from("vnms_sales")
        .select("*")

      if (salesError) throw salesError

      // Fetch vnms_costs (general cost records per batch) — fail silently if table missing
      const { data: costRecords } = await (supabase.from("vnms_costs") as any)
        .select("batch_id, cost_type, amount")

      // Calculate profitability for each batch
      const profitabilityMap = new Map()

      inventory?.forEach((item: any) => {
        const batchSku = item.sku || item.batch_code
        const batchCost = item.batch_cost || 0
        const batchSales = sales?.filter((sale: any) => sale.batch_code === batchSku || sale.batch_id === item.id) || []
        const seedlingsSold = batchSales.reduce((sum: any, sale: any) => sum + Number(sale.quantity || 0), 0)
        const revenueGenerated = batchSales.reduce((sum: any, sale: any) => sum + Number(sale.total_amount || 0), 0)
        const producedQuantity = Math.max(Number(item.quantity || 0) + seedlingsSold, 1)

        const taskCostsForBatch = taskCosts
          ?.filter((task: any) => task.batch_sku === batchSku || task.batch_id === item.id)
          .reduce((sum: any, task: any) => sum + Number(task.total_cost || 0), 0) || 0

        // Aggregate vnms_costs entries for this batch
        const batchCostRecords: any[] = (costRecords || []).filter((c: any) => c.batch_id === item.id)
        const vnmsCostsTotal = batchCostRecords.reduce((s: number, c: any) => s + Number(c.amount || 0), 0)
        const costsByType: Record<string, number> = batchCostRecords.reduce((acc: any, c: any) => {
          const t = (c.cost_type || "other").toLowerCase()
          acc[t] = (acc[t] || 0) + Number(c.amount || 0)
          return acc
        }, {})

        const totalCosts = batchCost + taskCostsForBatch + vnmsCostsTotal
        const totalCostPerSeedling = totalCosts / producedQuantity
        const profitPerSeedling = item.price - totalCostPerSeedling
        const profitMargin = item.price > 0 ? (profitPerSeedling / item.price) * 100 : 0
        const costRealized = seedlingsSold * totalCostPerSeedling
        const profitRealized = revenueGenerated - costRealized
        const roi = totalCosts > 0 ? (profitRealized / totalCosts) * 100 : 0

        profitabilityMap.set(item.id, {
          batch_id: item.id,
          batch_sku: batchSku,
          batch_code: item.batch_code,
          plant_name: item.plant_name,
          crop_type: item.crop_type || item.category || "Uncategorised",
          category: item.category,
          lifecycle_status: item.lifecycle_status,
          quantity: producedQuantity,
          selling_price: item.price,
          total_batch_cost: batchCost,
          total_task_costs: taskCostsForBatch,
          vnms_costs_total: vnmsCostsTotal,
          costs_by_type: costsByType,
          total_costs: totalCosts,
          total_cost_per_seedling: totalCostPerSeedling,
          profit_per_seedling: profitPerSeedling,
          profit_margin: profitMargin,
          total_batch_value: producedQuantity * item.price,
          total_batch_profit: producedQuantity * profitPerSeedling,
          seedlings_sold: seedlingsSold,
          revenue_generated: revenueGenerated,
          profit_realized: profitRealized,
          roi,
        })
      })

      // Convert to array and sort by ROI (highest first)
      const profitabilityArray = Array.from(profitabilityMap.values())
        .sort((a, b) => b.roi - a.roi)

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

      // Fetch credit sales report
      const creditRes = await (supabase.from("vnms_sales") as any)
        .select("id, customer_id, sale_date, total_amount, payment_method, payment_reference, customer:vnms_customers(id, name)")
        .or("payment_method.eq.Credit,payment_method.like.Credit%")
      if (!creditRes.error && creditRes.data) {
        const creditSales = creditRes.data as any[]
        const isPaid = (s: any) => (s.payment_method || "").toLowerCase().includes("paid") && !(s.payment_method || "").toLowerCase().includes("partial")
        const getPaid = (s: any) => s.payment_reference?.startsWith("partial:") ? Number(s.payment_reference.split(":")[1]) || 0 : 0
        const getOutstanding = (s: any) => isPaid(s) ? 0 : Math.max(0, (s.total_amount || 0) - getPaid(s))

        const custMap = new Map<string, { id: string; name: string; outstanding: number; count: number }>()
        const agingBuckets = { "0-7 days": 0, "8-14 days": 0, "15+ days": 0 }
        const agingCounts = { "0-7 days": 0, "8-14 days": 0, "15+ days": 0 }
        let totalOutstanding = 0, totalIssued = 0, totalCollected = 0
        const weekMap = new Map<string, { issued: number; outstanding: number }>()

        creditSales.forEach((s: any) => {
          const outstanding = getOutstanding(s)
          totalIssued += s.total_amount || 0
          totalCollected += getPaid(s) + (isPaid(s) ? (s.total_amount || 0) : 0)
          totalOutstanding += outstanding

          if (outstanding > 0) {
            const custId = s.customer_id || "unknown"
            const custName = s.customer?.name || "Unknown"
            const cur = custMap.get(custId) || { id: custId, name: custName, outstanding: 0, count: 0 }
            cur.outstanding += outstanding
            cur.count += 1
            custMap.set(custId, cur)

            const days = Math.floor((Date.now() - new Date(s.sale_date).getTime()) / (1000 * 60 * 60 * 24))
            const bucket = days <= 7 ? "0-7 days" : days <= 14 ? "8-14 days" : "15+ days"
            agingBuckets[bucket] += outstanding
            agingCounts[bucket] += 1
          }

          const saleDate = new Date(s.sale_date)
          const weekStart = new Date(saleDate)
          weekStart.setDate(saleDate.getDate() - ((saleDate.getDay() + 6) % 7))
          const weekKey = weekStart.toISOString().split("T")[0]
          const wk = weekMap.get(weekKey) || { issued: 0, outstanding: 0 }
          wk.issued += s.total_amount || 0
          wk.outstanding += outstanding
          weekMap.set(weekKey, wk)
        })

        const weekly = Array.from(weekMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-8)
          .map(([week, v]) => ({ week, ...v }))

        setCreditReport({
          byCustomer: Array.from(custMap.values()).sort((a, b) => b.outstanding - a.outstanding),
          aging: (["0-7 days", "8-14 days", "15+ days"] as const).map(bucket => ({
            bucket, amount: agingBuckets[bucket], count: agingCounts[bucket],
          })),
          weekly,
          totalOutstanding,
          totalIssued,
          totalCollected,
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
        "Batch Code": item.batch_code || item.batch_sku,
        "Plant Name": item.plant_name,
        "Crop Type": item.crop_type,
        "Category": item.category,
        "Lifecycle Status": item.lifecycle_status,
        "Quantity in Batch": item.quantity,
        "Seedlings Sold": item.seedlings_sold,
        "Selling Price per Seedling (Ksh)": item.selling_price,
        "Initial Batch Cost (Ksh)": item.total_batch_cost,
        "Labour / Task Costs (Ksh)": Math.round(item.total_task_costs),
        "Other Costs — vnms_costs (Ksh)": Math.round(item.vnms_costs_total || 0),
        "Total Costs (Ksh)": Math.round(item.total_costs || 0),
        "Cost per Seedling (Ksh)": Math.round(item.total_cost_per_seedling * 100) / 100,
        "Revenue Generated (Ksh)": Math.round(item.revenue_generated),
        "Profit Realized (Ksh)": Math.round(item.profit_realized),
        "Profit Margin (%)": Math.round(item.profit_margin * 10) / 10,
        "ROI (%)": Math.round((item.roi || 0) * 10) / 10,
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
  const totalCostsAll = profitabilityData.reduce((sum, item) => sum + (item.total_costs || 0), 0)
  const averageProfitMargin = totalBatches > 0
    ? profitabilityData.reduce((sum, item) => sum + item.profit_margin, 0) / totalBatches
    : 0
  const overallRoi = totalCostsAll > 0 ? (totalProfit / totalCostsAll) * 100 : 0

  // Crop-type grouping
  const cropReport: {
    crop_type: string; batches: number; revenue: number; total_costs: number
    profit: number; margin: number; roi: number; seedlings_sold: number
  }[] = (() => {
    const map = new Map<string, any>()
    for (const item of profitabilityData) {
      const ct = item.crop_type || "Uncategorised"
      const cur = map.get(ct) || { crop_type: ct, batches: 0, revenue: 0, total_costs: 0, profit: 0, seedlings_sold: 0 }
      cur.batches += 1
      cur.revenue += item.revenue_generated || 0
      cur.total_costs += item.total_costs || 0
      cur.profit += item.profit_realized || 0
      cur.seedlings_sold += item.seedlings_sold || 0
      map.set(ct, cur)
    }
    return Array.from(map.values()).map(c => ({
      ...c,
      margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
      roi: c.total_costs > 0 ? (c.profit / c.total_costs) * 100 : 0,
    })).sort((a, b) => b.roi - a.roi)
  })()

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
          <TabsTrigger value="credit" className="flex-1 flex items-center gap-1 text-xs sm:text-sm">
            <CreditCard className="h-3 w-3" /> Credit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-4 space-y-5">

          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Revenue</p>
                <p className="text-lg font-black text-green-700">Ksh {totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{totalBatches} batch{totalBatches !== 1 ? "es" : ""}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Total Costs</p>
                <p className="text-lg font-black text-red-600">Ksh {totalCostsAll.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">labour + inputs + other</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Profit Realised</p>
                <p className={`text-lg font-black ${totalProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  Ksh {Math.round(totalProfit).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">margin {averageProfitMargin.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Overall ROI</p>
                <p className={`text-lg font-black ${overallRoi >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  {overallRoi.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground">profit ÷ total costs</p>
              </CardContent>
            </Card>
          </div>

          {/* View toggle + export */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setProfitView("crop")}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${profitView === "crop" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> By Crop
              </button>
              <button
                onClick={() => setProfitView("batch")}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${profitView === "batch" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <Package className="h-3.5 w-3.5" /> By Batch
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs"
              onClick={handleExportToExcel} disabled={exporting || profitabilityData.length === 0}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading profitability data…</div>
          ) : profitabilityData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No data yet. Add batches and sales to see profitability.
            </div>
          ) : profitView === "crop" ? (
            /* ── BY CROP VIEW ── */
            <div className="space-y-3">
              {cropReport.map((c, i) => {
                const isPositive = c.profit >= 0
                const roiColor = c.roi >= 30 ? "text-green-700" : c.roi >= 0 ? "text-blue-700" : "text-red-600"
                const maxRev = Math.max(...cropReport.map(x => x.revenue), 1)
                const revPct = (c.revenue / maxRev) * 100
                return (
                  <Card key={c.crop_type} className={i === 0 ? "border-green-300 bg-green-50/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-base">🏆</span>}
                          <div>
                            <p className="font-bold text-gray-800">{c.crop_type}</p>
                            <p className="text-xs text-muted-foreground">{c.batches} batch{c.batches !== 1 ? "es" : ""} · {c.seedlings_sold.toLocaleString()} seedlings sold</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-black ${roiColor}`}>ROI {c.roi.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">margin {c.margin.toFixed(1)}%</p>
                        </div>
                      </div>
                      {/* Revenue bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${revPct}%` }} />
                      </div>
                      {/* Cost breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold text-green-700">Ksh {c.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Costs</p>
                          <p className="font-semibold text-red-600">Ksh {c.total_costs.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Profit</p>
                          <p className={`font-semibold ${isPositive ? "text-green-700" : "text-red-600"}`}>
                            Ksh {Math.round(c.profit).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* ── BY BATCH VIEW ── */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[680px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-7 text-xs pl-4">#</TableHead>
                        <TableHead>Plant / Batch</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Costs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitabilityData.map((item, index) => {
                        const isPos = item.profit_realized >= 0
                        const roiColor = item.roi >= 30 ? "text-green-700 font-bold" : item.roi >= 0 ? "text-blue-700" : "text-red-600"
                        return (
                          <TableRow key={item.batch_id || item.batch_sku} className="hover:bg-muted/40">
                            <TableCell className="font-bold text-muted-foreground text-xs pl-4">{index + 1}</TableCell>
                            <TableCell>
                              <p className="font-semibold text-sm truncate max-w-[140px]">{item.plant_name}</p>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {item.batch_code && (
                                  <Badge variant="outline" className="font-mono text-[10px] h-4 px-1">{item.batch_code}</Badge>
                                )}
                                {item.crop_type && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 hidden sm:inline-flex">{item.crop_type}</Badge>
                                )}
                                <Badge variant="outline" className={`text-[10px] h-4 px-1 ${getProfitBadgeVariant(item.profit_margin) === "destructive" ? "border-red-300 text-red-600" : getProfitBadgeVariant(item.profit_margin) === "default" ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}>
                                  {item.profit_margin.toFixed(0)}% margin
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{item.seedlings_sold} sold of {item.quantity}</p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right">
                              <p className="text-sm font-semibold text-red-600">Ksh {Math.round(item.total_costs || 0).toLocaleString()}</p>
                              {item.total_costs > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  Ksh {Math.round(item.total_cost_per_seedling)} / seedling
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="text-sm font-semibold text-green-700">Ksh {Math.round(item.revenue_generated).toLocaleString()}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className={`text-sm font-bold ${isPos ? "text-green-700" : "text-red-600"}`}>
                                Ksh {Math.round(item.profit_realized).toLocaleString()}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`text-sm ${roiColor}`}>{item.roi.toFixed(1)}%</span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
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

        <TabsContent value="credit" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">Outstanding Credit</p>
                <p className="text-2xl font-black text-red-700">Ksh {creditReport.totalOutstanding.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-0.5">{creditReport.byCustomer.length} customer{creditReport.byCustomer.length !== 1 ? "s" : ""} owing</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total Credit Issued</p>
                <p className="text-2xl font-black text-blue-700">Ksh {creditReport.totalIssued.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50 col-span-2 lg:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">Total Collected</p>
                <p className="text-2xl font-black text-green-700">Ksh {creditReport.totalCollected.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Aging of Outstanding Credit</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
              ) : creditReport.totalOutstanding === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No outstanding credit sales</div>
              ) : (
                creditReport.aging.map(a => {
                  const pct = creditReport.totalOutstanding > 0 ? (a.amount / creditReport.totalOutstanding) * 100 : 0
                  const color = a.bucket === "15+ days" ? "bg-red-500" : a.bucket === "8-14 days" ? "bg-amber-400" : "bg-green-400"
                  return (
                    <div key={a.bucket} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{a.bucket}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div className={`h-full ${color} rounded transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-36 text-right shrink-0">
                        Ksh {a.amount.toLocaleString()} <span className="text-gray-400 font-normal">({a.count})</span>
                      </span>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm">Credit Issued vs Outstanding — Last 8 Weeks</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
              ) : creditReport.weekly.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No credit sales recorded yet</div>
              ) : (
                <div className="space-y-3">
                  {creditReport.weekly.map(w => {
                    const maxVal = Math.max(...creditReport.weekly.map(x => x.issued), 1)
                    const issuedPct = (w.issued / maxVal) * 100
                    const outstandingPct = (w.outstanding / maxVal) * 100
                    const weekLabel = new Date(w.week + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" })
                    return (
                      <div key={w.week} className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Week of {weekLabel}</span>
                          <span>Issued: Ksh {w.issued.toLocaleString()} · Outstanding: Ksh {w.outstanding.toLocaleString()}</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded overflow-hidden relative">
                          <div className="h-full bg-blue-300 rounded absolute inset-y-0 left-0" style={{ width: `${issuedPct}%` }} />
                          <div className="h-full bg-red-500 rounded absolute inset-y-0 left-0" style={{ width: `${outstandingPct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-300 inline-block" /> Issued</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Still Outstanding</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm">Outstanding by Customer</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
              ) : creditReport.byCustomer.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No customers with outstanding credit</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Unpaid Sales</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditReport.byCustomer.map((c, i) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.count}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">Ksh {c.outstanding.toLocaleString()}</TableCell>
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