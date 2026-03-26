"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Settings, DollarSign, Lock, Plus, Edit2, Save, X, History, Users } from "lucide-react"
import { StaffManagement } from "@/components/staff-management"

interface PriceTier {
  id: string
  crop_type: string
  customer_type: string
  min_quantity: number
  max_quantity: number
  price_per_seedling: number
  effective_from: string
  created_by?: string
  created_at: string
}

interface PriceChange {
  id: string
  old_price: number
  new_price: number
  crop_type: string
  customer_type: string
  changed_by: string
  changed_at: string
}

const OWNER_PIN = "1234" // In production, store securely in Supabase

const DEFAULT_TIERS = [
  { crop_type: "All", customer_type: "Walk-in",       min_quantity: 1,    max_quantity: 499,    price_per_seedling: 10 },
  { crop_type: "All", customer_type: "Small Wholesale", min_quantity: 500,  max_quantity: 1999,   price_per_seedling: 9 },
  { crop_type: "All", customer_type: "Wholesale",    min_quantity: 2000, max_quantity: 4999,   price_per_seedling: 8 },
  { crop_type: "All", customer_type: "Large Farm",   min_quantity: 5000, max_quantity: 999999, price_per_seedling: 7 },
]

function PricingSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tiers, setTiers] = useState<PriceTier[]>([])
  const [changes, setChanges] = useState<PriceChange[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [pinDialog, setPinDialog] = useState(false)
  const [pin, setPin] = useState("")
  const [pendingEdit, setPendingEdit] = useState<{ id: string; newPrice: number; tier: PriceTier } | null>(null)

  useEffect(() => { fetchPricing() }, [])

  async function fetchPricing() {
    if (isDemoMode) {
      setTiers(DEFAULT_TIERS.map((t, i) => ({
        ...t, id: `demo-${i}`,
        effective_from: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      })))
      setLoading(false); return
    }
    setLoading(true)
    try {
      const [tiersRes, changesRes] = await Promise.all([
        supabase.from("vnms_prices").select("*").order("min_quantity"),
        supabase.from("vnms_price_changes").select("*").order("changed_at", { ascending: false }).limit(20),
      ])
      if (tiersRes.error && tiersRes.error.code !== '42P01') throw tiersRes.error
      setTiers((tiersRes.data as PriceTier[]) || [])
      setChanges((changesRes.data as PriceChange[]) || [])
    } catch (err: any) {
      toast({ title: "Error loading pricing", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function startEdit(tier: PriceTier) {
    setEditingId(tier.id)
    setEditPrice(String(tier.price_per_seedling))
  }

  function initiateUpdate(tier: PriceTier) {
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Invalid price", description: "Enter a valid price.", variant: "destructive" }); return
    }
    setPendingEdit({ id: tier.id, newPrice, tier })
    setPin("")
    setPinDialog(true)
  }

  async function confirmWithPin() {
    if (pin !== OWNER_PIN) {
      toast({ title: "Wrong PIN", description: "Incorrect owner PIN.", variant: "destructive" }); return
    }
    if (!pendingEdit) return
    const { id, newPrice, tier } = pendingEdit
    setPinDialog(false)

    if (!isDemoMode) {
      const { error: upErr } = await (supabase.from("vnms_prices") as any)
        .update({ price_per_seedling: newPrice, updated_at: new Date().toISOString() }).eq("id", id)
      if (upErr) { toast({ title: "Error", description: upErr.message, variant: "destructive" }); return }
      await (supabase.from("vnms_price_changes") as any).insert({
        price_id: id,
        old_price: tier.price_per_seedling,
        new_price: newPrice,
        crop_type: tier.crop_type,
        customer_type: tier.customer_type,
        changed_by: user?.email || "Admin",
      })
    }

    setTiers(prev => prev.map(t => t.id === id ? { ...t, price_per_seedling: newPrice } : t))
    setEditingId(null)
    setPendingEdit(null)
    toast({ title: "Price updated", description: `${tier.customer_type} → Ksh ${newPrice.toFixed(2)} per seedling` })
    fetchPricing()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Pricing Tiers
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">All prices in Kenyan Shillings (Ksh) per seedling. PIN required to update.</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading pricing…</div>
      ) : (
        <div className="space-y-3">
          {tiers.map(tier => (
            <Card key={tier.id}>
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{tier.customer_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {tier.min_quantity.toLocaleString()} – {tier.max_quantity >= 999999 ? "∞" : tier.max_quantity.toLocaleString()} seedlings
                      {tier.crop_type !== "All" && ` · ${tier.crop_type}`}
                    </div>
                  </div>

                  {editingId === tier.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Ksh</span>
                      <Input
                        type="number" step="0.5" min="0"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="w-24 text-center font-semibold"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => initiateUpdate(tier)} className="bg-green-600 hover:bg-green-700 text-white">
                        <Lock className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-green-600">Ksh {tier.price_per_seedling.toFixed(2)}</span>
                      <Button size="sm" variant="outline" onClick={() => startEdit(tier)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {changes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" /> Recent Price Changes
          </h3>
          <div className="space-y-1">
            {changes.map(c => (
              <div key={c.id} className="text-xs text-muted-foreground flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span>{c.customer_type} — Ksh {c.old_price} → <span className="font-semibold text-green-700">Ksh {c.new_price}</span></span>
                <span>{c.changed_by} · {new Date(c.changed_at).toLocaleDateString('en-KE')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIN Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Owner PIN Required</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Enter the owner PIN to confirm this price change.</p>
            <Input
              type="password" placeholder="••••"
              value={pin} onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmWithPin() }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmWithPin} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="modern-header">
        <h1 className="modern-title">Settings</h1>
        <p className="modern-subtitle">Configure pricing, roles, and nursery preferences</p>
      </div>

      <Tabs defaultValue="staff" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="staff" className="flex items-center gap-1">
            <Users className="h-3 w-3" /> Staff
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1">
            <Settings className="h-3 w-3" /> General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <StaffManagement />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <PricingSettings />
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Nursery Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Nursery Name</Label>
                <Input defaultValue="Grace Harvest Seedlings" readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input defaultValue="Kenyan Shillings (Ksh)" readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input defaultValue="Kenya" readOnly className="bg-gray-50" />
              </div>
              <p className="text-xs text-muted-foreground">Contact your administrator to update nursery profile settings.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
