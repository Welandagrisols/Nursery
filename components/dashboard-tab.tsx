"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ShoppingCart, Package, TrendingUp, TrendingDown, Sprout, DollarSign, Activity, Crown, Award, Medal, Users, Calendar } from "lucide-react"
import { demoInventory, demoSales, demoCustomers } from "@/components/demo-data"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts"

const COLORS = ['#4CB76F', '#FF7A29', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1']

export function DashboardTab() {
  const [inventorySummary, setInventorySummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    lowStock: 0,
  })
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    todaySales: 0,
    thisMonthAmount: 0,
    lastMonthAmount: 0,
  })
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [monthlySalesData, setMonthlySalesData] = useState<any[]>([])
  const [bestSellers, setBestSellers] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [categorySales, setCategorySales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stockAlerts, setStockAlerts] = useState<any[]>([])
  const [tablesExist, setTablesExist] = useState({
    inventory: true,
    sales: true,
    customers: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        loadDemoData()
        return
      }

      const inventoryExists = await checkTableExists("vnms_batches")
      const salesExists = await checkTableExists("vnms_sales")
      const customersExists = await checkTableExists("vnms_customers")

      setTablesExist({
        inventory: inventoryExists,
        sales: salesExists,
        customers: customersExists,
      })

      if (!inventoryExists || !salesExists) {
        loadDemoData()
        return
      }

      // Fetch stock alerts
      supabase.from("vnms_stock_alerts").select("*").eq("resolved", false).order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setStockAlerts(data) })
        .catch(() => {})

      fetchDashboardData().catch((error) => {
        console.log("Falling back to demo mode due to:", error.message)
        loadDemoData()
      })
    }

    init()
  }, [])

  function loadDemoData() {
    try {
      setLoading(true)

      const totalItems = demoInventory.length
      let totalQuantity = 0
      let lowStock = 0
      const lowStockThreshold = 20
      const lowStockItemsList: any[] = []

      demoInventory.forEach((item) => {
        totalQuantity += item.quantity
        if (item.quantity < lowStockThreshold) {
          lowStock++
          lowStockItemsList.push(item)
        }
      })

      setInventorySummary({
        totalItems,
        totalQuantity,
        lowStock,
      })

      setLowStockItems(lowStockItemsList)

      const totalSalesCount = demoSales.length
      let totalAmount = 0
      let todaySalesCount = 0
      const today = new Date().toISOString().split("T")[0]

      demoSales.forEach((sale) => {
        totalAmount += sale.total_amount
        if (sale.sale_date === today) {
          todaySalesCount++
        }
      })

      setSalesSummary({
        totalSales: totalSalesCount,
        totalAmount,
        todaySales: todaySalesCount,
        thisMonthAmount: totalAmount * 0.4,
        lastMonthAmount: totalAmount * 0.35,
      })

      setRecentSales(demoSales)

      const demoMonthlyData = generateDemoMonthlyData()
      setMonthlySalesData(demoMonthlyData)

      const demoBestSellers = generateDemoBestSellers()
      setBestSellers(demoBestSellers)

      const demoTopCustomers = generateDemoTopCustomers()
      setTopCustomers(demoTopCustomers)

      const demoCategorySales = generateDemoCategorySales()
      setCategorySales(demoCategorySales)

    } catch (error: any) {
      console.error("Demo data load error:", error)
    } finally {
      setLoading(false)
    }
  }

  function generateDemoMonthlyData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    const data = []
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      data.push({
        month: months[monthIndex],
        revenue: Math.floor(Math.random() * 50000) + 30000,
        sales: Math.floor(Math.random() * 50) + 20,
      })
    }
    return data
  }

  function generateDemoBestSellers() {
    const plants = demoInventory.slice(0, 5).map((plant, index) => ({
      name: plant.plant_name,
      quantity: Math.floor(Math.random() * 100) + 50 - (index * 10),
      revenue: Math.floor(Math.random() * 30000) + 10000 - (index * 2000),
    }))
    return plants.sort((a, b) => b.quantity - a.quantity)
  }

  function generateDemoTopCustomers() {
    return demoCustomers.slice(0, 5).map((customer, index) => ({
      name: customer.name,
      totalSpent: Math.floor(Math.random() * 50000) + 20000 - (index * 5000),
      purchases: Math.floor(Math.random() * 20) + 5 - index,
    })).sort((a, b) => b.totalSpent - a.totalSpent)
  }

  function generateDemoCategorySales() {
    const categories = ['Indigenous Trees', 'Fruit Trees', 'Ornamental Plants', 'Medicinal Plants']
    return categories.map(category => ({
      name: category,
      value: Math.floor(Math.random() * 30000) + 10000,
    }))
  }

  async function fetchDashboardData() {
    try {
      setLoading(true)

      const { data: inventoryData, error: inventoryError } = await supabase.from("vnms_batches").select("*")

      if (inventoryError) {
        console.error("Inventory fetch error:", inventoryError)
        throw inventoryError
      }

      const totalItems = inventoryData?.length || 0
      let totalQuantity = 0
      let lowStock = 0
      const lowStockThreshold = 10
      const lowStockItemsList: any[] = []

      inventoryData?.forEach((item: any) => {
        totalQuantity += item.quantity
        if (item.quantity < lowStockThreshold) {
          lowStock++
          lowStockItemsList.push(item)
        }
      })

      setInventorySummary({
        totalItems,
        totalQuantity,
        lowStock,
      })

      setLowStockItems(lowStockItemsList)

      const { data: salesData, error: salesError } = await supabase
        .from("vnms_sales")
        .select("*")
        .order("sale_date", { ascending: false })

      if (salesError) {
        console.error("Sales fetch error:", salesError)
        throw salesError
      }

      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const totalSalesCount = salesData?.length || 0
      let totalAmount = 0
      let todaySalesCount = 0
      let thisMonthAmount = 0
      let lastMonthAmount = 0
      const today = new Date().toISOString().split("T")[0]

      salesData?.forEach((sale: any) => {
        totalAmount += sale.total_amount
        const saleDate = new Date(sale.sale_date)
        
        if (sale.sale_date.startsWith(today)) {
          todaySalesCount++
        }
        
        if (saleDate >= thisMonthStart) {
          thisMonthAmount += sale.total_amount
        } else if (saleDate >= lastMonthStart && saleDate <= lastMonthEnd) {
          lastMonthAmount += sale.total_amount
        }
      })

      setSalesSummary({
        totalSales: totalSalesCount,
        totalAmount,
        todaySales: todaySalesCount,
        thisMonthAmount,
        lastMonthAmount,
      })

      setRecentSales(salesData?.slice(0, 5) || [])

      const monthlyData = processMonthlyData(salesData || [])
      setMonthlySalesData(monthlyData)

      const bestSellersData = processBestSellers(salesData || [])
      setBestSellers(bestSellersData)

      const categoryData = processCategorySales(salesData || [])
      setCategorySales(categoryData)

      let customersData: any[] = []
      try {
        const customersExists = await checkTableExists("vnms_customers")
        if (customersExists) {
          const { data, error } = await supabase.from("vnms_customers").select("*")
          if (!error && data) {
            customersData = data
          }
        }
      } catch (err) {
        console.log("Could not fetch customers data:", err)
      }
      const topCustomersData = processTopCustomers(salesData || [], customersData)
      setTopCustomers(topCustomersData)

    } catch (error: any) {
      console.error("Dashboard data fetch error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  function processMonthlyData(sales: any[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyMap = new Map<string, { revenue: number; sales: number }>()
    
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      monthlyMap.set(key, { revenue: 0, sales: 0 })
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.sale_date)
      const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`
      if (monthlyMap.has(key)) {
        const current = monthlyMap.get(key)!
        current.revenue += sale.total_amount
        current.sales += 1
      }
    })

    const result: any[] = []
    monthlyMap.forEach((value, key) => {
      const [year, month] = key.split('-').map(Number)
      result.push({
        month: months[month],
        revenue: value.revenue,
        sales: value.sales,
      })
    })

    return result
  }

  function processBestSellers(sales: any[]) {
    const plantMap = new Map<string, { quantity: number; revenue: number }>()

    sales.forEach(sale => {
      const plantName = (sale as any).plant_name || (sale as any).batch_code || 'Unknown'
      const current = plantMap.get(plantName) || { quantity: 0, revenue: 0 }
      current.quantity += sale.quantity
      current.revenue += sale.total_amount
      plantMap.set(plantName, current)
    })

    const result = Array.from(plantMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return result
  }

  function processCategorySales(sales: any[]) {
    const categoryMap = new Map<string, number>()

    sales.forEach(sale => {
      const category = (sale as any).customer_type || 'Other'
      const current = categoryMap.get(category) || 0
      categoryMap.set(category, current + sale.total_amount)
    })

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  function processTopCustomers(sales: any[], customers: any[]) {
    const customerMap = new Map<string, { totalSpent: number; purchases: number; name: string }>()

    sales.forEach(sale => {
      const customerId = sale.customer_id
      
      if (!customerId) {
        return
      }
      
      const customerName = sale.customer?.name || 'Unknown Customer'
      const current = customerMap.get(customerId) || { totalSpent: 0, purchases: 0, name: customerName }
      current.totalSpent += sale.total_amount
      current.purchases += 1
      customerMap.set(customerId, current)
    })

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
  }

  const monthGrowth = salesSummary.lastMonthAmount > 0 
    ? ((salesSummary.thisMonthAmount - salesSummary.lastMonthAmount) / salesSummary.lastMonthAmount * 100).toFixed(1)
    : '0'

  const isGrowthPositive = Number(monthGrowth) >= 0

  const tablesNotExist = !tablesExist.inventory || !tablesExist.sales

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />
    if (index === 1) return <Award className="h-4 w-4 text-gray-400" />
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />
    return <span className="text-sm text-muted-foreground font-medium">#{index + 1}</span>
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-8">
      <h1 className="modern-title">Dashboard</h1>
      {(isDemoMode || tablesNotExist) && <DemoModeBanner isDemoMode={isDemoMode} connectionStatus={isDemoMode ? 'demo' : 'connecting'} />}

      {/* Stock Alerts Banner */}
      {stockAlerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 space-y-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{stockAlerts.length} Critical Stock Alert{stockAlerts.length > 1 ? 's' : ''}</span>
          </div>
          <ul className="space-y-1">
            {stockAlerts.map(alert => (
              <li key={alert.id} className="text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                <span><span className="font-medium">{alert.batch_code || 'Batch'}</span> — {alert.message || `Stock gap detected`}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-600 dark:text-red-400">Resolve alerts in the Operations page to dismiss.</p>
        </div>
      )}

      {/* Stat cards — 2 columns on all mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">Total Plants</p>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">{inventorySummary.totalItems}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <Package className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-muted-foreground truncate">{inventorySummary.totalQuantity.toLocaleString()} sdlngs</span>
                </div>
              </div>
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-2 flex-shrink-0">
                <Sprout className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Ksh {salesSummary.totalAmount.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm flex-wrap">
                  {isGrowthPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 flex-shrink-0" />
                  )}
                  <span className={isGrowthPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {isGrowthPositive ? '+' : ''}{monthGrowth}%
                  </span>
                </div>
              </div>
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">This Month</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Ksh {salesSummary.thisMonthAmount.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="text-muted-foreground truncate">Last: {salesSummary.lastMonthAmount > 0 ? `${(salesSummary.lastMonthAmount/1000).toFixed(0)}k` : '0'}</span>
                </div>
              </div>
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2 flex-shrink-0">
                <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-1">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">Total Sales</p>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">{salesSummary.totalSales}</p>
                <div className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                  <ShoppingCart className="h-3 w-3 flex-shrink-0" />
                  <span className="text-muted-foreground">{salesSummary.todaySales} today</span>
                </div>
              </div>
              <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-2 flex-shrink-0">
                <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            Sales Trend (Last 6 Months)
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Revenue and number of sales over time</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlySalesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CB76F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4CB76F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `Ksh ${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Sales'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4CB76F" 
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue (Ksh)"
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#FF7A29" 
                  strokeWidth={2}
                  dot={{ fill: '#FF7A29' }}
                  name="Number of Sales"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              Best Selling Plants
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Top 5 plants by quantity sold</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : bestSellers.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No sales data yet</div>
            ) : (
              <div className="space-y-3">
                {bestSellers.map((plant, index) => {
                  const maxQuantity = bestSellers[0]?.quantity || 1
                  const percentage = (plant.quantity / maxQuantity) * 100
                  return (
                    <div key={plant.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">{getRankIcon(index)}</div>
                        <span className="font-medium text-sm truncate flex-1">{plant.name}</span>
                        <span className="font-semibold text-xs text-right flex-shrink-0">{plant.quantity} sold</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Top Customers
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Highest spending customers</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : topCustomers.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No customer data yet</div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => {
                  const maxSpent = topCustomers[0]?.totalSpent || 1
                  const percentage = (customer.totalSpent / maxSpent) * 100
                  return (
                    <div key={customer.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">{getRankIcon(index)}</div>
                        <span className="font-medium text-sm truncate flex-1">{customer.name}</span>
                        <span className="font-semibold text-xs text-right flex-shrink-0">Ksh {(customer.totalSpent/1000).toFixed(0)}k</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: COLORS[(index + 2) % COLORS.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              Sales by Category
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revenue breakdown by plant category</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : categorySales.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No category data yet</div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                  {categorySales.map((category, index) => (
                    <div key={category.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs truncate">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Items that need restocking</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sprout className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-sm">All items well stocked!</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium px-3 py-2">Plant</TableHead>
                      <TableHead className="text-xs font-medium px-3 py-2">Qty</TableHead>
                      <TableHead className="text-xs font-medium px-3 py-2">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs px-3 py-2 max-w-[120px] truncate">{item.plant_name}</TableCell>
                        <TableCell className="text-xs px-3 py-2 font-semibold text-red-600">{item.quantity}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge variant="destructive" className="text-xs">Low</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            Recent Sales
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Latest transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No recent sales</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium px-3 py-2">Date</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2">Plant</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2 hidden sm:table-cell">Customer</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2 hidden sm:table-cell">Qty</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.slice(0, 5).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-xs px-3 py-2 whitespace-nowrap">{new Date(sale.sale_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</TableCell>
                      <TableCell className="text-xs px-3 py-2 max-w-[100px] truncate">{(sale as any).plant_name || (sale as any).batch_code || "Unknown"}</TableCell>
                      <TableCell className="text-xs px-3 py-2 hidden sm:table-cell">{(sale as any).customer_type || "Walk-in"}</TableCell>
                      <TableCell className="text-xs px-3 py-2 hidden sm:table-cell">{sale.quantity}</TableCell>
                      <TableCell className="text-xs px-3 py-2 font-semibold text-green-600 whitespace-nowrap">Ksh {sale.total_amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
