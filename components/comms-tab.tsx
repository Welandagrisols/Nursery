"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  MessageCircle, Share2, Link2, Copy, CheckCircle,
  Facebook, Instagram, Phone, Clock, Users, Package,
  ChevronRight, AlertCircle, Check, UserCheck, RefreshCw, Tag
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PriceListTab } from "@/components/website-integration-tab"
import { useNursery } from "@/contexts/nursery-context"

/* ── Message templates ─────────────────────────────────── */
function getTemplates(nurseryName: string) {
  return [
    {
      id: "availability",
      label: "Product Update",
      icon: Package,
      build: (products: string) =>
        `🌱 *${nurseryName.toUpperCase()}*\n\nHello! We currently have fresh seedlings available:\n\n${products}\n\nCall or WhatsApp us to place your order. Bulk orders welcome — delivery available.\n\n_${nurseryName} — Quality Seedlings, Healthy Harvests_ 🌿`,
    },
    {
      id: "promo",
      label: "Special Offer",
      icon: Share2,
      build: (products: string) =>
        `🎉 *SPECIAL OFFER — ${nurseryName.toUpperCase()}*\n\nLimited-time pricing on selected seedlings:\n\n${products}\n\nFirst come, first served! Reserve yours today.\n\n_${nurseryName}_ 📞`,
    },
    {
      id: "ready",
      label: "Order Ready",
      icon: CheckCircle,
      build: (products: string) =>
        `✅ *YOUR ORDER IS READY — ${nurseryName.toUpperCase()}*\n\nDear Valued Customer,\n\nYour seedling order is ready for pickup or delivery:\n\n${products}\n\nKindly confirm your preferred collection time. Thank you for choosing ${nurseryName}! 🌿`,
    },
  ]
}

function buildBatchReadyMessage(nurseryName: string, plantName: string, readyDate: string) {
  const dateLabel = readyDate
    ? new Date(readyDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", weekday: "long" })
    : "soon"
  return `🌱 *${plantName.toUpperCase()} — READY!* \n\n${nurseryName}\n\nGreat news! Your *${plantName}* is ready${readyDate ? ` as of ${dateLabel}` : ""}. Come collect or let us know your preferred delivery time.\n\nQuantities are limited — first come, first served.\n\n_${nurseryName} — Quality Seedlings, Healthy Harvests_ 🌿`
}

function buildFullyBookedMessage(nurseryName: string, plantName: string, readyDate: string) {
  const dateLabel = readyDate
    ? new Date(readyDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", weekday: "long" })
    : "our next planting cycle"
  return `📢 *${plantName.toUpperCase()} — FULLY BOOKED!*\n\n${nurseryName}\n\nOur current batch of *${plantName}* is fully booked. The next available batch will be ready on *${dateLabel}*.\n\nBook now to reserve your seedlings before they run out!\n\n_${nurseryName} — Quality Seedlings, Healthy Harvests_ 🌿`
}

/* ── Social platforms ──────────────────────────────────── */
const SOCIAL_KEYS = [
  { key: "whatsapp",  label: "WhatsApp Business Number", icon: Phone,    placeholder: "e.g. +254712345678" },
  { key: "facebook",  label: "Facebook Page URL",         icon: Facebook, placeholder: "e.g. https://facebook.com/graceharvest" },
  { key: "instagram", label: "Instagram Handle",          icon: Instagram,placeholder: "e.g. @graceharvest" },
  { key: "tiktok",    label: "TikTok Handle",             icon: Share2,   placeholder: "e.g. @graceharvest" },
]

const SOCIAL_KEY = "vnms_social_links"

const CUSTOMER_TYPE_OPTIONS = [
  { value: "all",        label: "All Customers" },
  { value: "Walk-in",    label: "Walk-in / Retail" },
  { value: "Wholesale",  label: "Wholesale Buyers" },
  { value: "Large Farm", label: "Large Farms" },
]

interface Customer {
  id: string
  name: string
  contact: string
  customer_type?: string
}

interface BroadcastLog {
  id: string
  message: string
  customer_type: string
  sent_at: string
  recipient_count?: number
}

/* ── Steps component ───────────────────────────────────── */
function Step({ n, text, sub }: { n: number; text: string; sub?: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <p className="font-semibold text-sm text-gray-800">{text}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function CommsTab() {
  const { toast } = useToast()
  const { nurseryName } = useNursery()
  const TEMPLATES = getTemplates(nurseryName)

  /* ── state ── */
  const [template, setTemplate] = useState("availability")
  const [customerType, setCustomerType] = useState("all")
  const [productList, setProductList] = useState("")
  const [generatedMsg, setGeneratedMsg] = useState("")
  const [msgCopied, setMsgCopied] = useState(false)
  const [numsCopied, setNumsCopied] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [allPlantOptions, setAllPlantOptions] = useState<{ plant_name: string; expected_ready_date?: string | null }[]>([])
  const [logs, setLogs] = useState<BroadcastLog[]>([])

  /* ── batch-audience state ── */
  const [audienceMode, setAudienceMode] = useState<"type" | "batch">("type")
  const [batchAudienceSource, setBatchAudienceSource] = useState<"previous_buyers" | "booked">("previous_buyers")
  const [selectedPlant, setSelectedPlant] = useState("")
  const [batchReadyDate, setBatchReadyDate] = useState("")
  const [batchAudienceCustomers, setBatchAudienceCustomers] = useState<Customer[]>([])
  const [loadingBatchAudience, setLoadingBatchAudience] = useState(false)
  const [batchTemplate, setBatchTemplate] = useState<"batch_ready" | "fully_booked">("batch_ready")

  const [socials, setSocials] = useState<Record<string, string>>({})
  const [savingSocials, setSavingSocials] = useState(false)

  /* ── load data ── */
  useEffect(() => {
    loadSocials()
    loadCustomers()
    loadBatches()
    loadLogs()
  }, [])

  const loadSocials = () => {
    try { const s = localStorage.getItem(SOCIAL_KEY); if (s) setSocials(JSON.parse(s)) } catch {}
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    const { data } = await (supabase.from("vnms_customers") as any)
      .select("id, name, contact, customer_type")
      .order("name")
    setCustomers((data || []).filter((c: Customer) => c.contact?.trim()))
    setLoadingCustomers(false)
  }

  const loadBatches = async () => {
    const { data } = await (supabase.from("vnms_batches") as any)
      .select("plant_name, crop_type, variety, quantity, price")
      .gt("quantity", 0)
      .order("plant_name")
    if (data) setBatches(data)

    const { data: allData } = await (supabase.from("vnms_batches") as any)
      .select("plant_name, expected_ready_date")
      .order("plant_name")
    if (allData) {
      const seen = new Set<string>()
      const options = allData.filter((b: any) => {
        if (!b.plant_name || seen.has(b.plant_name)) return false
        seen.add(b.plant_name)
        return true
      })
      setAllPlantOptions(options)
    }
  }

  const loadBatchAudience = async (plantName: string, source: "previous_buyers" | "booked") => {
    if (!plantName) { setBatchAudienceCustomers([]); return }
    setLoadingBatchAudience(true)
    try {
      if (source === "previous_buyers") {
        const { data } = await (supabase.from("vnms_sales") as any)
          .select("customer_id, vnms_customers(id, name, contact, customer_type)")
          .eq("plant_name", plantName)
          .not("customer_id", "is", null)
        const map = new Map<string, Customer>()
        for (const row of data || []) {
          const c = row.vnms_customers
          if (c?.id && c?.contact?.trim()) map.set(c.id, c)
        }
        setBatchAudienceCustomers(Array.from(map.values()))
      } else {
        const { data } = await (supabase.from("vnms_batch_bookings") as any)
          .select("customer_id, status, vnms_customers(id, name, contact, customer_type)")
          .eq("plant_name", plantName)
          .in("status", ["pending", "confirmed"])
        const map = new Map<string, Customer>()
        for (const row of data || []) {
          const c = row.vnms_customers
          if (c?.id && c?.contact?.trim()) map.set(c.id, c)
        }
        setBatchAudienceCustomers(Array.from(map.values()))
      }
    } catch {
      setBatchAudienceCustomers([])
    } finally {
      setLoadingBatchAudience(false)
    }
  }

  useEffect(() => {
    if (audienceMode === "batch" && selectedPlant) {
      loadBatchAudience(selectedPlant, batchAudienceSource)
    }
  }, [audienceMode, selectedPlant, batchAudienceSource])

  useEffect(() => {
    if (audienceMode === "batch") {
      const match = allPlantOptions.find(p => p.plant_name === selectedPlant)
      setBatchReadyDate(match?.expected_ready_date || "")
    }
  }, [selectedPlant, allPlantOptions, audienceMode])

  const loadLogs = async () => {
    try {
      const { data } = await (supabase.from("vnms_broadcast_messages") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
      if (data) setLogs(data.map((d: any) => ({
        id: d.id,
        message: d.message_body || d.message || "",
        customer_type: d.customer_type || "all",
        sent_at: d.created_at,
        recipient_count: d.recipient_count,
      })))
    } catch {}
  }

  /* ── derived: filtered customers ── */
  const targetCustomers = useMemo(() => {
    if (audienceMode === "batch") return batchAudienceCustomers
    if (customerType === "all") return customers
    return customers.filter(c =>
      (c.customer_type || "Walk-in").toLowerCase() === customerType.toLowerCase()
    )
  }, [customers, customerType, audienceMode, batchAudienceCustomers])

  const phoneNumbers = useMemo(
    () => targetCustomers.map(c => c.contact.trim()).filter(Boolean),
    [targetCustomers]
  )

  /* ── actions ── */
  const autoFillProducts = () => {
    const lines = batches
      .slice(0, 8)
      .map(b => `• ${b.crop_type || b.plant_name}${b.variety ? ` (${b.variety})` : ""} — ${b.quantity?.toLocaleString() ?? "?"} available @ Ksh ${b.price ?? "??"}/seedling`)
      .join("\n")
    setProductList(lines)
  }

  const buildMessage = () => {
    if (audienceMode === "batch") {
      return batchTemplate === "batch_ready"
        ? buildBatchReadyMessage(nurseryName, selectedPlant || "your seedlings", batchReadyDate)
        : buildFullyBookedMessage(nurseryName, selectedPlant || "your seedlings", batchReadyDate)
    }
    const tmpl = TEMPLATES.find(t => t.id === template)!
    const products = productList.trim() || batches
      .slice(0, 5)
      .map(b => `• ${b.crop_type || b.plant_name}${b.variety ? ` (${b.variety})` : ""} — Ksh ${b.price ?? "??"}/seedling`)
      .join("\n")
    return tmpl.build(products || "• Contact us for current availability")
  }

  const handleGenerateMessage = () => {
    setGeneratedMsg(buildMessage())
  }

  const copyMessage = async () => {
    const msg = generatedMsg || buildMessage()
    setGeneratedMsg(msg)
    await navigator.clipboard.writeText(msg)
    setMsgCopied(true)
    setTimeout(() => setMsgCopied(false), 2500)
    toast({ title: "Message copied!", description: "Paste it into WhatsApp Business." })
  }

  const copyNumbers = async () => {
    if (phoneNumbers.length === 0) {
      toast({ title: "No phone numbers", description: "No customers match this filter.", variant: "destructive" })
      return
    }
    await navigator.clipboard.writeText(phoneNumbers.join("\n"))
    setNumsCopied(true)
    setTimeout(() => setNumsCopied(false), 2500)
    toast({ title: `${phoneNumbers.length} numbers copied!`, description: "Paste into WhatsApp Business to add contacts." })
  }

  const logBroadcast = async () => {
    try {
      const label = audienceMode === "batch"
        ? `${selectedPlant || "batch"} · ${batchAudienceSource === "previous_buyers" ? "previous buyers" : "booked/ordered"}`
        : customerType
      await (supabase.from("vnms_broadcast_messages") as any).insert({
        message_body: generatedMsg || buildMessage(),
        customer_type: label,
        sent_by: "Manager",
        recipient_count: phoneNumbers.length,
      })
      loadLogs()
    } catch {}
  }

  const saveSocials = () => {
    setSavingSocials(true)
    localStorage.setItem(SOCIAL_KEY, JSON.stringify(socials))
    setTimeout(() => setSavingSocials(false), 600)
    toast({ title: "Social links saved!" })
  }

  const CUSTOMER_TYPE_LABEL = CUSTOMER_TYPE_OPTIONS.find(o => o.value === customerType)?.label ?? "All Customers"

  return (
    <div className="space-y-6">
      <div className="modern-header">
        <h1 className="modern-title">Communications</h1>
        <p className="modern-subtitle">WhatsApp broadcasts, social media &amp; client updates</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="text-xs gap-1">
            <MessageCircle className="h-3 w-3" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="pricelist" className="text-xs gap-1">
            <Tag className="h-3 w-3" /> Price List
          </TabsTrigger>
          <TabsTrigger value="socials" className="text-xs gap-1">
            <Link2 className="h-3 w-3" /> Socials
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> History
          </TabsTrigger>
        </TabsList>

        {/* ── WHATSAPP BROADCAST ─────────────────────────── */}
        <TabsContent value="whatsapp" className="mt-4 space-y-5">

          {/* How it works banner */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-blue-800">How WhatsApp Broadcast works</p>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                WhatsApp doesn't allow apps to send messages to many people automatically — that would get your number blocked.
                Instead, use <strong>WhatsApp Business broadcast lists</strong> (free, built into the app). You can send to up to 256 people at once and each person receives it as a personal message, not a group chat.
              </p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Follow the 3 steps below ↓</p>
            </CardContent>
          </Card>

          {/* STEP 1 — Choose customers */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                <CardTitle className="text-sm">Choose who to send to</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Audience mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAudienceMode("type")}
                  className={cn(
                    "p-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                    audienceMode === "type"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                  )}
                >
                  By Customer Type
                </button>
                <button
                  onClick={() => setAudienceMode("batch")}
                  className={cn(
                    "p-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                    audienceMode === "batch"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                  )}
                >
                  By Plant / Batch
                </button>
              </div>

              {audienceMode === "type" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CUSTOMER_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCustomerType(opt.value)}
                      className={cn(
                        "p-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                        customerType === opt.value
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plant / Batch</Label>
                    <select
                      value={selectedPlant}
                      onChange={(e) => setSelectedPlant(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                    >
                      <option value="">Select a plant…</option>
                      {allPlantOptions.map(p => (
                        <option key={p.plant_name} value={p.plant_name}>{p.plant_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBatchAudienceSource("previous_buyers")}
                      className={cn(
                        "p-2 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                        batchAudienceSource === "previous_buyers"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                      )}
                    >
                      Previous buyers
                    </button>
                    <button
                      onClick={() => setBatchAudienceSource("booked")}
                      className={cn(
                        "p-2 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                        batchAudienceSource === "booked"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                      )}
                    >
                      Booked / ordered this batch
                    </button>
                  </div>
                  {selectedPlant && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ready date (optional, used in message)</Label>
                      <Input type="date" value={batchReadyDate ? batchReadyDate.slice(0, 10) : ""} onChange={(e) => setBatchReadyDate(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {/* Customer list preview */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {audienceMode === "batch"
                        ? (loadingBatchAudience ? "Loading…" : `${targetCustomers.length} customer${targetCustomers.length !== 1 ? "s" : ""}${selectedPlant ? ` — ${selectedPlant} (${batchAudienceSource === "previous_buyers" ? "previous buyers" : "booked/ordered"})` : ""}`)
                        : (loadingCustomers ? "Loading…" : `${targetCustomers.length} customer${targetCustomers.length !== 1 ? "s" : ""} — ${CUSTOMER_TYPE_LABEL}`)}
                    </span>
                  </div>
                  <button
                    onClick={() => audienceMode === "batch" ? loadBatchAudience(selectedPlant, batchAudienceSource) : loadCustomers()}
                    className="text-gray-400 hover:text-gray-600"
                    title="Refresh"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {targetCustomers.length === 0 && !loadingCustomers && !loadingBatchAudience ? (
                  <p className="text-xs text-gray-400">
                    {audienceMode === "batch"
                      ? (selectedPlant ? "No matching customers found for this plant yet." : "Select a plant above to see matching customers.")
                      : "No customers with phone numbers in this category. Add customers in the Customers tab first."}
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {targetCustomers.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-700 truncate">{c.name}</span>
                        <span className="text-gray-400 font-mono shrink-0 ml-2">{c.contact}</span>
                      </div>
                    ))}
                  </div>
                )}

                {targetCustomers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full gap-2 text-xs mt-1",
                      numsCopied && "border-green-500 text-green-700 bg-green-50"
                    )}
                    onClick={copyNumbers}
                  >
                    {numsCopied
                      ? <><Check className="h-3.5 w-3.5" /> Copied {phoneNumbers.length} numbers!</>
                      : <><Copy className="h-3.5 w-3.5" /> Copy all {phoneNumbers.length} phone numbers</>
                    }
                  </Button>
                )}
              </div>

              {targetCustomers.length > 256 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <strong>Note:</strong> WhatsApp broadcast lists are limited to 256 contacts. You have {targetCustomers.length} customers — split them across multiple broadcast lists.
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2 — Compose message */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                <CardTitle className="text-sm">Compose your message</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {audienceMode === "batch" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => { setBatchTemplate("batch_ready"); setGeneratedMsg("") }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                      batchTemplate === "batch_ready"
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                    )}
                  >
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    <span className="font-semibold text-sm">Batch Ready</span>
                  </button>
                  <button
                    onClick={() => { setBatchTemplate("fully_booked"); setGeneratedMsg("") }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                      batchTemplate === "fully_booked"
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                    )}
                  >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="font-semibold text-sm">Fully Booked</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Template */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {TEMPLATES.map(t => {
                      const Icon = t.icon
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setTemplate(t.id); setGeneratedMsg("") }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                            template === t.id
                              ? "border-green-600 bg-green-50 text-green-700"
                              : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="font-semibold text-sm">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Product list */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Products / Details</Label>
                      {batches.length > 0 && (
                        <button onClick={autoFillProducts} className="text-xs text-green-600 hover:text-green-700 font-semibold underline">
                          Auto-fill from inventory
                        </button>
                      )}
                    </div>
                    <Textarea
                      rows={5}
                      placeholder={"e.g.\n• Tomatoes (F1) — 500 seedlings @ Ksh 10/seedling\n• Kale (Sukuma Wiki) — 1,000 seedlings @ Ksh 8/seedling"}
                      value={productList}
                      onChange={e => { setProductList(e.target.value); setGeneratedMsg("") }}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}

              <Button onClick={handleGenerateMessage} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                <MessageCircle className="h-4 w-4" /> Preview Message
              </Button>

              {/* Message preview */}
              {generatedMsg && (
                <div className="space-y-2">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-200">
                    {generatedMsg}
                  </pre>
                  <Button
                    onClick={copyMessage}
                    className={cn(
                      "w-full gap-2 font-bold",
                      msgCopied
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-[#25D366] hover:bg-[#1ebe5c] text-white"
                    )}
                  >
                    {msgCopied
                      ? <><Check className="h-4 w-4" /> Message copied!</>
                      : <><Copy className="h-4 w-4" /> Copy message</>
                    }
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 3 — Send via WhatsApp Business */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                <CardTitle className="text-sm">Send via WhatsApp Business</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-3">
                <Step
                  n={1}
                  text="Open WhatsApp Business on your phone"
                  sub={"Make sure you're using WhatsApp Business — not the regular WhatsApp app."}
                />
                <Step
                  n={2}
                  text={`Create a Broadcast List with your ${phoneNumbers.length > 0 ? phoneNumbers.length : ""} contacts`}
                  sub={"Tap the 3-dot menu then New Broadcast, then add the phone numbers you copied in Step 1. Recipients must have your number saved to receive the message."}
                />
                <Step
                  n={3}
                  text="Paste and send the message"
                  sub={"Long-press in the message box, tap Paste to insert the message you copied in Step 2, then tap Send."}
                />
                <Step
                  n={4}
                  text="Mark as sent here (optional)"
                  sub={"Tap the button below to log this broadcast in your history."}
                />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50"
                onClick={async () => {
                  await logBroadcast()
                  toast({ title: "Broadcast logged!", description: `Logged as sent to ${phoneNumbers.length} contacts.` })
                }}
              >
                <UserCheck className="h-4 w-4" /> Mark as sent ({phoneNumbers.length} recipients)
              </Button>

              <div className="text-center">
                <a
                  href={typeof window !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent)
                    ? "whatsapp://"
                    : "https://web.whatsapp.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#25D366] font-semibold hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  {typeof window !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent)
                    ? "Open WhatsApp App"
                    : "Open WhatsApp Web"}
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SOCIAL LINKS ───────────────────────────────── */}
        <TabsContent value="socials" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Nursery Social Media</CardTitle>
              <p className="text-sm text-gray-500">Save your contact details here so they appear automatically in messages.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {SOCIAL_KEYS.map(s => {
                const Icon = s.icon
                return (
                  <div key={s.key} className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" /> {s.label}
                    </Label>
                    <Input
                      placeholder={s.placeholder}
                      value={socials[s.key] ?? ""}
                      onChange={e => setSocials(prev => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </div>
                )
              })}
              <Button onClick={saveSocials} className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={savingSocials}>
                {savingSocials ? "Saved!" : "Save Links"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Open</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {socials.whatsapp && (
                <a href={`https://wa.me/${socials.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 justify-center p-3 bg-[#25D366] text-white rounded-xl font-semibold text-sm">
                  <Phone className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 justify-center p-3 bg-blue-600 text-white rounded-xl font-semibold text-sm">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              )}
              {socials.instagram && (
                <a href={`https://instagram.com/${socials.instagram.replace("@","")}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 justify-center p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORY ────────────────────────────────────── */}
        <TabsContent value="pricelist" className="mt-4">
          <PriceListTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-10">
                <Clock className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm font-medium">No broadcasts logged yet</p>
                <p className="text-gray-400 text-xs mt-1">After sending a broadcast, tap "Mark as sent" to record it here.</p>
              </CardContent>
            </Card>
          ) : (
            logs.map(log => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{log.customer_type}</Badge>
                      {log.recipient_count != null && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {log.recipient_count} recipients
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(log.sent_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-600 font-sans leading-relaxed line-clamp-4">
                    {log.message}
                  </pre>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
