"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Database, Package, Users, TrendingUp, Loader2 } from "lucide-react";

// Demo data for when Supabase is not configured
export const demoInventory = [
  {
    id: "1",
    plant_name: "Tomato (Roma)",
    scientific_name: "Solanum lycopersicum",
    category: "Fruiting Vegetables",
    quantity: 200,
    age: "4 weeks",
    date_planted: "2024-05-01",
    status: "Healthy",
    price: 30,
    batch_cost: 3000,
    cost_per_seedling: 15,
    sku: "FRU001",
    section: "A",
    row: "1",
    source: "Own propagation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    plant_name: "Kale (Sukuma Wiki)",
    scientific_name: "Brassica oleracea",
    category: "Leafy Greens",
    quantity: 350,
    age: "3 weeks",
    date_planted: "2024-05-10",
    status: "Healthy",
    price: 15,
    batch_cost: 2100,
    cost_per_seedling: 6,
    sku: "LEA002",
    section: "B",
    row: "2",
    source: "Own propagation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    plant_name: "Capsicum (Green Pepper)",
    scientific_name: "Capsicum annuum",
    category: "Fruiting Vegetables",
    quantity: 150,
    age: "5 weeks",
    date_planted: "2024-04-20",
    status: "Attention",
    price: 40,
    batch_cost: 3000,
    cost_per_seedling: 20,
    sku: "FRU003",
    section: "C",
    row: "1",
    source: "Certified seed supplier",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  // Consumables (no cost per seedling calculation)
  {
    id: "4",
    plant_name: "Organic Fertilizer",
    scientific_name: "[Consumable] Bags",
    category: "Consumable: Fertilizers",
    quantity: 25,
    date_planted: "2024-05-01", // Used as purchase date
    status: "Available",
    price: 850,
    batch_cost: 21250, // Total cost for 25 bags
    cost_per_seedling: null, // Not applicable for consumables
    sku: "CONS001",
    section: "Storage Room A", // Used as storage location
    source: "AgriSupplies Ltd", // Used as supplier
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    plant_name: "Plastic Pots (Medium)",
    scientific_name: "[Consumable] Pieces",
    category: "Consumable: Pots",
    quantity: 200,
    date_planted: "2024-04-15", // Used as purchase date
    status: "Available",
    price: 45,
    batch_cost: 7000, // Total cost for 200 pieces
    cost_per_seedling: null, // Not applicable for consumables
    sku: "CONS002",
    section: "Shed B", // Used as storage location
    source: "Garden Supplies Kenya", // Used as supplier
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "6",
    plant_name: "Potting Soil Mix",
    scientific_name: "[Consumable] Bags",
    category: "Consumable: Soil",
    quantity: 15,
    date_planted: "2024-05-05", // Used as purchase date
    status: "Low Stock",
    price: 550,
    batch_cost: 6750, // Total cost for 15 bags
    cost_per_seedling: null, // Not applicable for consumables
    sku: "CONS003",
    section: "Storage Room A", // Used as storage location
    source: "Local Supplier", // Used as supplier
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
]

export const demoSales = [
  {
    id: "1",
    inventory_id: "1",
    quantity: 5,
    sale_date: "2024-06-08",
    customer_id: "1",
    total_amount: 6000,
    created_at: "2024-06-08T00:00:00Z",
    inventory: { plant_name: "Tomato (Roma)", category: "Fruiting Vegetables", price: 30, cost_per_seedling: 15 },
    customer: { name: "John Doe", contact: "+254712345678" },
  },
  {
    id: "2",
    inventory_id: "2",
    quantity: 50,
    sale_date: "2024-06-07",
    customer_id: "2",
    total_amount: 750,
    created_at: "2024-06-07T00:00:00Z",
    inventory: { plant_name: "Kale (Sukuma Wiki)", category: "Leafy Greens", price: 15, cost_per_seedling: 6 },
    customer: { name: "Jane Smith", contact: "+254723456789" },
  },
]

export const demoCustomers = [
  {
    id: "1",
    name: "John Doe",
    contact: "+254712345678",
    email: "john@example.com",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Jane Smith",
    contact: "+254723456789",
    email: "jane@example.com",
    created_at: "2024-01-15T00:00:00Z",
  },
]

interface DemoDataProps {
  onDataChange: () => void
}

export function DemoData({ onDataChange }: DemoDataProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadDemoData = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode Active",
        description: "Demo data is already loaded in demo mode",
        variant: "default",
      })
      return
    }

    setLoading(true)
    try {
      // Clear existing data first
      await supabase.from("vnms_sales").delete().neq("id", "")
      await supabase.from("vnms_batches").delete().neq("id", "")
      await supabase.from("vnms_customers").delete().neq("id", "")

      // Insert demo customers
      const { error: customersError } = await supabase.from("vnms_customers").insert(demoCustomers as any)
      if (customersError) throw customersError

      // Insert demo inventory
      const { error: inventoryError } = await supabase.from("vnms_batches").insert(demoInventory as any)
      if (inventoryError) throw inventoryError

      // Insert demo sales
      const { error: salesError } = await supabase.from("vnms_sales").insert(demoSales as any)
      if (salesError) throw salesError

      toast({
        title: "Demo data loaded successfully",
        description: "Your nursery now has sample plants, customers, and sales data",
      })

      onDataChange()
    } catch (error) {
      console.error("Error loading demo data:", error)
      toast({
        title: "Error loading demo data",
        description: "Failed to load demo data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Plants & Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{demoInventory.length}</p>
            <p className="text-xs text-muted-foreground">
              Sample vegetable seedlings including tomatoes, kale, and peppers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{demoCustomers.length}</p>
            <p className="text-xs text-muted-foreground">Sample customer records with contact information</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Sales Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{demoSales.length}</p>
            <p className="text-xs text-muted-foreground">Sample sales transactions and revenue data</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Load Demo Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Load sample data to test the system features. This will replace any existing data with demo content
            including:
          </p>

          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Vegetable seedlings (Tomato, Kale, Capsicum)</li>
            <li>• Consumables (fertilizers, pots, soil)</li>
            <li>• Sample customers and sales records</li>
          </ul>

          <div className="pt-4">
            <Button onClick={loadDemoData} disabled={loading || isDemoMode} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Demo Data...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Load Demo Data
                </>
              )}
            </Button>

            {isDemoMode && (
              <p className="text-xs text-muted-foreground mt-2">
                Demo data is already active. Connect to Supabase to load fresh demo data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}