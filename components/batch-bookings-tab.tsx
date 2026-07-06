"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, CalendarClock, Trash2, CheckCircle2, XCircle, Users } from "lucide-react"

interface Booking {
  id: string
  batch_id: string | null
  plant_name: string
  customer_id: string
  quantity_booked: number
  status: "pending" | "confirmed" | "fulfilled" | "cancelled"
  notes?: string
  created_at: string
  vnms_customers?: { name: string; contact: string } | null
}

interface BatchOption {
  id: string
  plant_name: string
  crop_type?: string
  quantity: number
  lifecycle_status: string
  expected_ready_date?: string | null
}

interface CustomerOption {
  id: string
  name: string
  contact: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  fulfilled: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-500 border-gray-300",
}

export function BatchBookingsTab({ batches, tableExists }: { batches: BatchOption[]; tableExists: boolean }) {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsTableExists, setBookingsTableExists] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    batch_id: "none",
    plant_name: "",
    customer_id: "",
    quantity_booked: "",
    notes: "",
  })

  useEffect(() => {
    fetchBookings()
    fetchCustomers()
  }, [])

  async function fetchBookings() {
    if (isDemoMode) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await (supabase.from("vnms_batch_bookings") as any)
        .select("*, vnms_customers(name, contact)")
        .order("created_at", { ascending: false })
      if (error) {
        if (error.code === "42P01" || /does not exist/i.test(error.message || "")) {
          setBookingsTableExists(false)
        }
        setBookings([])
      } else {
        setBookingsTableExists(true)
        setBookings(data || [])
      }
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchCustomers() {
    if (isDemoMode) return
    const { data } = await (supabase.from("vnms_customers") as any).select("id, name, contact").order("name")
    setCustomers(data || [])
  }

  const activeBatches = useMemo(
    () => batches.filter(b => b.lifecycle_status !== "sold_out"),
    [batches]
  )

  const bookedByBatch = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of bookings) {
      if (!b.batch_id) continue
      if (b.status === "cancelled") continue
      map[b.batch_id] = (map[b.batch_id] || 0) + (b.quantity_booked || 0)
    }
    return map
  }, [bookings])

  function resetForm() {
    setForm({ batch_id: "none", plant_name: "", customer_id: "", quantity_booked: "", notes: "" })
  }

  async function handleAddBooking() {
    if (!form.customer_id) {
      toast({ title: "Select a customer", variant: "destructive" })
      return
    }
    const plantName = form.batch_id !== "none"
      ? activeBatches.find(b => b.id === form.batch_id)?.plant_name || form.plant_name
      : form.plant_name.trim()
    if (!plantName) {
      toast({ title: "Enter a plant name", description: "Pick a batch, or type the plant name for an upcoming batch.", variant: "destructive" })
      return
    }
    const qty = parseInt(form.quantity_booked, 10)
    if (!qty || qty <= 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const { error } = await (supabase.from("vnms_batch_bookings") as any).insert({
        batch_id: form.batch_id !== "none" ? form.batch_id : null,
        plant_name: plantName,
        customer_id: form.customer_id,
        quantity_booked: qty,
        notes: form.notes.trim() || null,
        status: "pending",
      })
      if (error) throw error
      toast({ title: "Booking added", description: `${qty} ${plantName} reserved.` })
      setDialogOpen(false)
      resetForm()
      fetchBookings()
    } catch (err: any) {
      toast({ title: "Could not add booking", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: Booking["status"]) {
    try {
      const { error } = await (supabase.from("vnms_batch_bookings") as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
      fetchBookings()
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    }
  }

  async function deleteBooking(id: string) {
    if (!confirm("Remove this booking?")) return
    try {
      const { error } = await (supabase.from("vnms_batch_bookings") as any).delete().eq("id", id)
      if (error) throw error
      fetchBookings()
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    }
  }

  if (isDemoMode || !tableExists) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Connect Supabase to start tracking customer bookings for upcoming batches.
        </CardContent>
      </Card>
    )
  }

  if (!bookingsTableExists) {
    return (
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="p-6 text-sm text-amber-800">
          <p className="font-semibold mb-1">Bookings table not set up yet</p>
          <p>Run <code className="bg-white px-1 rounded border border-amber-300">scripts/vnms-add-batch-bookings.sql</code> in your Supabase SQL Editor to enable customer bookings.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" /> Batch Bookings / Pre-orders
          </h3>
          <p className="text-xs text-muted-foreground">Track customers who reserved seedlings from a current or upcoming batch.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Batch (optional)</Label>
                <Select value={form.batch_id} onValueChange={(v) => setForm(f => ({ ...f, batch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pick an existing batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not in system yet (upcoming batch)</SelectItem>
                    {activeBatches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.plant_name} — {b.quantity} available ({b.lifecycle_status.replace(/_/g, " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.batch_id === "none" && (
                <div className="space-y-1.5">
                  <Label>Plant name</Label>
                  <Input placeholder="e.g. Gloria F1 Tomato" value={form.plant_name} onChange={e => setForm(f => ({ ...f, plant_name: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm(f => ({ ...f, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.contact}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity_booked} onChange={e => setForm(f => ({ ...f, quantity_booked: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={handleAddBooking} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Per-batch capacity summary */}
      {activeBatches.filter(b => bookedByBatch[b.id]).length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {activeBatches.filter(b => bookedByBatch[b.id]).map(b => {
            const booked = bookedByBatch[b.id] || 0
            const fullyBooked = booked >= b.quantity
            return (
              <Card key={b.id} className={fullyBooked ? "border-red-300 bg-red-50" : "border-gray-200"}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{b.plant_name}</p>
                    <p className="text-xs text-muted-foreground">{booked} booked / {b.quantity} available</p>
                  </div>
                  {fullyBooked && <Badge className="bg-red-600 text-white">Fully Booked</Badge>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : bookings.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">No bookings yet. Add one when a customer reserves seedlings ahead of harvest.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{b.plant_name}</p>
                    <Badge variant="outline" className={`text-[10px] h-5 ${STATUS_STYLES[b.status]}`}>{b.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Users className="h-3 w-3" /> {b.vnms_customers?.name || "Unknown customer"} · Qty {b.quantity_booked}
                  </p>
                  {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{b.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {b.status === "pending" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(b.id, "confirmed")}>Confirm</Button>
                  )}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300" onClick={() => updateStatus(b.id, "fulfilled")}>
                      <CheckCircle2 className="h-3 w-3" /> Fulfilled
                    </Button>
                  )}
                  {b.status !== "cancelled" && b.status !== "fulfilled" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-gray-500" onClick={() => updateStatus(b.id, "cancelled")}>
                      <XCircle className="h-3 w-3" /> Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteBooking(b.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
