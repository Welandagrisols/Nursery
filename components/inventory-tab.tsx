"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddInventoryForm } from "@/components/add-inventory-form"
import { AddConsumableForm } from "@/components/add-consumable-form"
import { EditInventoryForm } from "@/components/edit-inventory-form"
import { useToast } from "@/components/ui/use-toast"
import { demoInventory } from "@/components/demo-data"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { exportToExcel, formatInventoryForExport } from "@/lib/excel-export"
import { Download, Loader2, Plus, Edit, Trash2, Package, FileText, TrendingUp, ShoppingCart, Sprout, DollarSign, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddSachetForm } from "@/components/add-sachet-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BatchBookingsTab } from "@/components/batch-bookings-tab"
import { CalendarClock } from "lucide-react"

export function InventoryTab() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All Categories")
  const [editItem, setEditItem] = useState<any>(null)
  const [tableExists, setTableExists] = useState(true)
  const [activeTab, setActiveTab] = useState("plants")
  const [addPlantDialogOpen, setAddPlantDialogOpen] = useState(false)
  const [addConsumableDialogOpen, setAddConsumableDialogOpen] = useState(false)
  const [addSachetDialogOpen, setAddSachetDialogOpen] = useState(false)
  const [sachets, setSachets] = useState<any[]>([])
  const [sachetsLoading, setSachetsLoading] = useState(false)
  const [bookedByBatch, setBookedByBatch] = useState<Record<string, number>>({})
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState("all")
  const [costBatch, setCostBatch] = useState<any>(null)
  const [costForm, setCostForm] = useState({ cost_type: "Labour", amount: "", description: "", date: new Date().toISOString().split("T")[0] })
  const [costSaving, setCostSaving] = useState(false)
  const [costHistory, setCostHistory] = useState<any[]>([])
  const [costHistoryLoading, setCostHistoryLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        setInventory(demoInventory)
        setLoading(false)
        return
      }

      const exists = await checkTableExists("vnms_batches")
      setTableExists(exists)

      if (!exists) {
        setInventory(demoInventory)
        setLoading(false)
        return
      }

      fetchSachets()
      fetchBookings()
      fetchInventory().catch((error) => {
        console.log("Falling back to demo mode due to:", error.message)
        toast({
          title: "Connection Issue",
          description: "Unable to connect to database. Using demo data. Check your internet connection and Supabase settings.",
          variant: "destructive",
        })
        setInventory(demoInventory)
        setLoading(false)
      })
    }

    init()
  }, [])

  async function fetchInventory() {
    try {
      setLoading(true)

      // Removed user filtering to show all data (suspended user differentiation)
      const { data, error } = await supabase
        .from("vnms_batches")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setInventory(data || [])
    } catch (error: any) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "Error loading inventory",
        description: error.message || "Failed to load inventory",
        variant: "destructive",
      })
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchSachets() {
    if (isDemoMode) { setSachets([]); return }
    setSachetsLoading(true)
    try {
      const { data, error } = await supabase.from("vnms_sachets").select("*").order("created_at", { ascending: false })
      if (error && error.code !== '42P01') throw error
      setSachets(data || [])
    } catch (err: any) {
      toast({ title: "Sachets error", description: err.message, variant: "destructive" })
    } finally {
      setSachetsLoading(false)
    }
  }

  async function fetchBookings() {
    if (isDemoMode) return
    try {
      const { data, error } = await (supabase.from("vnms_batch_bookings") as any)
        .select("batch_id, plant_name, quantity_booked, status")
        .in("status", ["pending", "confirmed"])
      if (error) return // table may not exist yet — fail silently
      const map: Record<string, number> = {}
      for (const row of (data || [])) {
        if (!row.batch_id) continue
        map[row.batch_id] = (map[row.batch_id] || 0) + (row.quantity_booked || 0)
      }
      setBookedByBatch(map)
    } catch {}
  }

  async function updateLifecycleStatus(id: string, status: string) {
    if (isDemoMode || !tableExists) return
    try {
      const { error } = await (supabase.from("vnms_batches") as any)
        .update({ lifecycle_status: status, stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
      toast({ title: "Status updated", description: `Lifecycle → ${status.replace(/_/g, " ")}` })
      await fetchInventory()
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    }
  }

  async function openCostDialog(item: any) {
    setCostBatch(item)
    setCostForm({ cost_type: "Labour", amount: "", description: "", date: new Date().toISOString().split("T")[0] })
    setCostHistory([])
    setCostHistoryLoading(true)
    try {
      const { data } = await (supabase.from("vnms_costs") as any)
        .select("id, cost_type, amount, description, date")
        .eq("batch_id", item.id)
        .order("date", { ascending: false })
        .limit(10)
      setCostHistory(data || [])
    } catch { /* fail silently */ }
    setCostHistoryLoading(false)
  }

  async function logCost() {
    if (!costBatch || !costForm.amount || Number(costForm.amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" })
      return
    }
    setCostSaving(true)
    try {
      const { error } = await (supabase.from("vnms_costs") as any).insert({
        batch_id: costBatch.id,
        cost_type: costForm.cost_type,
        amount: Number(costForm.amount),
        description: costForm.description || null,
        date: costForm.date,
        recorded_by: user?.email || null,
      })
      if (error) throw error
      toast({ title: "Cost logged", description: `Ksh ${Number(costForm.amount).toLocaleString()} (${costForm.cost_type}) added to ${costBatch.plant_name}` })
      setCostForm(f => ({ ...f, amount: "", description: "" }))
      // Refresh history
      const { data } = await (supabase.from("vnms_costs") as any)
        .select("id, cost_type, amount, description, date")
        .eq("batch_id", costBatch.id)
        .order("date", { ascending: false })
        .limit(10)
      setCostHistory(data || [])
    } catch (err: any) {
      toast({ title: "Failed to log cost", description: err.message, variant: "destructive" })
    }
    setCostSaving(false)
  }

  const COST_TYPES = ["Labour", "Soil", "Trays", "Seeds / Sachets", "Fertilizer", "Pesticide", "Water", "Transport", "Other"]

  const STAGE_STALL_THRESHOLDS: Record<string, number> = {
    received: 7,
    planted: 14,
    germination: 21,
    ready: 14,
    selling: 30,
  }

  const getDaysInStage = (item: any): number => {
    const since = item.stage_updated_at || item.updated_at || item.created_at
    if (!since) return 0
    return Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24))
  }

  const isStagnant = (item: any): boolean => {
    if (isConsumable(item) || !item.lifecycle_status || item.lifecycle_status === "sold_out") return false
    const threshold = STAGE_STALL_THRESHOLDS[item.lifecycle_status]
    if (!threshold) return false
    return getDaysInStage(item) >= threshold
  }

  const LOW_STOCK_THRESHOLD = 20
  const isLowStockSelling = (item: any): boolean =>
    !isConsumable(item) && item.lifecycle_status === "selling" && (item.quantity || 0) > 0 && (item.quantity || 0) <= LOW_STOCK_THRESHOLD

  async function deleteInventoryItem(id: string) {
    if (isDemoMode || !tableExists) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable deleting items",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("vnms_batches").delete().eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      toast({
        title: "Success",
        description: "Item deleted successfully",
      })

      await fetchInventory()
    } catch (error: any) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error deleting item",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleAddSuccess = async () => {
    console.log("handleAddSuccess called")
    try {
      await fetchInventory()
      setAddPlantDialogOpen(false)
      setAddConsumableDialogOpen(false)
    } catch (error) {
      console.error("Error refreshing inventory:", error)
    }
  }

  const isConsumable = (item: any) => {
    return (
      (item.category && item.category.startsWith("Consumable:")) ||
      (item.scientific_name && item.scientific_name.startsWith("[Consumable]")) ||
      item.item_type === "Consumable"
    )
  }

  const getConsumableUnit = (item: any) => {
    if (item.scientific_name && item.scientific_name.startsWith("[Consumable]")) {
      return item.scientific_name.replace("[Consumable] ", "")
    }
    return item.unit || "Pieces"
  }

  const getConsumableCategory = (item: any) => {
    if (item.category && item.category.startsWith("Consumable:")) {
      return item.category.replace("Consumable: ", "")
    }
    return item.category
  }

  // Filter functions
  const filteredPlants = inventory
    .filter((item) => !isConsumable(item))
    .filter((item) => {
      const matchesSearch =
        item.plant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      // Then sort alphabetically by plant name
      return a.plant_name.localeCompare(b.plant_name)
    })

  const filteredConsumables = inventory
    .filter((item) => isConsumable(item))
    .filter((item) => {
      const matchesSearch =
        item.plant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))

      const actualCategory = getConsumableCategory(item)
      const matchesCategory = categoryFilter === "All Categories" || actualCategory === categoryFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })

  const plantCategories = [
    "All Categories",
    ...Array.from(new Set(inventory.filter((item) => !isConsumable(item) && item.category).map((item) => item.category))),
  ].filter(Boolean)

  const consumableCategories = [
    "All Categories",
    ...Array.from(new Set(
      inventory
        .filter((item) => isConsumable(item))
        .map((item) => getConsumableCategory(item))
        .filter(Boolean),
    )),
  ].filter(Boolean)

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const dataToExport = activeTab === "plants" ? filteredPlants : filteredConsumables
      const exportData = formatInventoryForExport(dataToExport, activeTab === "consumables")

      const fileName =
        activeTab === "plants"
          ? `Seedlings_Export_${new Date().toISOString().split("T")[0]}`
          : `Consumables_Export_${new Date().toISOString().split("T")[0]}`

      const success = exportToExcel(exportData, fileName)

      if (success) {
        toast({
          title: "Export Successful",
          description: `${exportData.length} items exported to Excel`,
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

  // Summary calculations
  const currentPlants = inventory.filter((item) => !isConsumable(item))
  const totalConsumables = inventory.filter((item) => isConsumable(item))
  const stats = {
    totalItems: inventory.length,
    totalQuantity: inventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
    lowStock: inventory.filter(item => item.status === "Low Stock").length,
    categories: new Set(inventory.map(item => item.category))
  };

  const stagnantBatches = currentPlants.filter(isStagnant)
  const lowStockSellingBatches = currentPlants.filter(isLowStockSelling)

  const overbookedBatches = currentPlants.filter(item => {
    const booked = bookedByBatch[item.id]
    if (!booked) return false
    const avail = item.available_stock ?? item.quantity ?? 0
    return booked > avail
  })

  const READY_SOON_DAYS = 3
  const isReadySoon = (item: any): boolean => {
    if (isConsumable(item) || !item.expected_ready_date) return false
    if (["ready", "selling", "sold_out"].includes(item.lifecycle_status)) return false
    const daysUntil = Math.ceil((new Date(item.expected_ready_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil <= READY_SOON_DAYS
  }
  const getDaysUntilReady = (item: any): number =>
    Math.ceil((new Date(item.expected_ready_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const readySoonBatches = currentPlants.filter(isReadySoon)


  return (
    <div className="modern-page space-y-8">
      {(isDemoMode || !tableExists) && (
        <DemoModeBanner isDemoMode={isDemoMode} connectionStatus={tableExists ? 'connected' : 'demo'} />
      )}

      {/* Modern Header */}
      <div className="modern-header">
        <h1 className="modern-title">Inventory Management</h1>
        <p className="modern-subtitle">Manage your seedlings, consumables, and nursery inventory</p>
      </div>

      {/* Needs Attention Banner */}
      {(stagnantBatches.length > 0 || lowStockSellingBatches.length > 0 || overbookedBatches.length > 0) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <TrendingUp className="h-4 w-4 rotate-180" />
            Needs Attention
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-800">
            {overbookedBatches.length > 0 && (
              <span className="font-semibold text-red-700">
                🔴 <strong>{overbookedBatches.length}</strong> batch{overbookedBatches.length !== 1 ? "es" : ""} overcommitted — bookings exceed available stock
              </span>
            )}
            {stagnantBatches.length > 0 && (
              <span>
                <strong>{stagnantBatches.length}</strong> batch{stagnantBatches.length !== 1 ? "es" : ""} stuck in their current stage longer than expected
              </span>
            )}
            {lowStockSellingBatches.length > 0 && (
              <span>
                <strong>{lowStockSellingBatches.length}</strong> batch{lowStockSellingBatches.length !== 1 ? "es" : ""} running low on stock while selling
              </span>
            )}
            {readySoonBatches.length > 0 && (
              <span>
                <strong>{readySoonBatches.length}</strong> batch{readySoonBatches.length !== 1 ? "es" : ""} nearing ready date
              </span>
            )}
          </div>
          {overbookedBatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {overbookedBatches.slice(0, 8).map(b => {
                const booked = bookedByBatch[b.id] || 0
                const avail = b.available_stock ?? b.quantity ?? 0
                const shortfall = booked - avail
                return (
                  <Badge key={b.id} variant="outline" className="text-xs bg-red-50 border-red-300 text-red-800">
                    {b.plant_name} · {booked} booked / {avail} avail · short {shortfall}
                  </Badge>
                )
              })}
            </div>
          )}
          {readySoonBatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {readySoonBatches.slice(0, 8).map(b => {
                const days = getDaysUntilReady(b)
                return (
                  <Badge key={b.id} variant="outline" className="text-xs bg-white border-amber-300 text-amber-800">
                    {b.plant_name} · {days <= 0 ? "ready date passed" : days === 0 ? "ready today" : `ready in ${days}d`}
                  </Badge>
                )
              })}
              {readySoonBatches.length > 8 && (
                <Badge variant="outline" className="text-xs bg-white border-amber-300 text-amber-800">
                  +{readySoonBatches.length - 8} more
                </Badge>
              )}
            </div>
          )}
          {stagnantBatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stagnantBatches.slice(0, 8).map(b => (
                <Badge key={b.id} variant="outline" className="text-xs bg-white border-amber-300 text-amber-800">
                  {b.plant_name} · {getDaysInStage(b)}d in {b.lifecycle_status?.replace(/_/g, " ")}
                </Badge>
              ))}
              {stagnantBatches.length > 8 && (
                <Badge variant="outline" className="text-xs bg-white border-amber-300 text-amber-800">
                  +{stagnantBatches.length - 8} more
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Seedlings</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{currentPlants.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Consumables</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{totalConsumables.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{stats.categories.size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="plants" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              Seedlings ({filteredPlants.length})
            </TabsTrigger>
            <TabsTrigger value="consumables" className="flex items-center gap-1 text-xs sm:text-sm">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              Consumables ({filteredConsumables.length})
            </TabsTrigger>
            <TabsTrigger value="sachets" className="flex items-center gap-1 text-xs sm:text-sm" onClick={() => { if (sachets.length === 0) fetchSachets() }}>
              <Sprout className="h-3 w-3 sm:h-4 sm:w-4" />
              Sachets ({sachets.length})
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1 text-xs sm:text-sm">
              <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4" />
              Bookings
            </TabsTrigger>
          </TabsList>

          {/* Action Buttons - Conditionally shown based on active tab */}
          <div className="flex flex-wrap gap-2">
            {activeTab === "plants" && (
              <Dialog open={addPlantDialogOpen} onOpenChange={setAddPlantDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    disabled={isDemoMode || !tableExists}
                    className="btn-mobile"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Seedling
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Seedling Batch</DialogTitle>
                  </DialogHeader>
                  <AddInventoryForm onSuccess={handleAddSuccess} onClose={() => setAddPlantDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "consumables" && (
              <Dialog open={addConsumableDialogOpen} onOpenChange={setAddConsumableDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    disabled={isDemoMode || !tableExists}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Consumable
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Consumable</DialogTitle>
                  </DialogHeader>
                  <AddConsumableForm onSuccess={handleAddSuccess} onClose={() => setAddConsumableDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "sachets" && (
              <Dialog open={addSachetDialogOpen} onOpenChange={setAddSachetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="btn-mobile bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Sachet
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Record Seed Sachet</DialogTitle></DialogHeader>
                  <AddSachetForm onSuccess={() => { setAddSachetDialogOpen(false); fetchSachets() }} onClose={() => setAddSachetDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            )}

            <Button variant="outline" onClick={handleExportToExcel} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </div>
        </div>

        {/* Modern Filters */}
        <div className="modern-filters">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <Input
                placeholder={`Search ${activeTab === "plants" ? "seedlings" : "consumables"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input text-lg font-medium"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 modern-button">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {(activeTab === "plants" ? plantCategories : consumableCategories).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeTab === "plants" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    <SelectItem value="Healthy">Healthy</SelectItem>
                    <SelectItem value="Attention">Needs Attention</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {activeTab === "consumables" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              )}

            </div>
          </div>
        </div>

        {/* Plants Tab */}
        <TabsContent value="plants" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading plants...</p>
              </div>
            </div>
          ) : filteredPlants.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No plants found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== "All Categories"
                  ? "Try adjusting your search or filters"
                  : "Start by adding your first plant"}
              </p>
              <Dialog open={addPlantDialogOpen} onOpenChange={setAddPlantDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isDemoMode || !tableExists}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Plant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add New Plant</DialogTitle>
                  </DialogHeader>
                  <AddInventoryForm onSuccess={handleAddSuccess} onClose={() => setAddPlantDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlants.map((item) => (
                <Card
                  key={item.id}
                  className={`transition-all hover:shadow-md h-fit max-w-sm mx-auto w-full`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="text-xs truncate max-w-[140px] bg-green-600 hover:bg-green-700 text-white">
                          🌱 Plants
                      </Badge>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditItem(item)} 
                          className="h-7 w-7 p-0"
                          disabled={isDemoMode || !tableExists}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this plant?")) {
                              deleteInventoryItem(item.id)
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          disabled={isDemoMode || !tableExists}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Plant Image */}
                    {item.image_url && (
                      <div className="mb-3">
                        <img 
                          src={item.image_url} 
                          alt={item.plant_name}
                          className="w-full h-24 sm:h-32 object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold mobile-text-lg leading-tight line-clamp-2">{item.plant_name}</h3>
                        {item.scientific_name && (
                          <p className="mobile-text-sm text-muted-foreground italic truncate">{item.scientific_name}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 card-mobile">
                        <div>
                          <span className="text-muted-foreground block mobile-text-sm">Qty:</span>
                          <p className="font-medium truncate mobile-text-base">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mobile-text-sm">Price:</span>
                          <p className="font-medium truncate mobile-text-base">Ksh {item.price}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mobile-text-sm">Category:</span>
                          <p className="font-medium mobile-text-sm truncate">{item.category}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">Status:</span>
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 ${
                              item.status === "Healthy"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : item.status === "Attention"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : item.status === "Critical"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        {(isStagnant(item) || isLowStockSelling(item)) && (
                          <div className="col-span-2 flex flex-wrap gap-1 pt-1">
                            {isStagnant(item) && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 text-amber-800 border-amber-300">
                                Stuck {getDaysInStage(item)}d
                              </Badge>
                            )}
                            {isLowStockSelling(item) && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-orange-100 text-orange-800 border-orange-300">
                                Low stock ({item.quantity})
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {(item.age || item.section || item.source) && (
                        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                          {item.age && <p className="truncate">Age: {item.age}</p>}
                          {item.section && (
                            <p className="truncate">
                              Location: Section {item.section}
                              {item.row ? `, Row ${item.row}` : ""}
                            </p>
                          )}
                          {item.source && <p className="truncate">Source: {item.source}</p>}
                        </div>
                      )}

                      {item.description && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        </div>
                      )}

                      {/* Quick Lifecycle Status Buttons */}
                      {!isDemoMode && tableExists && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1.5">Lifecycle:</p>
                          <div className="flex flex-wrap gap-1">
                            {(["received","planted","germination","ready","selling","sold_out"] as const).map((stage) => {
                              const labels: Record<string, string> = { received:"Rcvd", planted:"Planted", germination:"Germ.", ready:"Ready", selling:"Selling", sold_out:"Sold" }
                              const colors: Record<string, string> = { received:"bg-gray-100 text-gray-600 border-gray-300", planted:"bg-blue-100 text-blue-700 border-blue-300", germination:"bg-amber-100 text-amber-700 border-amber-300", ready:"bg-green-100 text-green-700 border-green-300", selling:"bg-emerald-100 text-emerald-700 border-emerald-300", sold_out:"bg-red-100 text-red-600 border-red-300" }
                              const isActive = item.lifecycle_status === stage
                              return (
                                <button
                                  key={stage}
                                  onClick={() => updateLifecycleStatus(item.id, stage)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition-all ${colors[stage]} ${isActive ? "ring-2 ring-offset-1 ring-current font-bold" : "opacity-60 hover:opacity-100"}`}
                                  title={stage.replace(/_/g," ")}
                                >
                                  {labels[stage]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Log Cost Button */}
                      {!isDemoMode && tableExists && (
                        <div className="pt-2 border-t">
                          <button
                            onClick={() => openCostDialog(item)}
                            className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded border border-dashed border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors font-medium"
                          >
                            <DollarSign className="h-3 w-3" /> Log Input Cost
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Consumables Tab */}
        <TabsContent value="consumables" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ShoppingCart className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading consumables...</p>
              </div>
            </div>
          ) : filteredConsumables.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No consumables found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== "All Categories"
                  ? "Try adjusting your search or filters"
                  : "Start by adding your first consumable"}
              </p>
              <Dialog open={addConsumableDialogOpen} onOpenChange={setAddConsumableDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isDemoMode || !tableExists}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Consumable
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add New Consumable</DialogTitle>
                  </DialogHeader>
                  <AddConsumableForm onSuccess={handleAddSuccess} onClose={() => setAddConsumableDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredConsumables.map((item) => (
                <Card key={item.id} className="transition-all hover:shadow-md bg-blue-50 border-blue-200 h-fit max-w-sm mx-auto w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs truncate max-w-[140px]">
                        🛒 {getConsumableCategory(item)}
                      </Badge>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditItem(item)} 
                          className="h-7 w-7 p-0"
                          disabled={isDemoMode || !tableExists}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this consumable?")) {
                              deleteInventoryItem(item.id)
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          disabled={isDemoMode || !tableExists}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Consumable Image */}
                    {item.image_url && (
                      <div className="mb-3">
                        <img 
                          src={item.image_url} 
                          alt={item.plant_name}
                          className="w-full h-24 sm:h-32 object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-base leading-tight line-clamp-2">{item.plant_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">Unit: {getConsumableUnit(item)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Qty:</span>
                          <p className="font-medium truncate">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Price/Unit:</span>
                          <p className="font-medium truncate">Ksh {item.price}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">SKU:</span>
                          <p className="font-medium text-xs truncate">{item.sku}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">Status:</span>
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 ${
                              item.status === "Available"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : item.status === "Low Stock"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>

                      {(item.section || item.source) && (
                        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                          {item.section && <p className="truncate">Storage: {item.section}</p>}
                          {item.source && <p className="truncate">Supplier: {item.source}</p>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-0">
          <BatchBookingsTab
            batches={currentPlants.map((b: any) => ({
              id: b.id,
              plant_name: b.plant_name,
              crop_type: b.crop_type,
              quantity: b.quantity || 0,
              lifecycle_status: b.lifecycle_status || "received",
              expected_ready_date: b.expected_ready_date,
            }))}
            tableExists={tableExists}
          />
        </TabsContent>
        {/* Sachets Tab */}
        <TabsContent value="sachets" className="mt-0">
          {sachetsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading sachets…</div>
          ) : sachets.length === 0 ? (
            <div className="text-center py-16">
              <Sprout className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold mb-1">No sachets recorded yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Record your first seed sachet to start tracking seed-to-sale.</p>
              <Button onClick={() => setAddSachetDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add First Sachet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sachets.map(s => (
                <Card key={s.id} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{s.sachet_code}</p>
                        <CardTitle className="text-base mt-0.5">{s.crop_type}</CardTitle>
                        {s.variety && <p className="text-sm text-muted-foreground">{s.variety}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        s.status === 'available' ? 'bg-green-50 text-green-700 border-green-200' :
                        s.status === 'partially_used' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {s.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplier</span>
                      <span className="font-medium truncate max-w-[60%] text-right">{s.supplier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seeds</span>
                      <span className="font-semibold">{s.seed_count?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Paid</span>
                      <span className="font-medium">Ksh {s.cost_paid?.toLocaleString()}</span>
                    </div>
                    {s.label_germination_pct && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Label Germ.</span>
                        <span className="font-medium">{s.label_germination_pct}%</span>
                      </div>
                    )}
                    {s.expiry_date && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span>Expires</span>
                        <span>{new Date(s.expiry_date).toLocaleDateString('en-KE')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {editItem.plant_name}</DialogTitle>
            </DialogHeader>
            <EditInventoryForm
              item={editItem}
              onSuccess={() => {
                setEditItem(null)
                fetchInventory()
              }}
              onCancel={() => setEditItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Log Cost Dialog */}
      {costBatch && (
        <Dialog open={!!costBatch} onOpenChange={(open) => { if (!open) setCostBatch(null) }}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Log Input Cost
              </DialogTitle>
              <p className="text-sm text-muted-foreground truncate">{costBatch.plant_name} · {costBatch.batch_code || costBatch.sku}</p>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              {/* Cost type */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cost Type</Label>
                <Select value={costForm.cost_type} onValueChange={(v) => setCostForm(f => ({ ...f, cost_type: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount (Ksh)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1500"
                  value={costForm.amount}
                  onChange={(e) => setCostForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Date</Label>
                <Input
                  type="date"
                  value={costForm.date}
                  onChange={(e) => setCostForm(f => ({ ...f, date: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="e.g. 40 bags potting soil at Ksh 350 each"
                  value={costForm.description}
                  onChange={(e) => setCostForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <Button onClick={logCost} disabled={costSaving || !costForm.amount} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {costSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Save Cost Entry
              </Button>
            </div>

            {/* Recent cost history for this batch */}
            <div className="pt-3 border-t mt-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Recent entries for this batch</p>
              {costHistoryLoading ? (
                <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
              ) : costHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No cost entries yet</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {costHistory.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-xs gap-2 bg-gray-50 rounded px-2 py-1.5">
                      <div className="min-w-0">
                        <span className="font-semibold text-amber-700">{c.cost_type}</span>
                        {c.description && <span className="text-muted-foreground ml-1 truncate"> · {c.description}</span>}
                        <p className="text-muted-foreground text-[10px]">{c.date}</p>
                      </div>
                      <span className="font-bold text-red-600 shrink-0">Ksh {Number(c.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}