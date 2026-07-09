"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useNursery } from "@/contexts/nursery-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Printer, MessageCircle, CheckCircle2, ShoppingCart, X, Lock, CalendarClock } from "lucide-react"

interface Batch {
  id: string; plant_name: string; batch_code?: string; lifecycle_status?: string
  available_stock?: number; quantity: number; price: number; crop_type?: string
}
interface Customer { id: string; name: string; phone?: string; contact?: string; credit_limit?: number }
interface PriceTier { customer_type: string; min_quantity: number; max_quantity: number; price_per_seedling: number }
interface BookingOption {
  id: string; batch_id: string | null; plant_name: string; customer_id: string
  quantity_booked: number; status: string
  vnms_customers?: { name: string; contact: string } | null
}

function generateReceiptNumber() {
  const n = Math.floor(Math.random() * 90000) + 10000
  return `RCP-${n}`
}

interface Props {
  open: boolean
  onClose: () => void
  onSaleComplete: () => void
}

export function POSModal({ open, onClose, onSaleComplete }: Props) {
  const { user } = useAuth()
  const { nurseryName, logoUrl, phone: nurseryPhone, tagline: nurseryTagline } = useNursery()
  const { toast } = useToast()
  const receiptRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<'form' | 'receipt'>('form')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [batches, setBatches] = useState<Batch[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([])
  const [bookings, setBookings] = useState<BookingOption[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState("")

  // Form state
  const [customerId, setCustomerId] = useState("walk-in")
  const [customerType, setCustomerType] = useState("Walk-in")
  const [batchId, setBatchId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [mpesaRef, setMpesaRef] = useState("")
  const [managerPin, setManagerPin] = useState("")
  const [notes, setNotes] = useState("")
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null)
  const [checkingCredit, setCheckingCredit] = useState(false)

  // Computed
  const selectedBatch = batches.find(b => b.id === batchId)
  const selectedCustomer = customers.find(c => c.id === customerId)
  const qty = parseInt(quantity) || 0

  const unitPrice = (() => {
    if (!selectedBatch || qty === 0) return selectedBatch?.price || 0
    const tier = priceTiers.find(t =>
      t.customer_type === customerType &&
      qty >= t.min_quantity &&
      qty <= t.max_quantity
    )
    if (tier) return tier.price_per_seedling
    const allTier = priceTiers.find(t =>
      t.customer_type === 'All' &&
      qty >= t.min_quantity &&
      qty <= t.max_quantity
    ) as any
    return allTier?.price_per_seedling || selectedBatch.price || 0
  })()

  const totalAmount = unitPrice * qty
  const availableStock = selectedBatch?.available_stock ?? selectedBatch?.quantity ?? 0
  const stockAfter = availableStock - qty
  const receiptNumber = generateReceiptNumber()

  // Overbooking risk: total pending/confirmed bookings for selected batch vs available stock
  const totalBookedForBatch = batchId
    ? bookings
        .filter(b => b.batch_id === batchId || (!b.batch_id && selectedBatch && b.plant_name.toLowerCase() === selectedBatch.plant_name.toLowerCase()))
        .reduce((sum, b) => sum + (b.quantity_booked || 0), 0)
    : 0
  const unbookedStock = availableStock - totalBookedForBatch
  const overbookingRisk = selectedBatch && totalBookedForBatch > 0 && availableStock > 0

  useEffect(() => {
    if (open) {
      fetchData()
      setStep('form')
      setCustomerId("walk-in")
      setCustomerType("Walk-in")
      setBatchId("")
      setQuantity("")
      setPaymentMethod("Cash")
      setMpesaRef("")
      setManagerPin("")
      setNotes("")
      setOutstandingBalance(null)
      setSelectedBookingId("")
    }
  }, [open])

  function applyBooking(bookingId: string) {
    setSelectedBookingId(bookingId)
    if (bookingId === "none") return
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return
    if (booking.customer_id && customers.some(c => c.id === booking.customer_id)) {
      setCustomerId(booking.customer_id)
    }
    const matchedBatch = booking.batch_id
      ? batches.find(b => b.id === booking.batch_id)
      : batches.find(b => b.plant_name.toLowerCase() === booking.plant_name.toLowerCase())
    if (matchedBatch) setBatchId(matchedBatch.id)
    setQuantity(String(booking.quantity_booked))
    setNotes(prev => prev || `From booking: ${booking.plant_name}`)
  }

  useEffect(() => {
    async function loadOutstanding() {
      if (paymentMethod !== "Credit" || customerId === "walk-in" || isDemoMode) {
        setOutstandingBalance(null)
        return
      }
      setCheckingCredit(true)
      const { data } = await (supabase.from("vnms_sales") as any)
        .select("total_amount, payment_method, payment_reference")
        .eq("customer_id", customerId)
        .or("payment_method.eq.Credit,payment_method.like.Credit%")
      const balance = (data || []).reduce((sum: number, s: any) => {
        const method = (s.payment_method || "").toLowerCase()
        if (method.includes("paid") && !method.includes("partial")) return sum
        const paid = s.payment_reference?.startsWith("partial:") ? Number(s.payment_reference.split(":")[1]) || 0 : 0
        return sum + Math.max(0, (s.total_amount || 0) - paid)
      }, 0)
      setOutstandingBalance(balance)
      setCheckingCredit(false)
    }
    loadOutstanding()
  }, [paymentMethod, customerId])

  const creditLimit = selectedCustomer?.credit_limit ?? 0
  const projectedBalance = (outstandingBalance ?? 0) + totalAmount
  const overCreditLimit = paymentMethod === "Credit" && customerId !== "walk-in" && outstandingBalance !== null && projectedBalance > creditLimit

  async function fetchData() {
    if (isDemoMode) {
      setBatches([
        { id: "b1", plant_name: "Tomato (Roma)", batch_code: "BTH-2025-0001", lifecycle_status: "selling", quantity: 180, available_stock: 180, price: 10 },
        { id: "b2", plant_name: "Kale (Sukuma Wiki)", batch_code: "BTH-2025-0004", lifecycle_status: "selling", quantity: 160, available_stock: 160, price: 8 },
      ])
      setCustomers([
        { id: "c1", name: "John Kamau", phone: "+254712345678" },
        { id: "c2", name: "Mary Wanjiku", phone: "+254787654321" },
      ])
      setPriceTiers([
        { customer_type: "Walk-in", min_quantity: 1, max_quantity: 499, price_per_seedling: 10 },
        { customer_type: "Small Wholesale", min_quantity: 500, max_quantity: 1999, price_per_seedling: 9 },
        { customer_type: "Wholesale", min_quantity: 2000, max_quantity: 4999, price_per_seedling: 8 },
        { customer_type: "Large Farm", min_quantity: 5000, max_quantity: 999999, price_per_seedling: 7 },
      ])
      return
    }

    const [batchRes, custRes, priceRes, bookingRes] = await Promise.all([
      supabase.from("vnms_batches").select("id, plant_name, batch_code, lifecycle_status, quantity, available_stock, price, crop_type")
        .in("lifecycle_status", ["selling", "ready", "Ready", "Selling"]).gt("quantity", 0),
      supabase.from("vnms_customers").select("id, name, phone, contact, credit_limit").order("name"),
      supabase.from("vnms_prices").select("*").order("min_quantity"),
      (supabase.from("vnms_batch_bookings") as any)
        .select("id, batch_id, plant_name, customer_id, quantity_booked, status, vnms_customers(name, contact)")
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false }),
    ])
    setBatches((batchRes.data as Batch[]) || [])
    setCustomers((custRes.data as Customer[]) || [])
    setPriceTiers((priceRes.data as PriceTier[]) || [])
    setBookings(bookingRes.error ? [] : ((bookingRes.data as BookingOption[]) || []))
  }

  async function handleConfirmSale() {
    if (!batchId || qty <= 0) {
      toast({ title: "Incomplete", description: "Select a batch and enter quantity.", variant: "destructive" }); return
    }
    if (qty > availableStock) {
      toast({ title: "Insufficient stock", description: `Only ${availableStock} available.`, variant: "destructive" }); return
    }
    if (paymentMethod === "M-Pesa" && !mpesaRef.trim()) {
      toast({ title: "M-Pesa reference required", description: "Enter the M-Pesa transaction reference.", variant: "destructive" }); return
    }
    if (paymentMethod === "Credit" && customerId === "walk-in") {
      toast({ title: "Customer required", description: "Credit sales must be linked to a customer.", variant: "destructive" }); return
    }
    if (paymentMethod === "Credit" && overCreditLimit) {
      toast({
        title: "Credit limit exceeded",
        description: `${selectedCustomer?.name} has Ksh ${(outstandingBalance ?? 0).toLocaleString()} outstanding. This sale would bring it to Ksh ${projectedBalance.toLocaleString()}, over their Ksh ${creditLimit.toLocaleString()} limit.`,
        variant: "destructive",
      })
      return
    }

    setConfirming(true)
    try {
      const saleDate = new Date().toISOString().split("T")[0]

      if (!isDemoMode) {
        // Single atomic server-side transaction: locks the batch row,
        // checks stock, decrements it, inserts the sale, and marks the
        // booking fulfilled — all or nothing, so a dropped connection
        // can no longer leave stock decremented with no matching sale.
        const { error: rpcError } = await supabase.rpc("record_sale_atomic", {
          p_batch_id: batchId,
          p_quantity: qty,
          p_unit_price: unitPrice,
          p_total_amount: totalAmount,
          p_sale_date: saleDate,
          p_customer_id: customerId === "walk-in" ? null : customerId,
          p_customer_name: customerId === "walk-in" ? "Walk-in Customer" : (selectedCustomer?.name || ""),
          p_customer_type: customerType,
          p_payment_method: paymentMethod,
          p_payment_reference: mpesaRef || null,
          p_receipt_number: receiptNumber,
          p_notes: notes || null,
          p_batch_code: selectedBatch?.batch_code || null,
          p_plant_name: selectedBatch?.plant_name || null,
          p_booking_id: selectedBookingId && selectedBookingId !== "none" ? selectedBookingId : null,
        })
        if (rpcError) throw rpcError
      }

      toast({ title: "Sale recorded!", description: `${receiptNumber} — Ksh ${totalAmount.toLocaleString()}` })
      setStep('receipt')
      onSaleComplete()
    } catch (err: any) {
      toast({ title: "Error recording sale", description: err.message, variant: "destructive" })
    } finally {
      setConfirming(false)
    }
  }

  function handlePrint() {
    const unitPriceStr = unitPrice.toFixed(2)
    const dateStr = new Date().toLocaleDateString("en-KE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
@page { size: 80mm auto; margin: 4mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Courier New', Courier, monospace; font-size: 11pt; color: #000; width: 80mm; }
.center { text-align: center; }
.bold { font-weight: bold; }
.small { font-size: 9pt; }
.row { display: flex; justify-content: space-between; margin: 1mm 0; }
.divider { border-top: 1px dashed #000; margin: 2mm 0; }
.total-row { display: flex; justify-content: space-between; font-size: 13pt; font-weight: bold; margin: 2mm 0; }
</style></head><body>
${logoUrl
      ? `<div class="center" style="margin-bottom:3mm;"><img src="${logoUrl}" alt="" style="max-height:20mm; max-width:60mm; object-fit:contain;" /></div><div class="center small"><strong>${nurseryName}</strong></div>`
      : `<div class="center bold" style="font-size:13pt; margin-bottom:2mm;">${nurseryName.toUpperCase()}</div><div class="center small">Vegetable Nursery Management</div>`
    }
<div class="divider"></div>
<div class="row"><span>Receipt #</span><span class="bold">${receiptNumber}</span></div>
<div class="row"><span>Date</span><span>${dateStr}</span></div>
<div class="row"><span>Cashier</span><span>${cashierName}</span></div>
<div class="row"><span>Customer</span><span>${customerId === "walk-in" ? "Walk-in" : (selectedCustomer?.name || "—")}</span></div>
<div class="divider"></div>
<div class="bold">${selectedBatch?.plant_name || "Seedlings"}</div>
<div class="row small"><span>${qty} × Ksh ${unitPriceStr}</span><span class="bold">Ksh ${totalAmount.toLocaleString()}</span></div>
${selectedBatch?.batch_code ? `<div class="small">Batch: ${selectedBatch.batch_code}</div>` : ""}
<div class="divider"></div>
<div class="total-row"><span>TOTAL</span><span>Ksh ${totalAmount.toLocaleString()}</span></div>
<div class="row small"><span>Payment</span><span>${paymentMethod}${mpesaRef ? ` (${mpesaRef})` : ""}</span></div>
<div class="divider"></div>
${nurseryPhone ? `<div class="center small">📞 ${nurseryPhone}</div>` : ""}
<div class="center small" style="margin-top:2mm;">Thank you for your business!</div>
${nurseryTagline ? `<div class="center small" style="font-style:italic; margin-top:1mm;">${nurseryTagline}</div>` : ""}
<div class="center small" style="margin-top:1mm;">${nurseryName}</div>
<br/><br/>
</body></html>`
    const win = window.open("", "_blank", "width=300,height=600")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  function handleWhatsApp() {
    const phone = (selectedCustomer?.phone || selectedCustomer?.contact || "").replace(/\D/g, "")
    const dateStr = new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
    const lines = [
      `🌱 *${nurseryName.toUpperCase()}*`,
      `📍 Vegetable Nursery`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🧾 Receipt: *${receiptNumber}*`,
      `📅 Date: ${dateStr}`,
      `👤 Customer: ${customerId === "walk-in" ? "Walk-in" : (selectedCustomer?.name || "—")}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🌿 *${selectedBatch?.plant_name || "Seedlings"}*`,
      `   ${qty.toLocaleString()} × Ksh ${unitPrice.toFixed(2)} = *Ksh ${totalAmount.toLocaleString()}*`,
      selectedBatch?.batch_code ? `   Batch: ${selectedBatch.batch_code}` : ``,
      ``,
      `💰 *TOTAL: Ksh ${totalAmount.toLocaleString()}*`,
      `💳 Payment: ${paymentMethod}${mpesaRef ? ` (${mpesaRef})` : ""}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Thank you for your business!*`,
      nurseryPhone ? `📞 ${nurseryPhone}` : ``,
      nurseryTagline ? `_${nurseryTagline}_` : ``,
      `_${nurseryName}_`,
    ].filter(l => l !== undefined && l !== "").join("\n")
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`
    window.open(url, "_blank")
  }

  const cashierName = user?.email?.split("@")[0] || "Admin"

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            {step === 'form' ? 'New Sale' : 'Receipt'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            {/* Booking */}
            {bookings.length > 0 && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> From a booking (optional)</Label>
                <Select value={selectedBookingId} onValueChange={applyBooking}>
                  <SelectTrigger><SelectValue placeholder="Pick a pending/confirmed booking to prefill…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — new sale</SelectItem>
                    {bookings.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.vnms_customers?.name || "Unknown"} — {b.plant_name} × {b.quantity_booked} ({b.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Customer */}
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                  <SelectItem value="Small Wholesale">Small Wholesale</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Large Farm">Large Farm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Batch */}
            <div className="space-y-1">
              <Label>Batch (showing: ready for sale)</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger><SelectValue placeholder="Select batch…" /></SelectTrigger>
                <SelectContent>
                  {batches.length === 0
                    ? <SelectItem value="__none__" disabled>No batches ready for sale</SelectItem>
                    : batches.map(b => {
                        const booked = bookings
                          .filter(bk => bk.batch_id === b.id || (!bk.batch_id && bk.plant_name.toLowerCase() === b.plant_name.toLowerCase()))
                          .reduce((s, bk) => s + (bk.quantity_booked || 0), 0)
                        const avail = b.available_stock ?? b.quantity
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {b.plant_name} {b.batch_code ? `(${b.batch_code})` : ''} — {avail} avail.{booked > 0 ? ` · ${booked} booked` : ""}
                          </SelectItem>
                        )
                      })}
                </SelectContent>
              </Select>
              {overbookingRisk && (
                <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${unbookedStock < 0 ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                  <span className="shrink-0 mt-0.5">{unbookedStock < 0 ? "🔴" : "⚠️"}</span>
                  <span>
                    <strong>{totalBookedForBatch} seedlings</strong> are reserved by customer bookings.{" "}
                    {unbookedStock < 0
                      ? `Stock is overcommitted by ${Math.abs(unbookedStock)} — fulfil or cancel bookings before selling to walk-ins.`
                      : `Only ${unbookedStock} unbooked seedlings remain. Selling to a walk-in may leave booked customers short.`}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <Label>Quantity (seedlings)</Label>
              <Input type="number" min="1" placeholder="e.g. 200" value={quantity} onChange={e => setQuantity(e.target.value)} />
              {selectedBatch && qty > 0 && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit price</span>
                    <span className="font-semibold">Ksh {unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-green-700">Ksh {totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-green-200">
                    <span>Stock after sale</span>
                    <span className={stockAfter < 0 ? "text-red-600 font-bold" : ""}>{stockAfter}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "M-Pesa" && (
              <div className="space-y-1">
                <Label>M-Pesa Reference</Label>
                <Input placeholder="e.g. RCA8L7X2P1" value={mpesaRef} onChange={e => setMpesaRef(e.target.value)} className="font-mono" />
              </div>
            )}

            {paymentMethod === "Credit" && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Manager PIN</Label>
                <Input type="password" placeholder="Enter manager PIN" value={managerPin} onChange={e => setManagerPin(e.target.value)} />
              </div>
            )}

            {paymentMethod === "Credit" && customerId !== "walk-in" && (
              <div className={`p-3 rounded-lg text-sm space-y-1 border ${overCreditLimit ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                {checkingCredit ? (
                  <p className="text-muted-foreground">Checking credit limit…</p>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current outstanding</span>
                      <span className="font-semibold">Ksh {(outstandingBalance ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credit limit</span>
                      <span className="font-semibold">Ksh {creditLimit.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between font-bold pt-1 border-t ${overCreditLimit ? "border-red-200 text-red-700" : "border-blue-200"}`}>
                      <span>After this sale</span>
                      <span>Ksh {projectedBalance.toLocaleString()}</span>
                    </div>
                    {overCreditLimit && (
                      <p className="text-red-700 text-xs pt-1">
                        ⚠️ This exceeds {selectedCustomer?.name}'s credit limit by Ksh {(projectedBalance - creditLimit).toLocaleString()}.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Any remarks about this sale…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleConfirmSale}
                disabled={confirming || !batchId || qty <= 0 || stockAfter < 0 || overCreditLimit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {confirming ? "Recording…" : overCreditLimit ? "Over Credit Limit" : `Confirm Sale — Ksh ${totalAmount.toLocaleString()}`}
              </Button>
            </div>
          </div>
        ) : (
          /* Receipt view */
          <div className="space-y-4">
            <div ref={receiptRef} className="border rounded-xl p-4 font-mono text-sm space-y-2 bg-white">
              <div className="text-center font-bold text-base border-b pb-2">
                {nurseryName.toUpperCase()}<br />
                <span className="text-xs font-normal">Nursery Management</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Receipt #</span><span className="font-bold text-foreground">{receiptNumber}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Date</span><span>{new Date().toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cashier</span><span>{cashierName}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Customer</span><span>{customerId === "walk-in" ? "Walk-in" : (selectedCustomer?.name || "—")}</span>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold">{selectedBatch?.plant_name}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{qty} × Ksh {unitPrice.toFixed(2)}</span>
                  <span className="font-bold text-foreground">Ksh {totalAmount.toLocaleString()}</span>
                </div>
                {selectedBatch?.batch_code && (
                  <div className="text-xs text-muted-foreground">Batch: {selectedBatch.batch_code}</div>
                )}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>TOTAL</span><span>Ksh {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment</span><span>{paymentMethod}{mpesaRef ? ` — ${mpesaRef}` : ''}</span>
              </div>
              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                Thank you for your business!
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button
                className="flex-1 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-bold"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
