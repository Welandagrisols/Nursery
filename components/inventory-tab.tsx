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
import { AddHoneyForm } from "@/components/add-honey-form"
import { EditInventoryForm } from "@/components/edit-inventory-form"
import { useToast } from "@/components/ui/use-toast"
import { demoInventory } from "@/components/demo-data"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { exportToExcel, formatInventoryForExport } from "@/lib/excel-export"
import { Download, Loader2, Plus, Edit, Trash2, Package, FileText, TrendingUp, ShoppingCart, Sprout } from "lucide-react"
import { AddSachetForm } from "@/components/add-sachet-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [addHoneyDialogOpen, setAddHoneyDialogOpen] = useState(false)
  const [addSachetDialogOpen, setAddSachetDialogOpen] = useState(false)
  const [sachets, setSachets] = useState<any[]>([])
  const [sachetsLoading, setSachetsLoading] = useState(false)
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState("all")
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
      throw error
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
      setAddHoneyDialogOpen(false)
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

  const filteredHoneyProducts = inventory
    .filter(item => item.item_type === "Honey" || item.category === "Organic Honey")
    .filter(item => {
      const matchesSearch = !searchTerm || 
        item.plant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })

  const plantCategories = [
    "All Categories",
    ...Array.from(new Set(inventory.filter((item) => !isConsumable(item) && item.item_type !== "Honey" && item.category).map((item) => item.category))),
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

  const honeyCategories = [
    "All Categories",
    ...Array.from(new Set(inventory.filter((item) => item.item_type === "Honey" || item.category === "Organic Honey").map((item) => item.category))),
  ].filter(Boolean)

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const dataToExport = activeTab === "plants" ? filteredPlants : activeTab === "consumables" ? filteredConsumables : filteredHoneyProducts
      const exportData = formatInventoryForExport(dataToExport, activeTab === "consumables")

      const fileName =
        activeTab === "plants"
          ? `Plants_Export_${new Date().toISOString().split("T")[0]}`
          : activeTab === "consumables"
          ? `Consumables_Export_${new Date().toISOString().split("T")[0]}`
          : `Honey_Export_${new Date().toISOString().split("T")[0]}`;

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
          <TabsList className="grid w-full max-w-lg grid-cols-3">
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

            {activeTab === "honey" && (
              <Dialog open={addHoneyDialogOpen} onOpenChange={setAddHoneyDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    disabled={isDemoMode || !tableExists}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Honey
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Honey Product</DialogTitle>
                  </DialogHeader>
                  <AddHoneyForm onSuccess={handleAddSuccess} onClose={() => setAddHoneyDialogOpen(false)} />
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
                placeholder={`Search ${activeTab === "plants" ? "plants" : activeTab === "consumables" ? "consumables" : "honey"}...`}
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
                  {(activeTab === "plants" ? plantCategories : activeTab === "honey" ? honeyCategories : consumableCategories).map((category) => (
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

              {activeTab === "honey" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
         {/* Honey Tab */}
         <TabsContent value="honey" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ShoppingCart className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading Honey Products...</p>
              </div>
            </div>
          ) : filteredHoneyProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Honey Products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== "All Categories"
                  ? "Try adjusting your search or filters"
                  : "Start by adding your first Honey Product"}
              </p>
              <Dialog open={addHoneyDialogOpen} onOpenChange={setAddHoneyDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isDemoMode || !tableExists}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Honey Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add New Honey Product</DialogTitle>
                  </DialogHeader>
                  <AddHoneyForm onSuccess={handleAddSuccess} onClose={() => setAddHoneyDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredHoneyProducts.map((item) => (
                <Card key={item.id} className="transition-all hover:shadow-md bg-orange-50 border-orange-200 h-fit max-w-sm mx-auto w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-xs truncate max-w-[140px]">
                        🍯 Honey
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
                            if (confirm("Are you sure you want to delete this Honey Product?")) {
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

                    {/* Honey Product Image */}
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
                        {item.scientific_name && (
                          <p className="text-xs text-muted-foreground italic truncate">{item.scientific_name}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Qty:</span>
                          <p className="font-medium truncate">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Selling Price ({item.age || item.unit || 'per unit'}):</span>
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
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">Website:</span>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-xs h-5 ${
                                item.ready_for_sale
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }`}
                            >
                              {item.ready_for_sale ? "✅ Listed" : "⏸️ Hidden"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {(item.age || item.section || item.source) && (
                        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                          {item.age && <p className="truncate">Package: {item.age}</p>}
                          {item.section && <p className="truncate">Packaging: {item.section}</p>}
                          {item.row && <p className="truncate">Source Hives: {item.row}</p>}
                        </div>
                      )}

                      {item.description && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
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
    </div>
  )
}