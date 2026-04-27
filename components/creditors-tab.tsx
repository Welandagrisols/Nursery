"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, CheckCircle, AlertTriangle, TrendingDown, User, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreditSale {
  id: string
  sale_date: string
  quantity: number
  total_amount: number
  plant_name?: string
  batch_code?: string
  payment_method: string
  notes?: string
  customer?: {
    id: string
    name: string
    contact: string
  }
}

interface PaymentDialog {
  sale: CreditSale
  amount: string
  method: string
}

export function CreditorsTab() {
  const { toast } = useToast()
  const [sales, setSales] = useState<CreditSale[]>([])
  const [loading, setLoading] = useState(true)
  const [tableReady, setTableReady] = useState(true)
  const [payDialog, setPayDialog] = useState<PaymentDialog | null>(null)
  const [paying, setPaying] = useState(false)
  const [filter, setFilter] = useState<"all" | "outstanding" | "paid">("outstanding")

  useEffect(() => { fetchCreditSales() }, [])

  const fetchCreditSales = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from("vnms_sales") as any)
      .select("*, customer:vnms_customers(id, name, contact)")
      .or("payment_method.eq.Credit,payment_method.like.Credit%")
      .order("sale_date", { ascending: false })

    if (error?.code === "42P01") {
      setTableReady(false)
    } else {
      setSales(data ?? [])
      setTableReady(true)
    }
    setLoading(false)
  }

  const openPayDialog = (sale: CreditSale) => {
    setPayDialog({ sale, amount: String(sale.total_amount), method: "Cash" })
  }

  const markAsPaid = async () => {
    if (!payDialog) return
    const receivedAmount = Number(payDialog.amount)
    const expectedAmount = Number(payDialog.sale.total_amount)
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount received.", variant: "destructive" })
      return
    }
    if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
      toast({
        title: "Full settlement required",
        description: `This sale can only be closed when full amount (Ksh ${expectedAmount.toLocaleString()}) is collected.`,
        variant: "destructive",
      })
      return
    }

    setPaying(true)
    const { error } = await (supabase.from("vnms_sales") as any)
      .update({
        payment_method: `Credit (Paid — ${payDialog.method})`,
        payment_reference: `${payDialog.method}:${receivedAmount.toFixed(2)}`,
        notes: `${payDialog.sale.notes ?? ""} | Paid in full: Ksh ${receivedAmount.toFixed(2)} via ${payDialog.method} on ${new Date().toLocaleDateString()}`.trim(),
      })
      .eq("id", payDialog.sale.id)

    if (error) {
      toast({ title: "Error marking as paid", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Marked as paid!", description: `Ksh ${payDialog.amount} collected from ${payDialog.sale.customer?.name ?? "customer"}.` })
      setPayDialog(null)
      fetchCreditSales()
    }
    setPaying(false)
  }

  const isPaid = (s: CreditSale) => s.payment_method.toLowerCase().includes("paid")

  const outstanding = sales.filter(s => !isPaid(s))
  const paid = sales.filter(s => isPaid(s))
  const totalOutstanding = outstanding.reduce((sum, s) => sum + s.total_amount, 0)
  const totalCollected = paid.reduce((sum, s) => sum + s.total_amount, 0)

  const filtered = filter === "outstanding" ? outstanding : filter === "paid" ? paid : sales

  if (!tableReady) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mt-6">
        <p className="font-semibold mb-1">Sales table not set up</p>
        <p>Run the SQL migration script in Supabase to enable credit tracking.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="modern-header">
        <h1 className="modern-title">Creditors</h1>
        <p className="modern-subtitle">Track and collect outstanding credit sales</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-600 uppercase">Outstanding</span>
            </div>
            <p className="text-2xl font-black text-red-700">Ksh {totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-red-500 mt-0.5">{outstanding.length} unpaid {outstanding.length === 1 ? "sale" : "sales"}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase">Collected</span>
            </div>
            <p className="text-2xl font-black text-green-700">Ksh {totalCollected.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-0.5">{paid.length} paid {paid.length === 1 ? "sale" : "sales"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["outstanding","all","paid"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
              filter === f
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f === "outstanding" ? "Outstanding" : f === "paid" ? "Paid" : "All"}
          </button>
        ))}
      </div>

      {/* Sales list */}
      {loading ? (
        <p className="text-center text-gray-400 py-10">Loading credit sales...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {filter === "outstanding" ? "No outstanding credit sales" : "No credit sales found"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Credit sales appear here when payment method is set to "Credit" in the POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(sale => {
            const paid_ = isPaid(sale)
            return (
              <Card key={sale.id} className={cn("transition-all", paid_ && "opacity-70")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Customer */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 leading-tight">
                            {sale.customer?.name ?? "Walk-in Customer"}
                          </p>
                          {sale.customer?.contact && (
                            <a
                              href={`https://wa.me/${sale.customer.contact.replace(/\D/g,"")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-green-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              {sale.customer.contact}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Product & date */}
                      <p className="text-sm text-gray-600">
                        {sale.plant_name || sale.batch_code || "Seedlings"} — {sale.quantity.toLocaleString()} units
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(sale.sale_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {sale.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{sale.notes}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <p className={cn("text-xl font-black", paid_ ? "text-green-700" : "text-red-600")}>
                        Ksh {sale.total_amount.toLocaleString()}
                      </p>
                      {paid_ ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" /> Paid
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openPayDialog(sale)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 h-7"
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Mark as paid dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Mark Credit as Paid</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 pt-1">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-semibold text-gray-800">{payDialog.sale.customer?.name ?? "Walk-in Customer"}</p>
                <p className="text-sm text-gray-500">{payDialog.sale.plant_name || "Seedlings"} — {payDialog.sale.quantity.toLocaleString()} units</p>
                <p className="text-lg font-bold text-green-700 mt-1">Ksh {payDialog.sale.total_amount.toLocaleString()}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Amount Received (Ksh)</Label>
                <Input
                  type="number"
                  value={payDialog.amount}
                  onChange={e => setPayDialog(d => d ? { ...d, amount: e.target.value } : null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={payDialog.method} onValueChange={v => setPayDialog(d => d ? { ...d, method: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPayDialog(null)} disabled={paying}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={markAsPaid} disabled={paying}>
                  {paying ? "Saving..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
