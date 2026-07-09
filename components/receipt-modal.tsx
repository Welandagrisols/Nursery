"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, MessageCircle, X } from "lucide-react"

export interface ReceiptSale {
  id: string
  sale_date: string
  quantity: number
  total_amount: number
  plant_name?: string
  batch_code?: string
  payment_method?: string
  payment_reference?: string
  receipt_number?: string
  notes?: string
  customer?: {
    name: string
    contact: string
  }
}

interface Props {
  sale: ReceiptSale | null
  onClose: () => void
}

function formatReceiptDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function getNurseryName() {
  if (typeof window === "undefined") return "My Nursery"
  return localStorage.getItem("vnms_nursery_name") || "My Nursery"
}

function getNurseryLogo() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("vnms_nursery_logo") || ""
}
function getNurseryPhone() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("vnms_nursery_phone") || ""
}
function getNurseryTagline() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("vnms_nursery_tagline") || ""
}

function buildWhatsAppText(sale: ReceiptSale): string {
  const nurseryName = getNurseryName()
  const lines = [
    `🌱 *${nurseryName.toUpperCase()}*`,
    `📍 Nursery Management`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    sale.receipt_number ? `🧾 Receipt: *${sale.receipt_number}*` : `🧾 Sale Record`,
    `📅 Date: ${formatReceiptDate(sale.sale_date)}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🌿 *${sale.plant_name || sale.batch_code || "Seedlings"}*`,
    `   ${sale.quantity.toLocaleString()} seedlings`,
    ``,
    `💰 *TOTAL: Ksh ${sale.total_amount.toLocaleString()}*`,
    ``,
    `💳 Payment: ${sale.payment_method || "Cash"}${sale.payment_reference ? ` (${sale.payment_reference})` : ""}`,
    sale.customer ? `👤 Customer: ${sale.customer.name}` : `👤 Customer: Walk-in`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `✅ *Thank you for your business!*`,
    getNurseryPhone() ? `📞 ${getNurseryPhone()}` : ``,
    getNurseryTagline() ? `_${getNurseryTagline()}_` : ``,
    `_${nurseryName}_`,
  ].filter(l => l !== "")
  return lines.join("\n")
}

function printReceipt(sale: ReceiptSale) {
  const unitPrice = sale.quantity > 0 ? (sale.total_amount / sale.quantity).toFixed(2) : "0"
  const dateStr = formatReceiptDate(sale.sale_date)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${sale.receipt_number || ""}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      color: #000;
      width: 80mm;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 9pt; }
    .row { display: flex; justify-content: space-between; margin: 1mm 0; }
    .divider { border-top: 1px dashed #000; margin: 2mm 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 13pt; font-weight: bold; margin: 2mm 0; }
  </style>
</head>
<body>
  ${getNurseryLogo()
    ? `<div class="center" style="margin-bottom:3mm;"><img src="${getNurseryLogo()}" alt="" style="max-height:20mm; max-width:60mm; object-fit:contain;" /></div>`
    : `<div class="center bold" style="font-size:13pt; margin-bottom:2mm;">${getNurseryName().toUpperCase()}</div>`
  }
  <div class="center small">${getNurseryLogo() ? `<strong>${getNurseryName()}</strong>` : "Vegetable Nursery Management"}</div>
  <div class="divider"></div>
  ${sale.receipt_number ? `<div class="row"><span>Receipt #</span><span class="bold">${sale.receipt_number}</span></div>` : ""}
  <div class="row"><span>Date</span><span>${dateStr}</span></div>
  <div class="row"><span>Customer</span><span>${sale.customer?.name || "Walk-in"}</span></div>
  ${sale.customer?.contact ? `<div class="row"><span>Contact</span><span>${sale.customer.contact}</span></div>` : ""}
  <div class="divider"></div>
  <div class="bold">${sale.plant_name || sale.batch_code || "Seedlings"}</div>
  <div class="row small">
    <span>${sale.quantity.toLocaleString()} × Ksh ${unitPrice}</span>
    <span class="bold">Ksh ${sale.total_amount.toLocaleString()}</span>
  </div>
  ${sale.batch_code ? `<div class="small">Batch: ${sale.batch_code}</div>` : ""}
  <div class="divider"></div>
  <div class="total-row"><span>TOTAL</span><span>Ksh ${sale.total_amount.toLocaleString()}</span></div>
  <div class="row small"><span>Payment</span><span>${sale.payment_method || "Cash"}${sale.payment_reference ? ` (${sale.payment_reference})` : ""}</span></div>
  <div class="divider"></div>
  ${getNurseryPhone() ? `<div class="center small">📞 ${getNurseryPhone()}</div>` : ""}
  <div class="center small" style="margin-top:2mm;">Thank you for your business!</div>
  ${getNurseryTagline() ? `<div class="center small" style="font-style:italic; margin-top:1mm;">${getNurseryTagline()}</div>` : ""}
  <div class="center small" style="margin-top:1mm;">${getNurseryName()}</div>
  <br/><br/>
</body>
</html>`

  const win = window.open("", "_blank", "width=300,height=600")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

export function ReceiptModal({ sale, onClose }: Props) {
  if (!sale) return null
  const s = sale

  const unitPrice = s.quantity > 0 ? (s.total_amount / s.quantity).toFixed(2) : "0"

  function handleWhatsApp() {
    const text = encodeURIComponent(buildWhatsAppText(s))
    const phone = (s.customer?.contact || "").replace(/\D/g, "")
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
    window.open(url, "_blank")
  }

  return (
    <Dialog open={!!sale} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm mx-4 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b">
          <h2 className="font-bold text-base">Receipt</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt */}
        <div className="px-4 py-3">
          <div className="font-mono text-sm bg-white border rounded-xl p-4 space-y-2">
            <div className="text-center font-bold text-base border-b pb-2">
              GRACE HARVEST SEEDLINGS<br />
              <span className="text-xs font-normal text-gray-500">Vegetable Nursery</span>
            </div>

            {sale.receipt_number && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Receipt #</span>
                <span className="font-bold">{sale.receipt_number}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Date</span>
              <span>{formatReceiptDate(sale.sale_date)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Customer</span>
              <span>{sale.customer?.name || "Walk-in"}</span>
            </div>
            {sale.customer?.contact && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Contact</span>
                <span>{sale.customer.contact}</span>
              </div>
            )}

            <div className="border-t pt-2 space-y-1">
              <p className="font-semibold text-sm">{sale.plant_name || sale.batch_code || "Seedlings"}</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{sale.quantity.toLocaleString()} × Ksh {unitPrice}</span>
                <span className="font-bold">Ksh {sale.total_amount.toLocaleString()}</span>
              </div>
              {sale.batch_code && (
                <div className="text-xs text-gray-400">Batch: {sale.batch_code}</div>
              )}
            </div>

            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span className="text-green-700">Ksh {sale.total_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Payment</span>
              <span>{sale.payment_method || "Cash"}{sale.payment_reference ? ` — ${sale.payment_reference}` : ""}</span>
            </div>
            {sale.notes && (
              <div className="text-xs text-gray-400 italic border-t pt-1">{sale.notes}</div>
            )}
            <div className="text-center text-xs text-gray-400 pt-2 border-t">
              Thank you for your business!
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => printReceipt(sale)}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            className="flex-1 gap-2 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-bold"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
