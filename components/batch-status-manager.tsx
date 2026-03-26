"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Package, FileText, Settings, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react"

interface Batch {
  source: string
  count: number
  currentCount: number
  futureCount: number
  samplePlants: string[]
  createdAt: string
  ready_for_sale: boolean
}

export function BatchStatusManager() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchBatches = async () => {
    if (isDemoMode) {
      setBatches([
        {
          source: "Current Nursery Stock",
          count: 9,
          currentCount: 9,
          futureCount: 0,
          samplePlants: ["Nile Tulip", "Waterberry", "Wild Plum"],
          createdAt: "2024-01-15",
          ready_for_sale: true,
        },
        {
          source: "Future Plants List",
          count: 54,
          currentCount: 0,
          futureCount: 54,
          samplePlants: ["Acacia", "Baobab", "Cedar"],
          createdAt: "2024-01-16",
          ready_for_sale: false,
        },
      ])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: inventory, error } = await supabase
        .from("vnms_batches")
        .select("source, plant_name, ready_for_sale, created_at")
        .order("created_at", { ascending: false })
        .returns<Array<{
          source: string | null
          plant_name: string
          ready_for_sale: boolean | null
          created_at: string
        }>>()

      if (error) throw error

      // Group plants by source
      const batchMap = new Map<string, any>()

      inventory?.forEach((plant) => {
        const source = plant.source || "Unknown Source"
        if (!batchMap.has(source)) {
          batchMap.set(source, {
            source,
            plants: [],
            currentCount: 0,
            futureCount: 0,
            createdAt: plant.created_at,
          })
        }

        const batch = batchMap.get(source)
        batch.plants.push(plant.plant_name)

        if (plant.ready_for_sale) {
          batch.currentCount++
        } else {
          batch.futureCount++
        }
      })

      // Convert to array and format
      const batchesArray = Array.from(batchMap.values()).map((batch) => ({
        source: batch.source,
        count: batch.plants.length,
        currentCount: batch.currentCount,
        futureCount: batch.futureCount,
        samplePlants: batch.plants.slice(0, 3),
        createdAt: new Date(batch.createdAt).toLocaleDateString(),
        ready_for_sale: batch.currentCount > batch.futureCount,
      }))

      setBatches(batchesArray)
    } catch (error: any) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error loading batches",
        description: error.message || "Failed to load batch information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateBatchStatus = async (source: string, newStatus: boolean) => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable batch status updates",
        variant: "destructive",
      })
      return
    }

    setUpdating(source)
    try {
      const { error } = await (supabase
        .from("vnms_batches") as any)
        .update({
          ready_for_sale: newStatus,
          age: newStatus ? "6 months" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("source", source)

      if (error) throw error

      toast({
        title: "Batch updated successfully",
        description: `All plants from "${source}" moved to ${newStatus ? "Current Nursery" : "Future Plans"}`,
      })

      await fetchBatches()
    } catch (error: any) {
      console.error("Error updating batch:", error)
      toast({
        title: "Error updating batch",
        description: error.message || "Failed to update batch status",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  const autoAssignBatches = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable auto-assignment",
        variant: "destructive",
      })
      return
    }

    setUpdating("auto-assign")
    try {
      // Find the 9-plant batch (indigenous trees)
      const indigenousBatch = batches.find((batch) => batch.count === 9)

      if (indigenousBatch) {
        // Set 9-plant batch as current
        await (supabase
          .from("vnms_batches") as any)
          .update({
            ready_for_sale: true,
            age: "6 months",
            updated_at: new Date().toISOString(),
          })
          .eq("source", indigenousBatch.source)
      }

      // Set all other batches as future
      const otherBatches = batches.filter((batch) => batch.count !== 9)
      for (const batch of otherBatches) {
        await (supabase
          .from("vnms_batches") as any)
          .update({
            ready_for_sale: false,
            age: null,
            updated_at: new Date().toISOString(),
          })
          .eq("source", batch.source)
      }

      toast({
        title: "Auto-assignment completed",
        description: "9 indigenous plants set as current, others set as future plans",
      })

      await fetchBatches()
    } catch (error: any) {
      console.error("Error in auto-assignment:", error)
      toast({
        title: "Error in auto-assignment",
        description: error.message || "Failed to auto-assign batch statuses",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading batch information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Batch Status Management</h3>
          <p className="text-sm text-muted-foreground">Manage plant batches and their current vs future status</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={autoAssignBatches}
            disabled={updating === "auto-assign" || isDemoMode}
            className="bg-primary hover:bg-primary/90"
          >
            {updating === "auto-assign" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Auto-Assign All Batches
          </Button>
          <Button variant="outline" onClick={fetchBatches} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {batches.map((batch) => {
          const isNinePlantBatch = batch.count === 9
          const isFiftyFourPlantBatch = batch.count === 54
          const isLargeBatch = batch.count >= 20

          let cardColor = "bg-gray-50 border-gray-200"
          let badgeColor = "bg-gray-600"
          let description = "Other batch"

          if (isNinePlantBatch) {
            cardColor = "bg-green-50 border-green-200"
            badgeColor = "bg-green-600"
            description = "Indigenous trees (should be current)"
          } else if (isFiftyFourPlantBatch) {
            cardColor = "bg-blue-50 border-blue-200"
            badgeColor = "bg-blue-600"
            description = "Large collection (should be future)"
          } else if (isLargeBatch) {
            cardColor = "bg-purple-50 border-purple-200"
            badgeColor = "bg-purple-600"
            description = "Large batch (should be future)"
          }

          return (
            <Card key={`${batch.source}-${batch.count}-${batch.ready_for_sale ? 'current' : 'future'}`} className={`${cardColor} border transition-colors`}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={`${badgeColor} text-white text-xs`}>
                      {batch.count} plants
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {batch.ready_for_sale ? "Current" : "Future"}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1 leading-tight">{batch.source}</h4>
                    <p className="text-xs text-gray-600 leading-tight">{description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto leading-tight"
                      disabled={!!batch.ready_for_sale || !!updating}
                      onClick={() => updateBatchStatus(batch.source, true)}
                    >
                      {updating === batch.source ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          <span className="break-words">Moving...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-3 w-3 mr-1" />
                          <span className="break-words">Move to Current</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto leading-tight"
                      disabled={!batch.ready_for_sale || !!updating}
                      onClick={() => updateBatchStatus(batch.source, false)}
                    >
                      {updating === batch.source ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          <span className="break-words">Moving...</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          <span className="break-words">Move to Future</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {batches.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No batches found</h3>
          <p className="text-muted-foreground">Import some plants to see batch information here</p>
        </div>
      )}
    </div>
  )
}