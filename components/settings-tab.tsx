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
import { Settings, DollarSign, Lock, Plus, Edit2, Save, X, History, Users, Building2, MapPin, Coins, Upload, Trash2, ImageIcon, Phone, Tag } from "lucide-react"
import { StaffManagement } from "@/components/staff-management"
import { useNursery } from "@/contexts/nursery-context"
import { useRef } from "react"

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
  const [verifyingPin, setVerifyingPin] = useState(false)

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
    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "Wrong PIN", description: "Enter a valid 4-digit owner PIN.", variant: "destructive" }); return
    }
    if (!pendingEdit) return
    const { id, newPrice, tier } = pendingEdit

    setVerifyingPin(true)

    if (isDemoMode) {
      const storedPin = localStorage.getItem("vnms_owner_pin") || "1234"
      setVerifyingPin(false)
      if (pin !== storedPin) {
        toast({ title: "Wrong PIN", description: "Incorrect owner PIN.", variant: "destructive" }); return
      }
      setPinDialog(false)
      setTiers(prev => prev.map(t => t.id === id ? { ...t, price_per_seedling: newPrice } : t))
      setEditingId(null)
      setPendingEdit(null)
      toast({ title: "Price updated", description: `${tier.customer_type} → Ksh ${newPrice.toFixed(2)} per seedling` })
      return
    }

    const { data: isValid, error: verifyError } = await (supabase.rpc("vnms_verify_owner_pin", {
      p_pin: pin,
    }) as any)
    setVerifyingPin(false)

    if (verifyError) {
      toast({ title: "Verification failed", description: verifyError.message, variant: "destructive" }); return
    }
    if (!isValid) {
      toast({ title: "Wrong PIN", description: "Incorrect owner PIN.", variant: "destructive" }); return
    }

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
              onKeyDown={e => { if (e.key === 'Enter' && !verifyingPin) confirmWithPin() }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinDialog(false)} className="flex-1" disabled={verifyingPin}>Cancel</Button>
              <Button onClick={confirmWithPin} className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={verifyingPin}>
                {verifyingPin ? "Checking..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Resize & compress an image file to a small base64 JPEG for localStorage */
async function compressImage(file: File, maxPx = 240, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function NursuryProfileCard() {
  const { toast } = useToast()
  const { nurseryName, currency: ctxCurrency, location: ctxLocation, phone: ctxPhone, tagline: ctxTagline, logoUrl, saveProfile, saveLogo, removeLogo } = useNursery()
  const [name, setName] = useState(nurseryName)
  const [currency, setCurrency] = useState(ctxCurrency)
  const [location, setLocation] = useState(ctxLocation)
  const [phone, setPhone] = useState(ctxPhone)
  const [tagline, setTagline] = useState(ctxTagline)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(nurseryName)
    setCurrency(ctxCurrency)
    setLocation(ctxLocation)
    setPhone(ctxPhone)
    setTagline(ctxTagline)
  }, [nurseryName, ctxCurrency, ctxLocation, ctxPhone, ctxTagline])

  const save = () => {
    saveProfile({
      name: name.trim() || "My Nursery",
      currency: currency.trim() || "Ksh",
      location: location.trim(),
      phone: phone.trim(),
      tagline: tagline.trim(),
    })
    setSaved(true)
    toast({ title: "Profile saved", description: "Contact details now print on every receipt." })
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return toast({ title: "Please select an image file", variant: "destructive" })
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast({ title: "Image too large — max 5 MB", variant: "destructive" })
    }
    setUploadingLogo(true)
    try {
      const compressed = await compressImage(file)
      saveLogo(compressed)
      toast({ title: "Logo saved", description: "It will appear on printed receipts and the price list." })
    } catch {
      toast({ title: "Could not process image", variant: "destructive" })
    } finally {
      setUploadingLogo(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-green-600" /> Nursery Profile
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Name and logo appear on receipts, WhatsApp messages, and the price catalogue.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Nursery Logo</Label>

          {logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl border-2 border-green-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Nursery logo" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm" variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingLogo}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="h-3 w-3" /> Change logo
                </Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={removeLogo}
                  className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? (
                <><div className="h-7 w-7 rounded-full border-2 border-green-400 border-t-transparent animate-spin" /><span className="text-sm">Processing…</span></>
              ) : (
                <><Upload className="h-7 w-7" /><span className="text-sm font-medium">Click to upload logo</span><span className="text-xs">PNG, JPG or SVG · max 5 MB</span></>
              )}
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
          />
          <p className="text-xs text-gray-400">Logo appears on printed receipts and the price list catalogue.</p>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Nursery Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Grace Harvest Seedlings"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" /> Currency</Label>
            <Input
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              placeholder="e.g. Ksh"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Nairobi, Kenya"
            />
          </div>

          {/* Contact & Tagline */}
          <div className="border-t pt-3 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt Footer</p>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone / WhatsApp Number
              </Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +254 712 345 678"
                inputMode="tel"
              />
              <p className="text-xs text-gray-400">Printed below the total on every receipt.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Tagline / Slogan
              </Label>
              <Input
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Quality Seedlings, Healthy Harvests"
                maxLength={80}
              />
              <p className="text-xs text-gray-400">Short slogan shown at the bottom of receipts.</p>
            </div>
          </div>

          <Button onClick={save} className="bg-green-600 hover:bg-green-700 text-white w-full">
            {saved ? "✓ Saved" : "Save Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OwnerPinCard() {
  const { toast } = useToast()
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isConfigured, setIsConfigured] = useState(false)
  const [checkingConfig, setCheckingConfig] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isDemoMode) {
      const stored = localStorage.getItem("vnms_owner_pin")
      setIsConfigured(!!stored)
      setCheckingConfig(false)
      return
    }
    ;(async () => {
      const { data, error } = await (supabase.rpc("vnms_is_owner_pin_configured") as any)
      if (error) {
        toast({ title: "Could not load PIN settings", description: error.message, variant: "destructive" })
      } else {
        setIsConfigured(Boolean(data))
      }
      setCheckingConfig(false)
    })()
  }, [])

  const handleSave = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      return toast({ title: "PIN must be 4 digits", variant: "destructive" })
    }
    if (newPin !== confirmPin) {
      return toast({ title: "PINs don't match", variant: "destructive" })
    }
    setSaving(true)

    if (isDemoMode) {
      if (isConfigured && localStorage.getItem("vnms_owner_pin") !== currentPin) {
        setSaving(false)
        return toast({ title: "Wrong current PIN", variant: "destructive" })
      }
      localStorage.setItem("vnms_owner_pin", newPin)
      setSaving(false)
      setIsConfigured(true)
      setCurrentPin(""); setNewPin(""); setConfirmPin("")
      toast({ title: "Owner PIN updated", description: "PIN saved locally for demo mode." })
      return
    }

    const { data, error } = await (supabase.rpc("vnms_set_owner_pin", {
      p_current_pin: currentPin || null,
      p_new_pin: newPin,
    }) as any)
    setSaving(false)

    if (error) {
      return toast({ title: "PIN update failed", description: error.message, variant: "destructive" })
    }
    if (!data) {
      return toast({ title: "Wrong current PIN", variant: "destructive" })
    }

    setIsConfigured(true)
    setCurrentPin(""); setNewPin(""); setConfirmPin("")
    toast({ title: "Owner PIN updated", description: "PIN checks are now done securely by Supabase." })
  }

  return (
    <Card className={!isConfigured && !checkingConfig ? "border-amber-300" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Owner PIN</CardTitle>
        {!checkingConfig && !isConfigured && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
            Owner PIN is not set yet. Configure a 4-digit PIN to protect pricing changes.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isConfigured && (
          <div className="space-y-1">
            <Label>Current PIN</Label>
            <Input
              type="password" maxLength={4} placeholder="••••"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="font-mono tracking-[0.5em]"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label>New 4-Digit PIN</Label>
          <Input
            type="password" maxLength={4} placeholder="••••"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="font-mono tracking-[0.5em]"
          />
        </div>
        <div className="space-y-1">
          <Label>Confirm New PIN</Label>
          <Input
            type="password" maxLength={4} placeholder="••••"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="font-mono tracking-[0.5em]"
          />
        </div>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white" disabled={saving || checkingConfig}>
          {saving ? "Updating..." : isConfigured ? "Update Owner PIN" : "Set Owner PIN"}
        </Button>
        <p className="text-xs text-muted-foreground">
          The Owner PIN is required to change pricing. PIN validation is done server-side in Supabase.
        </p>
      </CardContent>
    </Card>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="staff" className="flex items-center justify-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3" /> Staff
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center justify-center gap-1 text-xs sm:text-sm">
            <DollarSign className="h-3 w-3" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center justify-center gap-1 text-xs sm:text-sm">
            <Settings className="h-3 w-3" /> General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <StaffManagement />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <PricingSettings />
        </TabsContent>

        <TabsContent value="general" className="mt-4 space-y-4">
          <NursuryProfileCard />
          <OwnerPinCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
