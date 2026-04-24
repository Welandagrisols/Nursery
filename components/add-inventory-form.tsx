"use client";
import type React from "react";
import { useState, useRef } from "react";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

import { notificationService } from "@/lib/notification-service";
import {  } from "@/components/ui/dialog";

interface AddInventoryFormProps {
  onSuccess: () => void
  onClose?: () => void
}

export function AddInventoryForm({ onSuccess, onClose }: AddInventoryFormProps) {
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    plant_name: "",
    scientific_name: "",
    category: "Leafy Greens",
    quantity: "" as string | number,
    age: "",
    date_planted: "",
    status: "Healthy",
    price: "" as string | number,
    batch_cost: "" as string | number,
    sku: "",
    section: "",
    row: "",
    tray: "",
    source: "",
  })

  const costPerSeedling = Number(formData.quantity) > 0 ? Number(formData.batch_cost) / Number(formData.quantity) : 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    if (submittingRef.current || loading) return
    submittingRef.current = true

    console.log("handleSubmit running, formData:", JSON.stringify({
      plant_name: formData.plant_name,
      category: formData.category,
      quantity: formData.quantity,
      isDemoMode,
    }))

    if (isDemoMode) {
      submittingRef.current = false
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable saving",
        variant: "destructive",
      })
      return
    }

    const qty = Number(formData.quantity)
    if (!formData.plant_name?.trim() || !formData.category || qty <= 0) {
      submittingRef.current = false
      toast({
        title: "Missing required fields",
        description: `Check: Name="${formData.plant_name}", Category="${formData.category}", Quantity=${qty}`,
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Starting plant insertion...")

      const finalFormData = { ...formData }

      // Auto-generate SKU if not provided
      if (!finalFormData.sku) {
        const prefix = finalFormData.category.substring(0, 3).toUpperCase()
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        finalFormData.sku = `${prefix}${randomNum}`
      }

      // Auto-generate batch_code (BAT-YYYYMMDD-NNNN)
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const seqNum = String(Math.floor(1000 + Math.random() * 9000))
      const batchCode = `BAT-${dateStr}-${seqNum}`

      // Only insert columns that exist in vnms_batches (from vnms-full-migration.sql)
      const insertData = {
        plant_name: finalFormData.plant_name.trim(),
        category: finalFormData.category,
        quantity: Number(finalFormData.quantity),
        available_stock: Number(finalFormData.quantity),
        price: Number(finalFormData.price),
        batch_cost: Number(finalFormData.batch_cost),
        status: 'Current',
        lifecycle_status: 'received',
        sku: finalFormData.sku,
        batch_code: batchCode,
        section: finalFormData.section?.trim() || null,
        source: finalFormData.source?.trim() || null,
        item_type: "Plant",
        planted_date: finalFormData.date_planted || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Inserting plant data:", insertData)

      const { data, error } = await supabase
        .from("vnms_batches")
        .insert([insertData] as any)
        .select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      // Close dialog immediately so user can't submit again
      if (onClose) onClose()

      const savedQty = Number(finalFormData.quantity)
      const savedCost = Number(finalFormData.batch_cost)
      const cps = savedQty > 0 ? savedCost / savedQty : 0
      toast({
        title: "Batch saved ✓",
        description: `${finalFormData.plant_name} added (${batchCode})${cps > 0 ? ` — Ksh ${cps.toFixed(2)}/seedling` : ""}`,
      })

      // Reset form for next use
      setFormData({
        plant_name: "",
        scientific_name: "",
        category: "Leafy Greens",
        quantity: "",
        age: "",
        date_planted: "",
        status: "Healthy",
        price: "",
        batch_cost: "",
        sku: "",
        section: "",
        row: "",
        tray: "",
        source: "",
      })

      // Refresh inventory list in background
      onSuccess()

      // Fire-and-forget notification
      notificationService.notifyInventoryUpdate(data[0], 'added').catch(() => {})
    } catch (error: any) {
      console.error("Error adding plant:", error)
      toast({
        title: "Error saving batch",
        description: error.message || "Failed to add plant to inventory",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex-1 overflow-y-auto px-1">
        <div className="space-y-4">
          <div className={`grid grid-cols-1 ${isMobile ? "gap-6" : "md:grid-cols-2 gap-4"}`}>
            <div className="space-y-2">
              <Label htmlFor="plant_name">Seedling / Crop Name *</Label>
              <Input id="plant_name" name="plant_name" value={formData.plant_name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scientific_name">Scientific Name</Label>
              <Input
                id="scientific_name"
                name="scientific_name"
                value={formData.scientific_name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leafy Greens">Leafy Greens</SelectItem>
                  <SelectItem value="Fruiting Vegetables">Fruiting Vegetables</SelectItem>
                  <SelectItem value="Root Vegetables">Root Vegetables</SelectItem>
                  <SelectItem value="Brassicas">Brassicas</SelectItem>
                  <SelectItem value="Legumes">Legumes</SelectItem>
                  <SelectItem value="Herbs">Herbs</SelectItem>
                  <SelectItem value="Alliums">Alliums</SelectItem>
                  <SelectItem value="Cucurbits">Cucurbits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Number of Seedlings) *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_cost">Total Batch Cost (Ksh) *</Label>
              <Input
                id="batch_cost"
                name="batch_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.batch_cost}
                onChange={handleChange}
                required
                placeholder="Total cost for this entire batch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Selling Price per Seedling (Ksh) <span className="text-muted-foreground font-normal text-xs">(optional, set later)</span></Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                placeholder="Price you'll sell each seedling for"
              />
            </div>

            {Number(formData.quantity) > 0 && Number(formData.batch_cost) > 0 && (
              <div className="space-y-2 md:col-span-2">
                <div className="p-3 bg-muted rounded-md border">
                  <div className="text-sm font-medium text-muted-foreground">Calculated Cost per Seedling:</div>
                  <div className="text-lg font-bold text-primary">Ksh {costPerSeedling.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    Batch Cost: Ksh {Number(formData.batch_cost).toLocaleString()} ÷ {formData.quantity} seedlings
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" placeholder="e.g. 6 months" value={formData.age} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_planted">Date Planted</Label>
              <Input
                id="date_planted"
                name="date_planted"
                type="date"
                value={formData.date_planted}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Healthy">Healthy</SelectItem>
                  <SelectItem value="Attention">Needs Attention</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Auto-generated if empty)</Label>
              <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Bed</Label>
              <Input
                id="section"
                name="section"
                placeholder="e.g. Bed 1"
                value={formData.section}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="row">Row</Label>
              <Input id="row" name="row" placeholder="e.g. 2" value={formData.row} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tray">Tray</Label>
              <Input
                id="tray"
                name="tray"
                placeholder="e.g. 5"
                value={(formData as any).tray || ""}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                placeholder="e.g. Local nursery"
                value={formData.source}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-white pt-4 mt-4 flex-shrink-0">
        <div className={`flex ${isMobile ? "flex-col gap-3" : "justify-end space-x-2"}`}>
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log("Cancel button clicked")
                onClose()
              }}
              disabled={loading}
              className={isMobile ? "mobile-touch-target w-full" : ""}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              console.log("Add Item button clicked")
              handleSubmit()
            }}
            disabled={loading}
            className={`bg-primary hover:bg-primary/90 text-white ${isMobile ? "mobile-touch-target w-full" : ""}`}
          >
            {loading ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </div>
    </div>
  )
}