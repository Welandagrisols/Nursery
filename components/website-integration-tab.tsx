"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Printer, RefreshCw, Search, Leaf, Check } from "lucide-react"

interface Batch {
  id: string
  plant_name: string
  scientific_name?: string
  category?: string
  quantity: number
  price: number
  lifecycle_status?: string
  status?: string
  age?: string
  section?: string
  sku?: string
  description?: string
}

const SELLING_STATUSES = ["selling", "Selling", "ready", "Ready"]
const COMING_SOON_STATUSES = ["germination", "planted", "Planted", "Germination", "received", "Received"]

export function PriceListTab() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchBatches() }, [])

  const fetchBatches = async () => {
    setLoading(true)
    if (isDemoMode) {
      setBatches([
        { id: "1", plant_name: "Tomato (F1 Tylka)", category: "Vegetables", quantity: 800, price: 25, lifecycle_status: "selling", age: "4 weeks" },
        { id: "2", plant_name: "Kale (Sukuma Wiki)", category: "Vegetables", quantity: 1200, price: 15, lifecycle_status: "selling" },
        { id: "3", plant_name: "Capsicum (Yolo Wonder)", category: "Vegetables", quantity: 400, price: 30, lifecycle_status: "ready" },
        { id: "4", plant_name: "Onion (Red Creole)", category: "Vegetables", quantity: 0, price: 20, lifecycle_status: "germination" },
        { id: "5", plant_name: "Broccoli (Green Magic)", category: "Vegetables", quantity: 0, price: 35, lifecycle_status: "planted" },
      ])
      setLoading(false)
      return
    }
    const { data } = await (supabase.from("vnms_batches") as any)
      .select("id, plant_name, scientific_name, category, quantity, price, lifecycle_status, status, age, section, sku, description")
      .order("plant_name", { ascending: true })
    setBatches(data ?? [])
    setLoading(false)
  }

  const available = batches.filter(b =>
    SELLING_STATUSES.includes(b.lifecycle_status ?? "") && b.quantity > 0
  )

  const comingSoon = batches.filter(b =>
    COMING_SOON_STATUSES.includes(b.lifecycle_status ?? "")
  )

  const filteredAvailable = available.filter(b =>
    !search || b.plant_name.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredComingSoon = comingSoon.filter(b =>
    !search || b.plant_name.toLowerCase().includes(search.toLowerCase())
  )

  const buildWhatsAppMessage = () => {
    const date = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })
    let msg = `🌱 *Grace Harvest Seedlings — Price List*\n_Updated: ${date}_\n\n`

    if (filteredAvailable.length > 0) {
      msg += `✅ *AVAILABLE NOW*\n`
      filteredAvailable.forEach(b => {
        msg += `• ${b.plant_name}${b.age ? ` (${b.age})` : ""} — ${b.quantity.toLocaleString()} seedlings @ *Ksh ${b.price.toLocaleString()}* each\n`
      })
    }

    if (filteredComingSoon.length > 0) {
      msg += `\n⏳ *COMING SOON*\n`
      filteredComingSoon.forEach(b => {
        const stage = b.lifecycle_status === "germination" ? "germinating" : b.lifecycle_status === "planted" ? "in nursery beds" : "in stock"
        msg += `• ${b.plant_name} — ${stage}\n`
      })
    }

    msg += `\n📞 _Contact us to place an order or reserve seedlings._`
    return msg
  }

  const copyToWhatsApp = async () => {
    const msg = buildWhatsAppMessage()
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      toast({ title: "Copied!", description: "Price list copied — paste into WhatsApp." })
    } catch {
      toast({ title: "Copy failed", description: "Please select and copy the text manually.", variant: "destructive" })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const lifecycleBadge = (b: Batch) => {
    if (["selling", "Selling"].includes(b.lifecycle_status ?? ""))
      return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Selling</Badge>
    if (["ready", "Ready"].includes(b.lifecycle_status ?? ""))
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Ready</Badge>
    if (["germination", "Germination"].includes(b.lifecycle_status ?? ""))
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Germinating</Badge>
    if (["planted", "Planted"].includes(b.lifecycle_status ?? ""))
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Planted</Badge>
    return <Badge variant="outline" className="text-xs">{b.lifecycle_status ?? "—"}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="modern-header">
        <div>
          <h1 className="modern-title">Price List & Catalogue</h1>
          <p className="modern-subtitle">Share your current stock and prices on WhatsApp or print for customers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchBatches} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={copyToWhatsApp}
            className={`${copied ? "bg-green-600" : "bg-green-600 hover:bg-green-700"} text-white`}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy for WhatsApp"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search crops..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <Leaf className="h-10 w-10 mx-auto mb-3 animate-pulse text-green-400" />
          <p>Loading catalogue...</p>
        </div>
      ) : (
        <div ref={printRef} className="space-y-6">
          {/* Print header — only visible when printing */}
          <div className="hidden print:block text-center mb-4 border-b pb-4">
            <h1 className="text-2xl font-bold text-green-800">Grace Harvest Seedlings</h1>
            <p className="text-gray-500 text-sm">Price List — {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>

          {/* Available Now */}
          {filteredAvailable.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                Available Now ({filteredAvailable.length} varieties)
              </h2>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800">Crop / Seedling</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-green-800">Qty Available</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-green-800">Price (Ksh)</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800 print:hidden">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailable.map((b, i) => (
                      <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{b.plant_name}</p>
                          {b.scientific_name && <p className="text-xs text-gray-400 italic">{b.scientific_name}</p>}
                          {b.age && <p className="text-xs text-gray-500">Size: {b.age}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-700">
                          {b.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700 text-base">
                          {b.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 print:hidden">
                          {lifecycleBadge(b)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Coming Soon */}
          {filteredComingSoon.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-amber-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full inline-block" />
                Coming Soon ({filteredComingSoon.length} varieties in production)
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {filteredComingSoon.map(b => (
                  <Card key={b.id} className="border-amber-200 bg-amber-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{b.plant_name}</p>
                          {b.price > 0 && <p className="text-xs text-gray-500 mt-0.5">Expected Ksh {b.price.toLocaleString()}/seedling</p>}
                        </div>
                        {lifecycleBadge(b)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredAvailable.length === 0 && filteredComingSoon.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Leaf className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No batches found</p>
              <p className="text-sm mt-1">
                {search
                  ? "Try a different search term"
                  : "Batches marked as Ready or Selling will appear here automatically."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp preview */}
      {(filteredAvailable.length > 0 || filteredComingSoon.length > 0) && (
        <details className="border rounded-xl print:hidden">
          <summary className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 rounded-xl">
            Preview WhatsApp message
          </summary>
          <div className="px-4 pb-4">
            <pre className="whitespace-pre-wrap text-xs bg-green-50 border border-green-100 rounded-lg p-3 text-gray-700 font-mono mt-2 leading-relaxed">
              {buildWhatsAppMessage()}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
