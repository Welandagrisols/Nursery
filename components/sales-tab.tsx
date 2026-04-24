"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddSaleForm } from "@/components/add-sale-form";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoSales } from "@/components/demo-data";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { exportToExcel, formatSalesForExport } from "@/lib/excel-export";
import { Download, Loader2, Lock, ShoppingCart, Search, Calendar, X, Receipt } from "lucide-react";
import { POSModal } from "@/components/pos-modal";
import { ReceiptModal, type ReceiptSale } from "@/components/receipt-modal";
import { cn } from "@/lib/utils";

interface SaleData {
  id: string
  sale_date: string
  quantity: number
  total_amount: number
  inventory_id?: string
  batch_id?: string
  batch_code?: string
  plant_name?: string
  customer_id?: string
  customer_type?: string
  receipt_number?: string
  payment_method?: string
  payment_reference?: string
  notes?: string
  customer?: {
    id?: string
    name: string
    contact: string
  }
}

type QuickFilter = "all" | "today" | "week" | "month" | "custom"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

function startOf(unit: "day" | "week" | "month"): Date {
  const now = new Date()
  if (unit === "day") { now.setHours(0,0,0,0); return now }
  if (unit === "month") { return new Date(now.getFullYear(), now.getMonth(), 1) }
  // week: Monday
  const d = now.getDay()
  const diff = now.getDate() - d + (d === 0 ? -6 : 1)
  return new Date(new Date(now).setDate(diff))
}

export function SalesTab() {
  const [sales, setSales] = useState<SaleData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [posOpen, setPosOpen] = useState(false)
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  // ── Filter state
  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    async function init() {
      if (isDemoMode) { loadDemoSales(); return }
      const exists = await checkTableExists("vnms_sales")
      setTableExists(exists)
      if (!exists) { loadDemoSales(); return }
      fetchSales().catch(() => loadDemoSales())
    }
    init()
  }, [])

  function loadDemoSales() {
    setSales(demoSales)
    setLoading(false)
  }

  async function fetchSales() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("vnms_sales")
        .select("*, customer:vnms_customers(id, name, contact)")
        .order("sale_date", { ascending: false })
      if (error) throw error
      setSales((data || []) as SaleData[])
    } finally {
      setLoading(false)
    }
  }

  // ── Derived: filtered sales
  const filteredSales = useMemo(() => {
    let list = [...sales]

    // Search: customer name, phone/contact, receipt number, plant name
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(s =>
        (s.customer?.name || "").toLowerCase().includes(q) ||
        (s.customer?.contact || "").toLowerCase().includes(q) ||
        (s.receipt_number || "").toLowerCase().includes(q) ||
        (s.plant_name || "").toLowerCase().includes(q) ||
        (s.batch_code || "").toLowerCase().includes(q)
      )
    }

    // Quick date filter
    if (quickFilter === "today") {
      const start = startOf("day")
      list = list.filter(s => new Date(s.sale_date) >= start)
    } else if (quickFilter === "week") {
      const start = startOf("week")
      list = list.filter(s => new Date(s.sale_date) >= start)
    } else if (quickFilter === "month") {
      const start = startOf("month")
      list = list.filter(s => new Date(s.sale_date) >= start)
    } else if (quickFilter === "custom") {
      if (fromDate) list = list.filter(s => s.sale_date >= fromDate)
      if (toDate)   list = list.filter(s => s.sale_date <= toDate)
    }

    return list
  }, [sales, search, quickFilter, fromDate, toDate])

  const totalSales = useMemo(() => filteredSales.reduce((s, x) => s + x.total_amount, 0), [filteredSales])
  const totalSeedlings = useMemo(() => filteredSales.reduce((s, x) => s + x.quantity, 0), [filteredSales])

  const handleExport = async () => {
    try {
      setExporting(true)
      const label = quickFilter === "custom" && (fromDate || toDate)
        ? `${fromDate || "start"}_to_${toDate || "now"}`
        : quickFilter === "all" ? "All" : quickFilter
      const exportData = formatSalesForExport(filteredSales as any)
      exportToExcel(exportData, `Sales_${label}_${new Date().toISOString().split("T")[0]}`)
      toast({ title: "Export done", description: `${exportData.length} records exported` })
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  function openReceipt(sale: SaleData) {
    setReceiptSale({
      id: sale.id,
      sale_date: sale.sale_date,
      quantity: sale.quantity,
      total_amount: sale.total_amount,
      plant_name: sale.plant_name,
      batch_code: sale.batch_code,
      payment_method: sale.payment_method,
      payment_reference: sale.payment_reference,
      receipt_number: sale.receipt_number,
      notes: sale.notes,
      customer: sale.customer,
    })
  }

  const QUICK_CHIPS: { id: QuickFilter; label: string }[] = [
    { id: "all",   label: "All" },
    { id: "today", label: "Today" },
    { id: "week",  label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "custom",label: "Custom" },
  ]

  return (
    <div className="modern-page space-y-6">
      {(isDemoMode || !tableExists) && (
        <DemoModeBanner
          isDemoMode={isDemoMode}
          connectionStatus={isDemoMode ? "demo" : !tableExists ? "connecting" : "connected"}
        />
      )}

      <div className="modern-header">
        <h1 className="modern-title">Sales</h1>
        <p className="modern-subtitle">Track revenue, search receipts and download records</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 tabular-nums">Ksh {totalSales.toLocaleString()}</div>
            {filteredSales.length < sales.length && (
              <p className="text-xs text-muted-foreground mt-1">{filteredSales.length} of {sales.length} sales</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm font-medium">Seedlings Sold</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600 tabular-nums">{totalSeedlings.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm font-medium">Transactions</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600 tabular-nums">{filteredSales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm font-medium">Avg Sale</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 tabular-nums">
              Ksh {filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length).toLocaleString() : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters */}
      <Card className="modern-card">
        <CardContent className="p-4 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-11"
              placeholder="Search by customer name, phone, receipt # or product…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.id}
                onClick={() => setQuickFilter(chip.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
                  quickFilter === chip.id
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Custom date pickers */}
          {quickFilter === "custom" && (
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-9 text-sm w-36"
                />
              </div>
              <span className="text-gray-400 text-sm">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="h-9 text-sm w-36"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => { setFromDate(""); setToDate("") }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Clear dates
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table card */}
      <Card className="modern-card">
        <CardHeader className="p-4 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-base font-bold">
                {filteredSales.length === sales.length
                  ? `${sales.length} Sales Records`
                  : `${filteredSales.length} matching records`}
              </CardTitle>
              {filteredSales.length < sales.length && (
                <p className="text-xs text-gray-400 mt-0.5">Tap any row to view or reprint its receipt</p>
              )}
              {filteredSales.length === sales.length && sales.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">Tap any row to view or reprint its receipt</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={handleExport}
                disabled={exporting || filteredSales.length === 0}
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download {quickFilter !== "all" ? "Filtered" : "All"}
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                disabled={loading || isDemoMode || !tableExists}
                onClick={() => setPosOpen(true)}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> POS Sale
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                    disabled={loading || isDemoMode || !tableExists}
                  >
                    + Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] m-2">
                  <DialogHeader><DialogTitle>Record New Sale</DialogTitle></DialogHeader>
                  <AddSaleForm onSuccess={async () => { await fetchSales(); setDialogOpen(false) }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 mt-3">
          {/* Mobile cards */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Loading sales…</div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-10">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">No sales found{search ? ` for "${search}"` : ""}</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredSales.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => openReceipt(sale)}
                    className="w-full text-left"
                  >
                    <Card className="p-3 border hover:bg-green-50/50 hover:border-green-200 transition-all active:scale-[0.98]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{sale.plant_name || sale.batch_code || "Seedlings"}</p>
                            <p className="text-xs text-gray-500">{sale.customer?.name || "Walk-in"}</p>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <p className="text-sm font-bold text-green-600">Ksh {sale.total_amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{sale.quantity.toLocaleString()} units</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{new Date(sale.sale_date).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}</span>
                          <div className="flex items-center gap-2">
                            {sale.payment_method && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">{sale.payment_method}</span>
                            )}
                            <span className="flex items-center gap-0.5 text-gray-300">
                              <Lock className="h-2.5 w-2.5" /> Locked
                            </span>
                          </div>
                        </div>
                        {sale.receipt_number && (
                          <p className="text-xs text-gray-300 font-mono">{sale.receipt_number}</p>
                        )}
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs px-3">Date</TableHead>
                  <TableHead className="text-xs px-3">Product</TableHead>
                  <TableHead className="text-xs px-3">Qty</TableHead>
                  <TableHead className="text-xs px-3">Amount</TableHead>
                  <TableHead className="text-xs px-3">Customer</TableHead>
                  <TableHead className="text-xs px-3">Payment</TableHead>
                  <TableHead className="text-xs px-3">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading sales…</TableCell></TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-400 text-sm">No sales found{search ? ` for "${search}"` : ""}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map(sale => (
                    <TableRow
                      key={sale.id}
                      className="hover:bg-green-50/50 cursor-pointer transition-colors"
                      onClick={() => openReceipt(sale)}
                    >
                      <TableCell className="text-xs px-3 py-2.5 whitespace-nowrap">
                        {new Date(sale.sale_date).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2.5">
                        <div className="font-semibold">{sale.plant_name || sale.batch_code || "—"}</div>
                        {sale.customer_type && <div className="text-gray-400">{sale.customer_type}</div>}
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2.5">{sale.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-xs px-3 py-2.5 font-bold text-green-700 whitespace-nowrap">
                        Ksh {sale.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2.5">
                        {sale.customer ? (
                          <>
                            <div className="font-medium">{sale.customer.name}</div>
                            <div className="text-gray-400">{sale.customer.contact}</div>
                          </>
                        ) : "Walk-in"}
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-medium",
                          sale.payment_method === "M-Pesa"        ? "bg-green-100 text-green-700" :
                          sale.payment_method === "Credit"         ? "bg-amber-100 text-amber-700" :
                          sale.payment_method === "Bank Transfer"? "bg-blue-100 text-blue-700"  : "bg-gray-100 text-gray-600"
                        )}>
                          {sale.payment_method || "Cash"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2.5">
                        {sale.receipt_number ? (
                          <span className="font-mono text-gray-500">{sale.receipt_number}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-300">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <POSModal open={posOpen} onClose={() => setPosOpen(false)} onSaleComplete={() => { setPosOpen(false); fetchSales() }} />
      <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </div>
  )
}
