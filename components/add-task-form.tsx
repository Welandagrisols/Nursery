"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Calculator } from "lucide-react"

interface ConsumableUsage {
  id: string
  consumable_sku: string
  consumable_name: string
  quantity_used: number
  unit: string
  unit_cost: number
  total_cost: number
}

interface AddTaskFormProps {
  onSuccess: () => void
}

export function AddTaskForm({ onSuccess }: AddTaskFormProps) {
  const [formData, setFormData] = useState({
    task_name: "",
    task_type: "Watering",
    custom_task_type: "",
    description: "",
    task_date: new Date().toISOString().split("T")[0],
    batch_sku: "",
    labor_hours: "",
    labor_rate: "",
    labor_cost: "",
    status: "Completed",
    assigned_to: "",
  })

  const [consumables, setConsumables] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [consumableUsages, setConsumableUsages] = useState<ConsumableUsage[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchConsumablesAndBatches()
  }, [])

  useEffect(() => {
    const hours = parseFloat(formData.labor_hours) || 0
    const rate = parseFloat(formData.labor_rate) || 0
    const laborCost = hours * rate
    setFormData((prev) => ({ ...prev, labor_cost: laborCost.toString() }))
  }, [formData.labor_hours, formData.labor_rate])

  async function fetchConsumablesAndBatches() {
    try {
      const { data: consumableData, error: consumableError } = await supabase
        .from("vnms_batches")
        .select("sku, plant_name, price")
        .like("category", "Consumable:%")

      if (consumableError) {
        console.error("Error fetching consumables:", consumableError)
      }

      const { data: batchData, error: batchError } = await supabase
        .from("vnms_batches")
        .select("sku, plant_name")
        .not("category", "like", "Consumable:%")

      if (batchError) {
        console.error("Error fetching batches:", batchError)
      }

      setConsumables(consumableData || [])
      setBatches(batchData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const addConsumableUsage = () => {
    setConsumableUsages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        consumable_sku: "",
        consumable_name: "",
        quantity_used: 0,
        unit: "",
        unit_cost: 0,
        total_cost: 0,
      },
    ])
  }

  const removeConsumableUsage = (id: string) => {
    setConsumableUsages((prev) => prev.filter((usage) => usage.id !== id))
  }

  const updateConsumableUsage = (id: string, field: string, value: any) => {
    setConsumableUsages((prev) =>
      prev.map((usage) => {
        if (usage.id === id) {
          const updatedUsage = { ...usage, [field]: value }

          if (field === "consumable_sku") {
            const consumable = consumables.find((c) => c.sku === value)
            if (consumable) {
              updatedUsage.consumable_name = consumable.plant_name
              updatedUsage.unit_cost = consumable.price
              updatedUsage.unit = "Pieces"
            }
          }

          if (field === "quantity_used" || field === "unit_cost") {
            updatedUsage.total_cost = updatedUsage.quantity_used * updatedUsage.unit_cost
          }

          return updatedUsage
        }
        return usage
      })
    )
  }

  const unitOptions = [
    "Pieces",
    "Kilograms",
    "Grams",
    "Tonnes",
    "Liters",
    "Milliliters",
    "Meters",
    "Square Meters",
    "Cubic Meters",
    "Hours",
    "Days",
    "Packets",
    "Boxes",
    "Bottles",
    "Bags",
    "Sachets"
  ]

  const calculateTotalConsumablesCost = () => {
    return consumableUsages.reduce((sum, usage) => sum + usage.total_cost, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Task form handleSubmit called")

    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable adding tasks",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const laborCost = parseFloat(formData.labor_cost) || 0
      const consumablesCost = calculateTotalConsumablesCost()
      const totalCost = laborCost + consumablesCost
      let createdTaskId: string | null = null

      console.log("Inserting task...")
      const { data: taskData, error: taskError } = await supabase
        .from("vnms_staff_tasks")
        .insert({
          task_name: formData.task_name,
          task_type: formData.task_type === "Other" ? formData.custom_task_type : formData.task_type,
          description: formData.description,
          task_date: formData.task_date,
          batch_sku: formData.batch_sku || null,
          labor_cost: laborCost,
          labor_hours: parseFloat(formData.labor_hours) || null,
          labor_rate: parseFloat(formData.labor_rate) || null,
          consumables_cost: consumablesCost,
          total_cost: totalCost,
          status: formData.status,
          assigned_to: formData.assigned_to,
        } as any)
        .select()
        .single()

      if (taskError) {
        console.error("Task insert error:", taskError)
        throw taskError
      }

      console.log("Task added:", taskData)
      createdTaskId = (taskData as any).id || null

      if (consumableUsages.length > 0 && taskData) {
        const usageInserts = consumableUsages
          .filter((usage) => usage.consumable_sku && usage.quantity_used > 0)
          .map((usage) => ({
            task_id: (taskData as any).id,
            consumable_sku: usage.consumable_sku,
            consumable_name: usage.consumable_name,
            quantity_used: usage.quantity_used,
            unit: usage.unit,
            unit_cost: usage.unit_cost,
          }))

        if (usageInserts.length > 0) {
          const { error: usageError } = await supabase.from("vnms_task_consumables").insert(usageInserts as any)
          if (usageError) {
            console.error("Consumables insert error:", usageError)
            if (createdTaskId) {
              await (supabase.from("vnms_staff_tasks") as any).delete().eq("id", createdTaskId)
            }
            throw usageError
          }
        }
      }

      toast({
        title: "Success",
        description: "Task added successfully!",
      })

      setFormData({
        task_name: "",
        task_type: "Watering",
        custom_task_type: "",
        description: "",
        task_date: new Date().toISOString().split("T")[0],
        batch_sku: "",
        labor_hours: "",
        labor_rate: "",
        labor_cost: "",
        status: "Completed",
        assigned_to: "",
      })

      setConsumableUsages([])

      onSuccess()
    } catch (error: any) {
      console.error("Error adding task:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add task",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px]">
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <form id="add-task-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task_name">Task Name *</Label>
              <Input
                id="task_name"
                name="task_name"
                value={formData.task_name}
                onChange={handleChange}
                placeholder="e.g., Watering Mango Seedlings"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type *</Label>
              <Select value={formData.task_type} onValueChange={(value) => setFormData((prev) => ({ ...prev, task_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Watering">Watering</SelectItem>
                  <SelectItem value="Fertilizing">Fertilizing</SelectItem>
                  <SelectItem value="Pruning">Pruning</SelectItem>
                  <SelectItem value="Seeding">Seeding</SelectItem>
                  <SelectItem value="Transplanting">Transplanting</SelectItem>
                  <SelectItem value="Pest Control">Pest Control</SelectItem>
                  <SelectItem value="Disease Treatment">Disease Treatment</SelectItem>
                  <SelectItem value="Weeding">Weeding</SelectItem>
                  <SelectItem value="Harvesting">Harvesting</SelectItem>
                  <SelectItem value="Mulching">Mulching</SelectItem>
                  <SelectItem value="Thinning">Thinning</SelectItem>
                  <SelectItem value="Potting / Re-potting">Potting / Re-potting</SelectItem>
                  <SelectItem value="Soil Preparation">Soil Preparation</SelectItem>
                  <SelectItem value="Irrigation Setup">Irrigation Setup</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.task_type === "Other" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="custom_task_type">Custom Task Type *</Label>
                <Input
                  id="custom_task_type"
                  name="custom_task_type"
                  value={formData.custom_task_type || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, custom_task_type: e.target.value }))}
                  placeholder="Enter custom task type"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="task_date">Task Date *</Label>
              <Input
                id="task_date"
                name="task_date"
                type="date"
                value={formData.task_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_sku">Batch SKU</Label>
              <Select value={formData.batch_sku || "none"} onValueChange={(value) => setFormData((prev) => ({ ...prev, batch_sku: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific batch</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.sku} value={batch.sku}>
                      {batch.sku} - {batch.plant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Input
                id="assigned_to"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                placeholder="Person responsible"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Task details and notes"
              rows={2}
            />
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Labor Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="labor_hours" className="text-sm">Labor Hours</Label>
                  <Input
                    id="labor_hours"
                    name="labor_hours"
                    type="number"
                    step="0.5"
                    value={formData.labor_hours}
                    onChange={handleChange}
                    placeholder="0"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="labor_rate" className="text-sm">Rate/Hour (Ksh)</Label>
                  <Input
                    id="labor_rate"
                    name="labor_rate"
                    type="number"
                    step="0.01"
                    value={formData.labor_rate}
                    onChange={handleChange}
                    placeholder="0"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="labor_cost" className="text-sm">Total (Ksh)</Label>
                  <Input
                    id="labor_cost"
                    name="labor_cost"
                    type="number"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={handleChange}
                    placeholder="Auto-calculated"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Consumables Used</span>
                <Button type="button" onClick={addConsumableUsage} size="sm" variant="outline" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {consumableUsages.map((usage, index) => (
                <div key={usage.id} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    <Button
                      type="button"
                      onClick={() => removeConsumableUsage(usage.id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Consumable</Label>
                    <Select
                      value={usage.consumable_sku}
                      onValueChange={(value) => updateConsumableUsage(usage.id, "consumable_sku", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select consumable" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumables.map((consumable) => (
                          <SelectItem key={consumable.sku} value={consumable.sku}>
                            {consumable.plant_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usage.quantity_used || ""}
                        onChange={(e) => updateConsumableUsage(usage.id, "quantity_used", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm">Unit</Label>
                      <Select
                        value={usage.unit}
                        onValueChange={(value) => updateConsumableUsage(usage.id, "unit", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Unit Cost (Ksh)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usage.unit_cost || ""}
                        onChange={(e) => updateConsumableUsage(usage.id, "unit_cost", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm">Total</Label>
                      <div className="flex items-center h-9 px-3 bg-background border rounded-md">
                        <span className="text-sm font-medium">Ksh {usage.total_cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {consumableUsages.length === 0 && (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  No consumables added. Click "Add" to track materials used.
                </div>
              )}

              {consumableUsages.length > 0 && (
                <div className="flex justify-end pt-2">
                  <Badge variant="secondary" className="text-sm">
                    Total: Ksh {calculateTotalConsumablesCost().toLocaleString()}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <div className="flex justify-between items-center text-base font-semibold">
                <span>Total Task Cost:</span>
                <span className="text-primary">
                  Ksh {((parseFloat(formData.labor_cost) || 0) + calculateTotalConsumablesCost()).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      <div className="border-t border-border bg-background pt-4 mt-2">
        <Button 
          type="submit" 
          form="add-task-form"
          disabled={loading} 
          className="w-full bg-accent hover:bg-accent/90 text-white"
        >
          {loading ? "Adding Task..." : "Add Task"}
        </Button>
      </div>
    </div>
  )
}
