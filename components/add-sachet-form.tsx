"use client";
import { useState } from "react";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const SUPPLIERS = [
  "Simlaw Seeds Kenya",
  "East African Seeds",
  "Kenya Seed Company",
  "Bayer East Africa",
  "Other",
]

const CROP_TYPES = [
  "Tomato", "Kale", "Capsicum", "Spinach", "Carrot", "Broccoli",
  "Cabbage", "Onion", "Leek", "Cucumber", "Courgette", "Pumpkin",
  "Beans", "Peas", "Lettuce", "Beetroot", "Radish", "Herb - Basil",
  "Herb - Coriander", "Herb - Parsley", "Other",
]

interface Props {
  onSuccess: () => void
  onClose?: () => void
}

function generateSachetCode() {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `SCH-${year}-${rand}`
}

export function AddSachetForm({ onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    sachet_code: generateSachetCode(),
    supplier_name: "",
    crop_type: "",
    variety: "",
    seed_count: "",
    cost_paid: "",
    label_germination_pct: "",
    purchase_date: "",
    expiry_date: "",
    storage_location: "",
    invoice_number: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelect = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.supplier_name || !form.crop_type || !form.seed_count) {
      toast({ title: "Missing fields", description: "Supplier, crop type and seed count are required.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const insertData = {
        sachet_code: form.sachet_code,
        supplier_name: form.supplier_name,
        crop_type: form.crop_type,
        variety: form.variety || null,
        seed_count: parseInt(form.seed_count),
        cost_paid: parseFloat(form.cost_paid) || 0,
        label_germination_pct: form.label_germination_pct ? parseFloat(form.label_germination_pct) : null,
        purchase_date: form.purchase_date || null,
        expiry_date: form.expiry_date || null,
        storage_location: form.storage_location || null,
        invoice_number: form.invoice_number || null,
        status: 'available',
        seeds_used: 0,
      }

      if (!isDemoMode) {
        const { error } = await supabase.from("vnms_sachets").insert(insertData as any)
        if (error) throw error
      }

      toast({ title: "Sachet recorded", description: `${form.sachet_code} — ${form.crop_type} from ${form.supplier_name}` })
      onSuccess()
      onClose?.()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-1 md:col-span-2">
          <Label>Sachet Code (auto-generated)</Label>
          <div className="flex gap-2">
            <Input name="sachet_code" value={form.sachet_code} onChange={handleChange} className="font-mono" />
            <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, sachet_code: generateSachetCode() }))}>
              Regenerate
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Supplier *</Label>
          <Select value={form.supplier_name} onValueChange={v => handleSelect("supplier_name", v)}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Crop Type *</Label>
          <Select value={form.crop_type} onValueChange={v => handleSelect("crop_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
            <SelectContent>
              {CROP_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Variety</Label>
          <Input name="variety" placeholder="e.g. Roma, Napoli, F1" value={form.variety} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Seed Count *</Label>
          <Input name="seed_count" type="number" placeholder="e.g. 5000" value={form.seed_count} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Cost Paid (Ksh)</Label>
          <Input name="cost_paid" type="number" step="0.01" placeholder="e.g. 850" value={form.cost_paid} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Label Germination % (from packet)</Label>
          <Input name="label_germination_pct" type="number" step="0.1" max="100" placeholder="e.g. 85" value={form.label_germination_pct} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Purchase Date</Label>
          <Input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Expiry Date</Label>
          <Input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Storage Location</Label>
          <Input name="storage_location" placeholder="e.g. Store Room A, Shelf 2" value={form.storage_location} onChange={handleChange} />
        </div>

        <div className="space-y-1">
          <Label>Invoice Number</Label>
          <Input name="invoice_number" placeholder="e.g. INV-2025-0042" value={form.invoice_number} onChange={handleChange} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
          {loading ? "Saving…" : "Add Sachet"}
        </Button>
      </div>
    </div>
  )
}
