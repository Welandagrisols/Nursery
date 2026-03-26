"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  ChevronDown, ChevronRight, MapPin, Search, Layers,
  Grid3X3, Package, Plus, X, RefreshCw, Info, Sprout,
  CheckCircle2, Calendar, TrendingUp, Truck, Leaf, Clock
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────

interface Bed { id: string; bed_number: number; bed_name: string; description?: string }
interface Row { id: string; bed_id: string; row_number: number; row_name: string; tray_count: number }
interface Tray {
  id: string; row_id: string; bed_id: string; tray_number: number
  tray_name?: string; capacity: number
  status: 'empty' | 'planted' | 'germinating' | 'ready' | 'harvested'
}
interface Assignment {
  id: string; tray_id: string; seedling_count: number; assigned_date: string
  notes?: string; assigned_by?: string
  batch?: RichBatch
}
interface RichBatch {
  id: string; plant_name: string; category: string; sku: string
  lifecycle_status?: string; batch_code?: string; crop_type?: string
  variety?: string; quantity: number; status: string
  planted_date?: string; expected_ready_date?: string
  price?: number; batch_cost?: number; available_stock?: number
  supplier?: string
}
interface Batch {
  id: string; plant_name: string; crop_type?: string; batch_code?: string
  lifecycle_status?: string; sku: string
}

// ─── Helpers ──────────────────────────────────────────────

const TRAY_STYLES: Record<string, {
  bg: string; border: string; text: string; label: string; dot: string
  tileBg: string; tileText: string; badge: string
}> = {
  empty:       { bg:"bg-gray-50",   border:"border-dashed border-gray-300", text:"text-gray-400",   label:"Empty",       dot:"bg-gray-300",  tileBg:"bg-gray-100",   tileText:"text-gray-400",   badge:"bg-gray-100 text-gray-500 border-gray-300" },
  planted:     { bg:"bg-blue-50",   border:"border-blue-300",               text:"text-blue-700",   label:"Planted",     dot:"bg-blue-500",  tileBg:"bg-blue-100",   tileText:"text-blue-800",   badge:"bg-blue-100 text-blue-700 border-blue-300" },
  germinating: { bg:"bg-amber-50",  border:"border-amber-300",              text:"text-amber-700",  label:"Germinating", dot:"bg-amber-400", tileBg:"bg-amber-100",  tileText:"text-amber-800",  badge:"bg-amber-100 text-amber-700 border-amber-300" },
  ready:       { bg:"bg-green-50",  border:"border-green-300",              text:"text-green-700",  label:"Ready ✓",     dot:"bg-green-500", tileBg:"bg-green-100",  tileText:"text-green-800",  badge:"bg-green-100 text-green-700 border-green-300" },
  harvested:   { bg:"bg-purple-50", border:"border-purple-300",             text:"text-purple-700", label:"Harvested",   dot:"bg-purple-400",tileBg:"bg-purple-100", tileText:"text-purple-800", badge:"bg-purple-100 text-purple-700 border-purple-300" },
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Demo data ─────────────────────────────────────────────

const DEMO_BEDS: Bed[] = [
  { id: "b1", bed_number: 1, bed_name: "Bed A", description: "Tomatoes & Peppers" },
  { id: "b2", bed_number: 2, bed_name: "Bed B", description: "Leafy Greens & Brassicas" },
]
const DEMO_ROWS: Row[] = [
  { id: "r1", bed_id: "b1", row_number: 1, row_name: "Row 1", tray_count: 8 },
  { id: "r2", bed_id: "b1", row_number: 2, row_name: "Row 2", tray_count: 8 },
  { id: "r3", bed_id: "b2", row_number: 1, row_name: "Row 1", tray_count: 6 },
  { id: "r4", bed_id: "b2", row_number: 2, row_name: "Row 2", tray_count: 5 },
]
const DEMO_TRAYS: Tray[] = [
  { id:"t1",  row_id:"r1", bed_id:"b1", tray_number:1, capacity:200, status:"ready" },
  { id:"t2",  row_id:"r1", bed_id:"b1", tray_number:2, capacity:200, status:"ready" },
  { id:"t3",  row_id:"r1", bed_id:"b1", tray_number:3, capacity:200, status:"germinating" },
  { id:"t4",  row_id:"r1", bed_id:"b1", tray_number:4, capacity:200, status:"planted" },
  { id:"t5",  row_id:"r1", bed_id:"b1", tray_number:5, capacity:200, status:"empty" },
  { id:"t6",  row_id:"r1", bed_id:"b1", tray_number:6, capacity:200, status:"empty" },
  { id:"t7",  row_id:"r1", bed_id:"b1", tray_number:7, capacity:200, status:"empty" },
  { id:"t8",  row_id:"r1", bed_id:"b1", tray_number:8, capacity:200, status:"empty" },
  { id:"t9",  row_id:"r2", bed_id:"b1", tray_number:1, capacity:200, status:"planted" },
  { id:"t10", row_id:"r2", bed_id:"b1", tray_number:2, capacity:200, status:"planted" },
  { id:"t11", row_id:"r2", bed_id:"b1", tray_number:3, capacity:200, status:"germinating" },
  { id:"t12", row_id:"r2", bed_id:"b1", tray_number:4, capacity:200, status:"empty" },
  { id:"t13", row_id:"r2", bed_id:"b1", tray_number:5, capacity:200, status:"empty" },
  { id:"t14", row_id:"r2", bed_id:"b1", tray_number:6, capacity:200, status:"empty" },
  { id:"t15", row_id:"r2", bed_id:"b1", tray_number:7, capacity:200, status:"empty" },
  { id:"t16", row_id:"r2", bed_id:"b1", tray_number:8, capacity:200, status:"empty" },
  { id:"t17", row_id:"r3", bed_id:"b2", tray_number:1, capacity:200, status:"ready" },
  { id:"t18", row_id:"r3", bed_id:"b2", tray_number:2, capacity:200, status:"germinating" },
  { id:"t19", row_id:"r3", bed_id:"b2", tray_number:3, capacity:200, status:"planted" },
  { id:"t20", row_id:"r3", bed_id:"b2", tray_number:4, capacity:200, status:"empty" },
  { id:"t21", row_id:"r3", bed_id:"b2", tray_number:5, capacity:200, status:"empty" },
  { id:"t22", row_id:"r3", bed_id:"b2", tray_number:6, capacity:200, status:"empty" },
  { id:"t23", row_id:"r4", bed_id:"b2", tray_number:1, capacity:200, status:"harvested" },
  { id:"t24", row_id:"r4", bed_id:"b2", tray_number:2, capacity:200, status:"harvested" },
  { id:"t25", row_id:"r4", bed_id:"b2", tray_number:3, capacity:200, status:"ready" },
  { id:"t26", row_id:"r4", bed_id:"b2", tray_number:4, capacity:200, status:"empty" },
  { id:"t27", row_id:"r4", bed_id:"b2", tray_number:5, capacity:200, status:"empty" },
]
const DEMO_ASSIGNMENTS: Assignment[] = [
  { id:"a1", tray_id:"t1",  seedling_count:178, assigned_date:"2025-12-10",
    batch:{ id:"ba1", plant_name:"Tomato (Roma)", category:"Fruiting", sku:"FRU001",
      lifecycle_status:"selling", batch_code:"BTH-001", crop_type:"Tomato", variety:"Roma F1",
      quantity:178, status:"Healthy", planted_date:"2025-12-10", expected_ready_date:"2026-01-20",
      price:10, batch_cost:4500, available_stock:178, supplier:"Simlaw Seeds Kenya" } },
  { id:"a2", tray_id:"t2",  seedling_count:191, assigned_date:"2025-12-10",
    batch:{ id:"ba1", plant_name:"Tomato (Roma)", category:"Fruiting", sku:"FRU001",
      lifecycle_status:"selling", batch_code:"BTH-001", crop_type:"Tomato", variety:"Roma F1",
      quantity:191, status:"Healthy", planted_date:"2025-12-10", expected_ready_date:"2026-01-20",
      price:10, batch_cost:4500, available_stock:191, supplier:"Simlaw Seeds Kenya" } },
  { id:"a3", tray_id:"t3",  seedling_count:120, assigned_date:"2026-01-15",
    batch:{ id:"ba2", plant_name:"Kale", category:"Leafy", sku:"LEA002",
      lifecycle_status:"germinating", batch_code:"BTH-002", crop_type:"Kale", variety:"Sukuma Wiki",
      quantity:120, status:"Healthy", planted_date:"2026-01-15", expected_ready_date:"2026-02-25",
      price:8, batch_cost:2200, available_stock:0, supplier:"Kenya Seed Company" } },
  { id:"a4", tray_id:"t4",  seedling_count:200, assigned_date:"2026-01-20",
    batch:{ id:"ba3", plant_name:"Capsicum", category:"Fruiting", sku:"FRU003",
      lifecycle_status:"planted", batch_code:"BTH-003", crop_type:"Capsicum", variety:"California Wonder",
      quantity:200, status:"Attention", planted_date:"2026-01-20", expected_ready_date:"2026-03-10",
      price:12, batch_cost:3800, available_stock:0, supplier:"Monsanto East Africa" } },
  { id:"a5", tray_id:"t9",  seedling_count:185, assigned_date:"2026-01-18",
    batch:{ id:"ba3", plant_name:"Capsicum", category:"Fruiting", sku:"FRU003",
      lifecycle_status:"planted", batch_code:"BTH-003", crop_type:"Capsicum", variety:"California Wonder",
      quantity:185, status:"Healthy", planted_date:"2026-01-18", expected_ready_date:"2026-03-10",
      price:12, batch_cost:3800, available_stock:0, supplier:"Monsanto East Africa" } },
  { id:"a6", tray_id:"t10", seedling_count:175, assigned_date:"2026-01-18",
    batch:{ id:"ba3", plant_name:"Capsicum", category:"Fruiting", sku:"FRU003",
      lifecycle_status:"planted", batch_code:"BTH-003", crop_type:"Capsicum", variety:"California Wonder",
      quantity:175, status:"Healthy", planted_date:"2026-01-18", expected_ready_date:"2026-03-10",
      price:12, batch_cost:3800, available_stock:0, supplier:"Monsanto East Africa" } },
  { id:"a7", tray_id:"t11", seedling_count:140, assigned_date:"2026-02-01",
    batch:{ id:"ba4", plant_name:"Spinach", category:"Leafy", sku:"LEA004",
      lifecycle_status:"germinating", batch_code:"BTH-004", crop_type:"Spinach", variety:"Bloomsdale",
      quantity:140, status:"Healthy", planted_date:"2026-02-01", expected_ready_date:"2026-03-15",
      price:7, batch_cost:1800, available_stock:0, supplier:"Kenya Seed Company" } },
  { id:"a8", tray_id:"t17", seedling_count:160, assigned_date:"2025-12-20",
    batch:{ id:"ba5", plant_name:"Broccoli", category:"Brassica", sku:"BRA005",
      lifecycle_status:"selling", batch_code:"BTH-005", crop_type:"Broccoli", variety:"Green Magic F1",
      quantity:160, status:"Healthy", planted_date:"2025-12-20", expected_ready_date:"2026-02-05",
      price:15, batch_cost:5500, available_stock:160, supplier:"East African Seed" } },
  { id:"a9", tray_id:"t18", seedling_count:150, assigned_date:"2026-01-25",
    batch:{ id:"ba6", plant_name:"Carrot", category:"Root", sku:"ROO006",
      lifecycle_status:"germinating", batch_code:"BTH-006", crop_type:"Carrot", variety:"Nantes",
      quantity:150, status:"Healthy", planted_date:"2026-01-25", expected_ready_date:"2026-03-20",
      price:9, batch_cost:2000, available_stock:0, supplier:"Simlaw Seeds Kenya" } },
  { id:"a10",tray_id:"t19", seedling_count:200, assigned_date:"2026-01-28",
    batch:{ id:"ba7", plant_name:"Onion", category:"Bulb", sku:"BLB007",
      lifecycle_status:"planted", batch_code:"BTH-007", crop_type:"Onion", variety:"Red Creole",
      quantity:200, status:"Healthy", planted_date:"2026-01-28", expected_ready_date:"2026-03-25",
      price:8, batch_cost:2500, available_stock:0, supplier:"Monsanto East Africa" } },
  { id:"a11",tray_id:"t23", seedling_count:200, assigned_date:"2025-11-01",
    batch:{ id:"ba8", plant_name:"Cabbage", category:"Brassica", sku:"BRA008",
      lifecycle_status:"sold_out", batch_code:"BTH-008", crop_type:"Cabbage", variety:"Gloria F1",
      quantity:0, status:"Sold Out", planted_date:"2025-11-01", expected_ready_date:"2025-12-20",
      price:10, batch_cost:4000, available_stock:0, supplier:"East African Seed" } },
  { id:"a12",tray_id:"t24", seedling_count:195, assigned_date:"2025-11-01",
    batch:{ id:"ba8", plant_name:"Cabbage", category:"Brassica", sku:"BRA008",
      lifecycle_status:"sold_out", batch_code:"BTH-008", crop_type:"Cabbage", variety:"Gloria F1",
      quantity:0, status:"Sold Out", planted_date:"2025-11-01", expected_ready_date:"2025-12-20",
      price:10, batch_cost:4000, available_stock:0, supplier:"East African Seed" } },
  { id:"a13",tray_id:"t25", seedling_count:170, assigned_date:"2025-12-05",
    batch:{ id:"ba1", plant_name:"Tomato (Roma)", category:"Fruiting", sku:"FRU001",
      lifecycle_status:"selling", batch_code:"BTH-001", crop_type:"Tomato", variety:"Roma F1",
      quantity:170, status:"Healthy", planted_date:"2025-12-05", expected_ready_date:"2026-01-15",
      price:10, batch_cost:4500, available_stock:170, supplier:"Simlaw Seeds Kenya" } },
]
const DEMO_BATCHES: Batch[] = [
  { id:"ba1", plant_name:"Tomato (Roma)", crop_type:"Tomato", batch_code:"BTH-001", lifecycle_status:"selling",    sku:"FRU001" },
  { id:"ba2", plant_name:"Kale",          crop_type:"Kale",   batch_code:"BTH-002", lifecycle_status:"germinating",sku:"LEA002" },
  { id:"ba3", plant_name:"Capsicum",      crop_type:"Capsicum",batch_code:"BTH-003",lifecycle_status:"planted",    sku:"FRU003" },
]

// ─── Tray Tile ─────────────────────────────────────────────

function TrayTile({
  tray, assignment, bedName, rowName, onSelect
}: {
  tray: Tray; assignment?: Assignment; bedName: string; rowName: string
  onSelect: (tray: Tray, assignment?: Assignment) => void
}) {
  const s = TRAY_STYLES[tray.status] ?? TRAY_STYLES.empty
  const batch = assignment?.batch
  const days = batch ? daysUntil(batch.expected_ready_date) : null

  return (
    <button
      onClick={() => onSelect(tray, assignment)}
      title={`${bedName} › ${rowName} › T${tray.tray_number}`}
      className={`
        relative w-full rounded-xl border-2 text-left transition-all
        active:scale-95 hover:shadow-md
        ${s.bg} ${s.border}
        ${tray.status === 'ready' ? 'ring-2 ring-green-400 ring-offset-1' : ''}
      `}
      style={{ minHeight: 100 }}
    >
      {/* Tray number badge top-left + status dot top-right */}
      <div className="flex items-center justify-between px-2.5 pt-2 pb-0">
        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
          T{tray.tray_number}
        </span>
        <span className={`w-2.5 h-2.5 rounded-full ${s.dot} shadow-sm shrink-0`} />
      </div>

      <div className="px-2.5 pb-2.5 pt-1">
        {batch ? (
          <>
            {/* Crop name — primary info, readable */}
            <div className={`text-[13px] font-bold leading-tight truncate ${s.tileText}`}>
              {batch.crop_type || batch.plant_name}
            </div>

            {/* Variety — secondary, italic */}
            {batch.variety && (
              <div className="text-[11px] text-gray-500 truncate italic leading-tight">
                {batch.variety}
              </div>
            )}

            {/* Seedling count — prominent */}
            <div className={`text-[12px] font-bold mt-1.5 ${s.tileText}`}>
              {assignment!.seedling_count.toLocaleString()}
              <span className="text-[10px] font-normal ml-0.5">sdlgs</span>
            </div>

            {/* Days to ready or "Ready now" */}
            {days !== null && days > 0 && (
              <div className="text-[11px] text-orange-500 font-semibold leading-tight">
                {days}d to ready
              </div>
            )}
            {days !== null && days <= 0 && tray.status !== 'harvested' && (
              <div className="text-[11px] text-green-600 font-bold leading-tight">
                Ready now!
              </div>
            )}
          </>
        ) : (
          <div className={`text-[12px] font-medium mt-2 ${s.tileText}`}>
            {s.label}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Rich Tray Detail Sheet ────────────────────────────────

function TrayDetailSheet({
  tray, assignment, batches, bedName, rowName, onClose, onRefresh
}: {
  tray: Tray; assignment?: Assignment; batches: Batch[]
  bedName: string; rowName: string
  onClose: () => void; onRefresh: () => void
}) {
  const s = TRAY_STYLES[tray.status] ?? TRAY_STYLES.empty
  const batch = assignment?.batch
  const days = batch ? daysUntil(batch.expected_ready_date) : null
  const expectedRevenue = batch && batch.price && assignment
    ? batch.price * assignment.seedling_count
    : null
  const costPerSeedling = batch && batch.batch_cost && batch.quantity
    ? (batch.batch_cost / batch.quantity).toFixed(2)
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white text-gray-900 rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 24px)' }}>
          {/* Header */}
          <div className={`px-5 pt-2 pb-4 ${s.bg} border-b ${s.border}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {bedName} › {rowName} › Tray {tray.tray_number}
                </p>
                <h2 className={`text-2xl font-bold mt-0.5 ${s.text}`}>
                  {batch ? (batch.crop_type || batch.plant_name) : "Empty Tray"}
                </h2>
                {batch?.variety && (
                  <p className="text-sm text-gray-500 italic">{batch.variety}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/70 hover:bg-white text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Badge className={`text-sm px-3 py-1 font-semibold border ${s.badge}`}>
              {s.label}
            </Badge>
          </div>

          {batch ? (
            <div className="px-5 py-4 space-y-4">
              {/* Key stats row */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Leaf className="h-5 w-5 text-green-500" />}
                  label="Seedlings in Tray"
                  value={assignment!.seedling_count.toLocaleString()}
                  sub={`Capacity: ${tray.capacity}`}
                  color="text-green-700"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                  label="Price / Seedling"
                  value={batch.price ? `Ksh ${batch.price}` : "—"}
                  sub={costPerSeedling ? `Cost: Ksh ${costPerSeedling}` : undefined}
                  color="text-blue-700"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                  label="Expected Revenue"
                  value={expectedRevenue ? `Ksh ${expectedRevenue.toLocaleString()}` : "—"}
                  sub="from this tray"
                  color="text-emerald-700"
                />
                <StatCard
                  icon={<Clock className="h-5 w-5 text-orange-500" />}
                  label="Days to Ready"
                  value={
                    days === null ? "—" :
                    days > 0 ? `${days} days` :
                    "Ready now!"
                  }
                  sub={batch.expected_ready_date ? formatDate(batch.expected_ready_date) : undefined}
                  color={days !== null && days <= 0 ? "text-green-600" : "text-orange-600"}
                />
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Timeline
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Date Planted</p>
                    <p className="font-semibold text-gray-800">{formatDate(batch.planted_date || assignment?.assigned_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Ready for Sale</p>
                    <p className={`font-semibold ${days !== null && days <= 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {formatDate(batch.expected_ready_date)}
                    </p>
                  </div>
                </div>

                {/* Visual timeline bar */}
                {batch.planted_date && batch.expected_ready_date && (() => {
                  const start = new Date(batch.planted_date).getTime()
                  const end   = new Date(batch.expected_ready_date).getTime()
                  const now   = Date.now()
                  const pct   = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100))
                  return (
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Planted</span>
                        <span>{Math.round(pct)}% through</span>
                        <span>Ready</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-400 via-amber-400 to-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Supplier & batch info */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Source & Batch
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Supplier</p>
                    <p className="font-semibold text-gray-800">{batch.supplier || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Batch Code</p>
                    <p className="font-mono font-bold text-gray-800">{batch.batch_code || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">SKU</p>
                    <p className="font-mono text-gray-700">{batch.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Batch Cost</p>
                    <p className="font-semibold text-gray-800">
                      {batch.batch_cost ? `Ksh ${batch.batch_cost.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Category</p>
                    <p className="font-semibold text-gray-800">{batch.category || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Stock Available</p>
                    <p className="font-semibold text-gray-800">
                      {batch.available_stock !== undefined ? batch.available_stock.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned by / notes */}
              {(assignment?.assigned_by || assignment?.notes) && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                  {assignment.assigned_by && (
                    <p className="text-gray-600">
                      <span className="font-medium">Assigned by:</span> {assignment.assigned_by}
                    </p>
                  )}
                  {assignment.notes && (
                    <p className="text-gray-600">
                      <span className="font-medium">Notes:</span> {assignment.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty tray — show assign form inline */
            <div className="px-5 py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">This tray is empty</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap below to assign a seedling batch to this tray
                </p>
              </div>
              <AssignBatchInline
                tray={tray}
                batches={batches}
                bedName={bedName}
                rowName={rowName}
                onAssigned={() => { onClose(); onRefresh() }}
              />
            </div>
          )}

          {/* Safe-area bottom padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Assign Batch Inline ───────────────────────────────────

function AssignBatchInline({
  tray, batches, bedName, rowName, onAssigned
}: {
  tray: Tray; batches: Batch[]; bedName: string; rowName: string; onAssigned: () => void
}) {
  const [open, setOpen] = useState(false)
  const [batchId, setBatchId] = useState("")
  const [seedlingCount, setSeedlingCount] = useState("200")
  const [status, setStatus] = useState<Tray['status']>("planted")
  const [assignedBy, setAssignedBy] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleAssign() {
    if (!batchId) return
    setSaving(true)
    if (isDemoMode) {
      toast({ title: "Demo mode", description: "Assignment saved (demo only)" })
      setSaving(false); return
    }
    const { error: ae } = await supabase.from("vnms_tray_assignments").insert({
      tray_id: tray.id, batch_id: batchId,
      seedling_count: parseInt(seedlingCount),
      assigned_date: new Date().toISOString().slice(0, 10),
      assigned_by: assignedBy || null, notes: notes || null,
    } as any)
    if (ae) { toast({ title: "Error", description: ae.message, variant: "destructive" }); setSaving(false); return }
    await (supabase.from("vnms_nursery_trays") as any).update({ status }).eq("id", tray.id)
    toast({ title: "Tray assigned ✓" })
    setSaving(false)
    onAssigned()
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base rounded-xl"
      >
        <Sprout className="h-5 w-5 mr-2" /> Assign Batch
      </Button>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="text-left border-2 border-dashed border-amber-300 rounded-2xl p-5 bg-amber-50 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900 text-sm">No seedling batches yet</p>
            <p className="text-sm text-amber-800 mt-1">
              You need to add at least one seedling batch before you can assign crops to trays.
            </p>
            <p className="text-sm text-amber-700 mt-2 font-medium">
              Go to <span className="font-bold">Inventory → Batches</span> and add your first batch, then come back here.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen(false)} className="w-full h-10 text-sm border-amber-400 text-amber-800">
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="text-left space-y-3 border rounded-2xl p-4 bg-gray-50 text-gray-900">
      <div className="space-y-1">
        <Label className="text-sm font-semibold text-gray-800">Crop / Batch</Label>
        <select className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white text-gray-900" value={batchId} onChange={e => setBatchId(e.target.value)}>
          <option value="">Select batch…</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.crop_type || b.plant_name} — {b.batch_code}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-gray-800">Status</Label>
          <select className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white text-gray-900" value={status} onChange={e => setStatus(e.target.value as Tray['status'])}>
            <option value="planted">Planted</option>
            <option value="germinating">Germinating</option>
            <option value="ready">Ready for Sale</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-gray-800">Seedling Count</Label>
          <Input className="h-12 rounded-xl bg-white text-gray-900 border-gray-300 placeholder:text-gray-400" type="number" value={seedlingCount} onChange={e => setSeedlingCount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold text-gray-800">Assigned By</Label>
        <Input className="h-12 rounded-xl bg-white text-gray-900 border-gray-300 placeholder:text-gray-400" placeholder="Staff name (optional)" value={assignedBy} onChange={e => setAssignedBy(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold text-gray-800">Notes</Label>
        <Textarea className="rounded-xl bg-white text-gray-900 border-gray-300 placeholder:text-gray-400" placeholder="Any notes…" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <Button
        onClick={handleAssign}
        disabled={saving || !batchId}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold"
      >
        {saving ? "Saving…" : "Confirm Assignment"}
      </Button>
    </div>
  )
}

// ─── Add Bed Dialog ────────────────────────────────────────

function AddBedDialog({ onAdd }: { onAdd: (bed: Bed) => void }) {
  const [open, setOpen] = useState(false)
  const [bedNum, setBedNum] = useState("")
  const [desc, setDesc] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleAdd() {
    if (!bedNum) return
    const num = parseInt(bedNum)
    if (isDemoMode) {
      onAdd({ id: `b-${Date.now()}`, bed_number: num, bed_name: `Bed ${num}`, description: desc })
      setOpen(false); setBedNum(""); setDesc(""); return
    }
    setSaving(true)
    const { data, error } = await supabase.from("vnms_nursery_beds").insert({
      bed_number: num, bed_name: `Bed ${num}`, description: desc
    } as any).select().single()
    setSaving(false)
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return }
    onAdd(data as Bed)
    setOpen(false); setBedNum(""); setDesc("")
    toast({ title: "Bed added", description: "Now add rows with trays." })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white h-10">
        <Plus className="h-4 w-4 mr-1" /> Add Bed
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add New Bed</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Bed Number / Name</Label>
              <Input className="h-12 rounded-xl" type="number" placeholder="e.g. 3" value={bedNum} onChange={e => setBedNum(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea className="rounded-xl" placeholder="e.g. Cabbages section" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleAdd} disabled={saving || !bedNum} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl">
              {saving ? "Saving…" : "Add Bed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Add Row Dialog (auto-creates trays) ──────────────────

function AddRowDialog({ beds, onAdded }: {
  beds: Bed[]
  onAdded: (row: Row, trays: Tray[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [bedId, setBedId] = useState("")
  const [rowNum, setRowNum] = useState("")
  const [trayCount, setTrayCount] = useState("8")
  const [capacity, setCapacity] = useState("200")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleAdd() {
    if (!bedId || !rowNum) return
    const num = parseInt(rowNum)
    const tc  = parseInt(trayCount)
    const cap = parseInt(capacity)
    if (isDemoMode) {
      const newRow: Row = { id:`r-${Date.now()}`, bed_id:bedId, row_number:num, row_name:`Row ${num}`, tray_count:tc }
      const newTrays: Tray[] = Array.from({ length: tc }, (_, i) => ({
        id:`t-${Date.now()}-${i}`, row_id:newRow.id, bed_id:bedId,
        tray_number:i+1, capacity:cap, status:'empty' as const
      }))
      onAdded(newRow, newTrays)
      setOpen(false); return
    }
    setSaving(true)
    const { data: rowData, error: rowErr } = await supabase.from("vnms_nursery_rows").insert({
      bed_id: bedId, row_number: num, row_name: `Row ${num}`, tray_count: tc
    } as any).select().single()
    if (rowErr) { toast({ title:"Error", description:rowErr.message, variant:"destructive" }); setSaving(false); return }
    const newRow = rowData as Row
    const trayInserts = Array.from({ length: tc }, (_, i) => ({
      row_id: newRow.id, bed_id: bedId, tray_number: i+1,
      tray_name: `Tray ${i+1}`, capacity: cap, status: 'empty' as const,
    }))
    const { data: trayData, error: trayErr } = await supabase
      .from("vnms_nursery_trays").insert(trayInserts as any).select()
    if (trayErr) {
      toast({ title:"Row created", description:`Trays could not be inserted: ${trayErr.message}`, variant:"destructive" })
      setSaving(false); onAdded(newRow, []); setOpen(false); return
    }
    toast({ title:"Row added ✓", description:`Row ${num} with ${tc} trays ready.` })
    onAdded(newRow, (trayData as Tray[]) || [])
    setSaving(false); setOpen(false); setRowNum(""); setBedId("")
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-10">
        <Plus className="h-4 w-4 mr-1" /> Add Row
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add Row with Trays</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Bed</Label>
              <select className="w-full border rounded-xl px-3 py-3 text-sm bg-white" value={bedId} onChange={e => setBedId(e.target.value)}>
                <option value="">Select bed…</option>
                {beds.map(b => <option key={b.id} value={b.id}>{b.bed_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Row Number</Label>
              <Input className="h-12 rounded-xl" type="number" placeholder="e.g. 2" value={rowNum} onChange={e => setRowNum(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Trays per Row</Label>
                <Input className="h-12 rounded-xl" type="number" placeholder="8" value={trayCount} onChange={e => setTrayCount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Capacity each</Label>
                <Input className="h-12 rounded-xl" type="number" placeholder="200" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
              Creates {trayCount || 0} empty tray slots automatically.
            </p>
            <Button onClick={handleAdd} disabled={saving || !bedId || !rowNum}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold">
              {saving ? "Creating…" : `Add Row + ${trayCount || 0} Trays`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Row Section ──────────────────────────────────────────

function AddTraysToRow({ row, bedId, onAdded }: {
  row: Row; bedId: string; onAdded: (trays: Tray[]) => void
}) {
  const [count, setCount] = useState("8")
  const [capacity, setCapacity] = useState("200")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleAdd() {
    const tc  = parseInt(count)
    const cap = parseInt(capacity)
    if (!tc || tc < 1) return
    setSaving(true)
    if (isDemoMode) {
      const newTrays: Tray[] = Array.from({ length: tc }, (_, i) => ({
        id: `t-${Date.now()}-${i}`, row_id: row.id, bed_id: bedId,
        tray_number: i + 1, capacity: cap, status: 'empty' as const,
      }))
      onAdded(newTrays); setSaving(false); return
    }
    const trayInserts = Array.from({ length: tc }, (_, i) => ({
      row_id: row.id, bed_id: bedId, tray_number: i + 1,
      tray_name: `Tray ${i + 1}`, capacity: cap, status: 'empty' as const,
    }))
    const { data, error } = await supabase.from("vnms_nursery_trays")
      .insert(trayInserts as any).select()
    setSaving(false)
    if (error) { toast({ title: "Error creating trays", description: error.message, variant: "destructive" }); return }
    toast({ title: `${tc} trays added to ${row.row_name} ✓`, description: "Tap any tray to assign a crop batch." })
    onAdded((data as Tray[]) || [])
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-green-200 rounded-xl bg-green-50/40">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-600">This row has no trays yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Add trays to start planting in <strong>{row.row_name}</strong></p>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1 text-center">
          <label className="text-xs font-semibold text-gray-500 block">Trays</label>
          <Input
            type="number" min={1} max={30}
            value={count} onChange={e => setCount(e.target.value)}
            className="w-20 h-10 rounded-xl text-center font-bold text-lg"
          />
        </div>
        <div className="space-y-1 text-center">
          <label className="text-xs font-semibold text-gray-500 block">Capacity each</label>
          <Input
            type="number" min={1}
            value={capacity} onChange={e => setCapacity(e.target.value)}
            className="w-24 h-10 rounded-xl text-center"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={saving}
          className="h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 font-semibold"
        >
          {saving ? "Adding…" : `+ Add ${count || 0} Trays`}
        </Button>
      </div>
    </div>
  )
}

// ─── Add Batch From Row ────────────────────────────────────

function AddBatchFromRow({ row, rowTrays, bedName, bedId, onDone }: {
  row: Row; rowTrays: Tray[]; bedName: string; bedId: string; onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const today = new Date().toISOString().slice(0, 10)
  const emptyTrays = rowTrays.filter(t => t.status === 'empty')

  const [form, setForm] = useState({
    plant_name: "",
    category: "Leafy Greens",
    variety: "",
    quantity: "",
    trays_to_fill: String(emptyTrays.length || 1),
    batch_cost: "",
    price: "",
    planted_date: today,
    expected_ready_date: "",
    source: "",
  })

  // Reset trays_to_fill whenever the dialog opens so it reflects current empty count
  const handleOpen = (val: boolean) => {
    if (val) setForm(f => ({ ...f, trays_to_fill: String(emptyTrays.length || 1) }))
    setOpen(val)
  }

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  // Live derived values
  const traysToFill = Math.min(Math.max(1, Number(form.trays_to_fill) || 1), emptyTrays.length || 1)
  const qty = Number(form.quantity) || 0
  const perTrayCount = traysToFill > 0 && qty > 0 ? Math.floor(qty / traysToFill) : 0
  const remainder = qty - perTrayCount * traysToFill

  async function handleSave() {
    if (!form.plant_name.trim() || qty <= 0) {
      toast({ title: "Required", description: "Crop name and quantity are needed.", variant: "destructive" }); return
    }
    setSaving(true)

    const dateStr = today.replace(/-/g, '')
    const batchCode = `BAT-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`
    const sku = `${form.category.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`

    try {
      if (isDemoMode) {
        toast({ title: "Batch added (demo)", description: `${form.plant_name} — ${traysToFill} tray${traysToFill !== 1 ? 's' : ''} in ${bedName} › ${row.row_name}` })
        setOpen(false); onDone(); setSaving(false); return
      }

      // 1. Create batch in vnms_batches
      const { data: batchData, error: batchErr } = await supabase
        .from("vnms_batches")
        .insert([{
          plant_name: form.plant_name.trim(),
          category: form.category,
          variety: form.variety.trim() || null,
          quantity: qty,
          available_stock: qty,
          price: Number(form.price) || 0,
          batch_cost: Number(form.batch_cost) || 0,
          status: 'Current',
          lifecycle_status: 'planted',
          sku,
          batch_code: batchCode,
          section: bedName,
          source: form.source.trim() || null,
          item_type: "Plant",
          planted_date: form.planted_date || null,
          expected_ready_date: form.expected_ready_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }] as any)
        .select()
        .single()

      if (batchErr) throw batchErr
      const newBatch = batchData as { id: string }

      // 2. Assign to only the chosen number of empty trays (first N in order)
      const traysToAssign = emptyTrays.slice(0, traysToFill)
      if (traysToAssign.length > 0) {
        const assignInserts = traysToAssign.map((tray, i) => ({
          tray_id: tray.id,
          batch_id: newBatch.id,
          seedling_count: i === traysToAssign.length - 1 ? perTrayCount + remainder : perTrayCount,
          assigned_date: form.planted_date || today,
          assigned_by: "Nursery",
          notes: `Planted in ${bedName} › ${row.row_name}`,
        }))
        await (supabase.from("vnms_tray_assignments") as any).insert(assignInserts)
        await (supabase.from("vnms_nursery_trays") as any)
          .update({ status: 'planted' })
          .in('id', traysToAssign.map(t => t.id))
      }

      toast({
        title: "Batch planted ✓",
        description: `${form.plant_name} (${batchCode}) — ${traysToAssign.length} tray${traysToAssign.length !== 1 ? 's' : ''} filled, ${emptyTrays.length - traysToAssign.length} left empty`,
      })

      setOpen(false)
      setForm({ plant_name:"", category:"Leafy Greens", variety:"", quantity:"", trays_to_fill: String(emptyTrays.length || 1), batch_cost:"", price:"", planted_date:today, expected_ready_date:"", source:"" })
      onDone()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={e => { e.stopPropagation(); handleOpen(true) }}
        className="h-6 px-2 text-[10px] text-green-700 hover:bg-green-50 border border-green-200 rounded-lg font-semibold shrink-0"
      >
        <Plus className="h-3 w-3 mr-0.5" /> Add Batch
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Plant Batch — {bedName} › {row.row_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {emptyTrays.length} empty tray{emptyTrays.length !== 1 ? 's' : ''} available. Choose how many to fill.
            </p>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Crop Name *</Label>
              <Input className="h-11 rounded-xl" placeholder="e.g. Gloria F1 Cabbage" value={form.plant_name} onChange={e => set("plant_name", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white"
                  value={form.category}
                  onChange={e => set("category", e.target.value)}
                >
                  <option>Leafy Greens</option>
                  <option>Fruiting Vegetables</option>
                  <option>Brassicas</option>
                  <option>Root Vegetables</option>
                  <option>Legumes</option>
                  <option>Herbs</option>
                  <option>Alliums</option>
                  <option>Cucurbits</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Variety</Label>
                <Input className="h-11 rounded-xl" placeholder="e.g. F1 Hybrid" value={form.variety} onChange={e => set("variety", e.target.value)} />
              </div>
            </div>

            {/* Quantity + Trays to fill — the key pair */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total Seedlings *</Label>
                <Input className="h-11 rounded-xl" type="number" min="1" placeholder="e.g. 600" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Trays to fill
                  <span className="text-gray-400 font-normal ml-1">(of {emptyTrays.length})</span>
                </Label>
                <Input
                  className="h-11 rounded-xl font-bold text-center"
                  type="number"
                  min="1"
                  max={emptyTrays.length || 1}
                  value={form.trays_to_fill}
                  onChange={e => set("trays_to_fill", e.target.value)}
                />
              </div>
            </div>

            {/* Live preview of seedlings per tray */}
            {qty > 0 && traysToFill > 0 && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                <span className="font-semibold">{qty.toLocaleString()} seedlings</span> across{" "}
                <span className="font-semibold">{traysToFill} tray{traysToFill !== 1 ? 's' : ''}</span>
                {" — "}≈ <span className="font-semibold">{perTrayCount.toLocaleString()} per tray</span>
                {remainder > 0 && ` (last tray gets ${perTrayCount + remainder})`}
                {emptyTrays.length - traysToFill > 0 && (
                  <span className="text-gray-500 ml-1">· {emptyTrays.length - traysToFill} tray{emptyTrays.length - traysToFill !== 1 ? 's' : ''} left empty</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Batch Cost (Ksh)</Label>
                <Input className="h-11 rounded-xl" type="number" min="0" placeholder="Total cost" value={form.batch_cost} onChange={e => set("batch_cost", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Selling Price / seedling</Label>
                <Input className="h-11 rounded-xl" type="number" min="0" placeholder="Ksh" value={form.price} onChange={e => set("price", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Supplier / Source</Label>
              <Input className="h-11 rounded-xl" placeholder="e.g. Simlaw Seeds" value={form.source} onChange={e => set("source", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Date Planted</Label>
                <Input className="h-11 rounded-xl" type="date" value={form.planted_date} onChange={e => set("planted_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expected Ready</Label>
                <Input className="h-11 rounded-xl" type="date" value={form.expected_ready_date} onChange={e => set("expected_ready_date", e.target.value)} />
              </div>
            </div>

            {qty > 0 && Number(form.batch_cost) > 0 && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                <span className="font-semibold">Cost per seedling:</span> Ksh {(Number(form.batch_cost) / qty).toFixed(2)}
              </div>
            )}

            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <Sprout className="h-3 w-3 inline mr-1" />
              Saved to <strong>Inventory</strong> · <strong>{traysToFill} tray{traysToFill !== 1 ? 's' : ''}</strong> filled in <strong>{bedName} › {row.row_name}</strong>
              {emptyTrays.length - traysToFill > 0 && (
                <span className="text-blue-500"> · {emptyTrays.length - traysToFill} tray{emptyTrays.length - traysToFill !== 1 ? 's' : ''} stay empty</span>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !form.plant_name.trim() || !Number(form.quantity)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
            >
              {saving ? "Saving…" : "Plant This Batch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Row Section ──────────────────────────────────────────

function RowSection({ row, trays, assignments, batches, bedName, bedId, onSelectTray, onTraysAdded, onRefresh }: {
  row: Row; trays: Tray[]; assignments: Assignment[]
  batches: Batch[]; bedName: string; bedId: string
  onSelectTray: (tray: Tray, assignment?: Assignment) => void
  onTraysAdded: (trays: Tray[]) => void
  onRefresh: () => void
}) {
  const rowTrays = trays.filter(t => t.row_id === row.id).sort((a, b) => a.tray_number - b.tray_number)
  const readyCount = rowTrays.filter(t => t.status === 'ready').length
  const usedCount  = rowTrays.filter(t => t.status !== 'empty').length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-200" />
        <div className="flex items-center gap-2 px-2 shrink-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{row.row_name}</span>
          {readyCount > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px] px-1.5">
              ✓ {readyCount} ready
            </Badge>
          )}
          {rowTrays.length > 0 && (
            <span className="text-[10px] text-gray-400">{usedCount}/{rowTrays.length} used</span>
          )}
          <AddBatchFromRow
            row={row}
            rowTrays={rowTrays}
            bedName={bedName}
            bedId={bedId}
            onDone={onRefresh}
          />
        </div>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {rowTrays.length === 0 ? (
        <AddTraysToRow row={row} bedId={bedId} onAdded={onTraysAdded} />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {rowTrays.map(tray => (
            <TrayTile
              key={tray.id}
              tray={tray}
              assignment={assignments.find(a => a.tray_id === tray.id)}
              bedName={bedName}
              rowName={row.row_name}
              onSelect={onSelectTray}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Bed Section ──────────────────────────────────────────

function BedSection({ bed, rows, trays, assignments, batches, onSelectTray, onTraysAdded, onRefresh }: {
  bed: Bed; rows: Row[]; trays: Tray[]; assignments: Assignment[]
  batches: Batch[]
  onSelectTray: (tray: Tray, assignment?: Assignment) => void
  onTraysAdded: (trays: Tray[]) => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(true)
  const bedRows  = rows.filter(r => r.bed_id === bed.id).sort((a, b) => a.row_number - b.row_number)
  const bedTrays = trays.filter(t => t.bed_id === bed.id)
  const readyTrays = bedTrays.filter(t => t.status === 'ready').length
  const germTrays  = bedTrays.filter(t => t.status === 'germinating').length
  const plantTrays = bedTrays.filter(t => t.status === 'planted').length
  const emptyTrays = bedTrays.filter(t => t.status === 'empty').length
  const totalSdlgs = assignments
    .filter(a => bedTrays.some(t => t.id === a.tray_id))
    .reduce((s, a) => s + a.seedling_count, 0)
  const pctOccupied = bedTrays.length > 0
    ? Math.round(((bedTrays.length - emptyTrays) / bedTrays.length) * 100) : 0

  return (
    <div className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Bed header — tap to expand/collapse */}
      <button
        className="w-full text-left px-5 py-4 bg-gradient-to-r from-green-50 to-white border-b border-gray-100 hover:bg-green-50/70 transition-colors active:bg-green-100"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {open
              ? <ChevronDown className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              : <ChevronRight className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">{bed.bed_name}</h2>
                {readyTrays > 0 && (
                  <Badge className="bg-green-600 text-white text-xs px-2">
                    ✓ {readyTrays} READY
                  </Badge>
                )}
              </div>
              {bed.description && <p className="text-xs text-gray-500 italic">{bed.description}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {bedRows.length} rows · {bedTrays.length} trays · {totalSdlgs.toLocaleString()} seedlings
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 justify-end shrink-0">
            {germTrays > 0  && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">{germTrays} Germinating</Badge>}
            {plantTrays > 0 && <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">{plantTrays} Planted</Badge>}
            {emptyTrays > 0 && <Badge variant="outline" className="text-gray-400 text-xs">{emptyTrays} Empty</Badge>}
          </div>
        </div>

        {/* Occupancy bar */}
        {bedTrays.length > 0 && (
          <div className="mt-3 ml-8">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Capacity used</span>
              <span>{pctOccupied}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                style={{ width: `${pctOccupied}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Rows content */}
      {open && (
        <div className="px-5 py-4 space-y-5">
          {bedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No rows yet — use "Add Row" to add rows with trays to this bed.
            </p>
          ) : (
            bedRows.map(row => (
              <RowSection
                key={row.id}
                row={row}
                trays={trays}
                assignments={assignments}
                batches={batches}
                bedName={bed.bed_name}
                bedId={bed.id}
                onSelectTray={onSelectTray}
                onTraysAdded={onTraysAdded}
                onRefresh={onRefresh}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────

export function NurseryLayoutTab() {
  const [beds, setBeds]             = useState<Bed[]>([])
  const [rows, setRows]             = useState<Row[]>([])
  const [trays, setTrays]           = useState<Tray[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [batches, setBatches]       = useState<Batch[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [selectedTray, setSelectedTray]           = useState<Tray | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | undefined>()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    if (isDemoMode) {
      setBeds(DEMO_BEDS); setRows(DEMO_ROWS)
      setTrays(DEMO_TRAYS); setAssignments(DEMO_ASSIGNMENTS)
      setBatches(DEMO_BATCHES)
      setLoading(false); return
    }
    try {
      setLoading(true)
      const [bedsR, rowsR, traysR, assignR, batchR] = await Promise.all([
        supabase.from("vnms_nursery_beds").select("*").order("bed_number"),
        supabase.from("vnms_nursery_rows").select("*").order("row_number"),
        supabase.from("vnms_nursery_trays").select("*").order("tray_number"),
        supabase.from("vnms_tray_assignments").select(`
          id, tray_id, seedling_count, assigned_date, notes, assigned_by,
          batch:batch_id (
            id, plant_name, category, sku, lifecycle_status, batch_code,
            crop_type, variety, quantity, status,
            planted_date, expected_ready_date, price, batch_cost, available_stock
          )
        `).order("created_at", { ascending: false }),
        supabase.from("vnms_batches")
          .select("id, plant_name, crop_type, batch_code, lifecycle_status, sku")
          .not("lifecycle_status", "eq", "sold_out"),
      ])
      if (bedsR.error) throw bedsR.error
      if (rowsR.error) throw rowsR.error
      if (traysR.error) throw traysR.error

      setBeds((bedsR.data as Bed[]) || [])
      setRows((rowsR.data as Row[]) || [])
      setTrays((traysR.data as Tray[]) || [])
      setBatches((batchR.data as Batch[]) || [])

      const assignMap = new Map<string, Assignment>()
      for (const a of (assignR.data || []) as Assignment[]) {
        if (!assignMap.has(a.tray_id)) assignMap.set(a.tray_id, a)
      }
      setAssignments(Array.from(assignMap.values()))
    } catch (err: any) {
      if (err?.code === '42P01') {
        toast({ title:"Setup needed", description:"Run vnms-full-migration.sql in Supabase.", variant:"destructive" })
      } else {
        toast({ title:"Error loading layout", description:err.message, variant:"destructive" })
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  function handleSelectTray(tray: Tray, assignment?: Assignment) {
    setSelectedTray(tray); setSelectedAssignment(assignment)
  }

  function handleRowAdded(row: Row, newTrays: Tray[]) {
    setRows(prev => [...prev, row].sort((a, b) => a.row_number - b.row_number))
    setTrays(prev => [...prev, ...newTrays])
  }

  const q = search.toLowerCase().trim()
  const filteredBeds = q
    ? beds.filter(b => {
        const bt = trays.filter(t => t.bed_id === b.id)
        const ba = assignments.filter(a => bt.some(t => t.id === a.tray_id))
        return (
          b.bed_name.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          ba.some(a =>
            a.batch?.plant_name.toLowerCase().includes(q) ||
            a.batch?.batch_code?.toLowerCase().includes(q) ||
            a.batch?.crop_type?.toLowerCase().includes(q)
          )
        )
      })
    : beds

  const totalTrays    = trays.length
  const occupiedTrays = trays.filter(t => t.status !== 'empty').length
  const readyTrays    = trays.filter(t => t.status === 'ready').length
  const totalSeedlings = assignments.reduce((s, a) => s + a.seedling_count, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="modern-header">
        <h1 className="modern-title">Nursery Layout</h1>
        <p className="modern-subtitle">Tap any tray for full details — crop, supplier, dates, revenue</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:<Layers className="h-5 w-5 text-green-600"/>, label:"Beds", value:beds.length, sub:`${rows.length} rows`, color:"text-green-700" },
          { icon:<Grid3X3 className="h-5 w-5 text-blue-600"/>, label:"Trays In Use", value:`${occupiedTrays}/${totalTrays}`, sub:`${totalTrays>0?Math.round((occupiedTrays/totalTrays)*100):0}% occupied`, color:"text-blue-700" },
          { icon:<Package className="h-5 w-5 text-orange-500"/>, label:"Total Seedlings", value:totalSeedlings.toLocaleString(), sub:"across all trays", color:"text-orange-600" },
          { icon:<CheckCircle2 className="h-5 w-5 text-green-500"/>, label:"Ready for Sale", value:readyTrays, sub:"trays ready now", color:"text-green-600" },
        ].map((s, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-sm text-muted-foreground font-medium">{s.label}</span></div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-white rounded-2xl px-4 py-3 shadow-sm border">
        <span className="font-bold text-gray-700">Legend:</span>
        {Object.entries(TRAY_STYLES).map(([key, s]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded border-2 inline-block ${s.bg} ${s.border}`} />
            <span className="text-gray-600 font-medium">{s.label}</span>
          </span>
        ))}
        <span className="ml-auto text-gray-400 italic hidden sm:block">Tap any tray → full details</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search crop, bed, batch…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl" />
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-10 rounded-xl">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <AddBedDialog onAdd={b => setBeds(prev => [...prev, b].sort((a, b) => a.bed_number - b.bed_number))} />
        <AddRowDialog beds={beds} onAdded={handleRowAdded} />
      </div>

      {/* Beds */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
          <RefreshCw className="h-10 w-10 animate-spin text-green-500" />
          <p>Loading nursery layout…</p>
        </div>
      ) : filteredBeds.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">
            {beds.length === 0 ? "No beds yet" : "No matches"}
          </h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {beds.length === 0
              ? "Tap \"Add Bed\" to start, then \"Add Row\" to create rows with trays. Trays appear automatically."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBeds.map(bed => (
            <BedSection
              key={bed.id}
              bed={bed}
              rows={rows}
              trays={trays}
              assignments={assignments}
              batches={batches}
              onSelectTray={handleSelectTray}
              onTraysAdded={newTrays => setTrays(prev => [...prev, ...newTrays])}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}

      {/* First-time guide */}
      {!isDemoMode && beds.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-800">Getting started</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                <li>Tap <strong>Add Bed</strong> — give it a name (e.g. Bed A) and a description</li>
                <li>Tap <strong>Add Row</strong> — pick the bed, set 8 trays, capacity 200</li>
                <li>Trays appear automatically — tap any tray to assign a seedling batch</li>
                <li>Each tray shows: crop, supplier, dates, seedling count and expected revenue</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tray detail sheet */}
      {selectedTray && (
        <TrayDetailSheet
          tray={selectedTray}
          assignment={selectedAssignment}
          batches={batches}
          bedName={beds.find(b => b.id === selectedTray.bed_id)?.bed_name ?? ""}
          rowName={rows.find(r => r.id === selectedTray.row_id)?.row_name ?? ""}
          onClose={() => { setSelectedTray(null); setSelectedAssignment(undefined) }}
          onRefresh={fetchData}
        />
      )}
    </div>
  )
}
