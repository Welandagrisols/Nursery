"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { hash } from "bcryptjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useRole } from "@/contexts/role-context"
import { Users, Plus, Edit2, UserX, UserCheck, Key, ShieldAlert, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface StaffMember {
  id: string
  name: string
  role: string
  is_active: boolean
  notes?: string
}

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager",     desc: "Full access except owner settings" },
  { value: "sales",   label: "Sales Staff", desc: "Sales, customers & dashboard only" },
  { value: "worker",  label: "Farm Worker", desc: "Tasks and nursery layout only" },
]

const ROLE_COLOR: Record<string, string> = {
  owner:   "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  sales:   "bg-orange-100 text-orange-700 border-orange-200",
  worker:  "bg-green-100 text-green-700 border-green-200",
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", manager: "Manager", sales: "Sales Staff", worker: "Farm Worker",
}

const AVATAR_BG: Record<string, string> = {
  owner: "bg-purple-600", manager: "bg-blue-600", sales: "bg-orange-500", worker: "bg-green-600",
}

const BLANK: { name: string; role: string; pin: string; notes: string } = {
  name: "", role: "worker", pin: "", notes: "",
}

export function StaffManagement() {
  const { isOwnerOrManager, effectiveRole } = useRole()
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(false)

  useEffect(() => { loadStaff() }, [])

  const loadStaff = async () => {
    setLoading(true)
    if (isDemoMode) { setLoading(false); return }
    try {
      const { data, error } = await (supabase.from("vnms_staff") as any)
        .select("id, name, role, is_active, notes")
        .order("name")
      if (!error) setStaff(data ?? [])
    } catch {}
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(BLANK)
    setShowPin(false)
    setDialogOpen(true)
  }

  const openEdit = (s: StaffMember) => {
    setEditing(s)
    setForm({ name: s.name, role: s.role, pin: "", notes: s.notes ?? "" })
    setShowPin(false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      return toast({ title: "Name required", variant: "destructive" })
    }
    if (!editing && (!form.pin || !/^\d{4}$/.test(form.pin))) {
      return toast({ title: "PIN required — must be exactly 4 digits", variant: "destructive" })
    }
    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      return toast({ title: "PIN must be exactly 4 digits", variant: "destructive" })
    }

    setSaving(true)
    try {
      if (editing) {
        const payload: any = {
          name: form.name.trim(),
          role: form.role,
          notes: form.notes.trim(),
          updated_at: new Date().toISOString(),
        }
        // Only update PIN if a new one was provided — hash it properly
        if (form.pin) {
          payload.pin_hash = await hash(form.pin, 10)
        }
        const { error } = await (supabase.from("vnms_staff") as any)
          .update(payload)
          .eq("id", editing.id)
        if (error) throw error
        toast({ title: "Staff updated", description: form.pin ? "PIN changed successfully." : undefined })
      } else {
        // Hash the PIN before storing — never store plain text PINs
        const pinHash = await hash(form.pin, 10)
        const { error } = await (supabase.from("vnms_staff") as any)
          .insert({
            name: form.name.trim(),
            role: form.role,
            pin_hash: pinHash,
            notes: form.notes.trim(),
            is_active: true,
          })
        if (error) throw error
        toast({
          title: `${form.name.trim()} added`,
          description: `They can now log in with PIN ${form.pin}.`,
        })
      }
      setDialogOpen(false)
      loadStaff()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: StaffMember) => {
    const { error } = await (supabase.from("vnms_staff") as any)
      .update({ is_active: !s.is_active, updated_at: new Date().toISOString() })
      .eq("id", s.id)
    if (!error) {
      toast({ title: s.is_active ? `${s.name} deactivated` : `${s.name} reactivated` })
      loadStaff()
    }
  }

  // Access guard
  if (!isOwnerOrManager) {
    return (
      <div className="text-center py-12 text-gray-400">
        <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Only managers and the owner can manage staff accounts.</p>
      </div>
    )
  }

  // Demo mode notice
  if (isDemoMode) {
    return (
      <Card className="border-dashed border-amber-300 bg-amber-50">
        <CardContent className="py-8 text-center space-y-2">
          <Users className="h-10 w-10 mx-auto text-amber-400" />
          <p className="font-semibold text-amber-800">Staff management requires a live database</p>
          <p className="text-sm text-amber-700">
            Connect your Supabase credentials to add and manage staff accounts.
          </p>
        </CardContent>
      </Card>
    )
  }

  const active = staff.filter(s => s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">Staff Accounts</h3>
          <p className="text-sm text-gray-500">
            {loading ? "Loading..." : `${active.length} active${inactive.length ? ` · ${inactive.length} inactive` : ""}`}
          </p>
        </div>
        <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {/* How it works info box */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 flex gap-2">
        <Key className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
        <p>
          Each staff member logs in from the <strong>Farm Staff</strong> button on the login screen —
          they select their name and enter their 4-digit PIN. No email or password needed.
        </p>
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-10">
            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600 mb-1">No staff accounts yet</p>
            <p className="text-sm text-gray-400 mb-4">Add your first staff member so they can log in with a PIN</p>
            <Button onClick={openAdd} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Active staff */}
          {active.map(s => (
            <StaffCard
              key={s.id} s={s} effectiveRole={effectiveRole}
              onEdit={() => openEdit(s)} onToggle={() => toggleActive(s)}
            />
          ))}

          {/* Inactive staff (collapsed section) */}
          {inactive.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                Inactive ({inactive.length})
              </p>
              {inactive.map(s => (
                <StaffCard
                  key={s.id} s={s} effectiveRole={effectiveRole}
                  onEdit={() => openEdit(s)} onToggle={() => toggleActive(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <><Edit2 className="h-4 w-4" /> Edit Staff Member</> : <><Plus className="h-4 w-4" /> Add Staff Member</>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. John Kamau"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={saving}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <p className="font-medium">{r.label}</p>
                        <p className="text-xs text-gray-400">{r.desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PIN */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                {editing ? "New PIN (leave blank to keep current)" : "4-Digit PIN *"}
              </Label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  placeholder={editing ? "Enter new PIN to change it" : "e.g. 4821"}
                  maxLength={4}
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="font-mono text-xl tracking-[0.6em] pr-16 text-center"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Staff enter this PIN on a number pad to clock in. Keep it private.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Section A supervisor"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                disabled={saving}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline" className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StaffCard({
  s, effectiveRole, onEdit, onToggle,
}: {
  s: StaffMember
  effectiveRole: string
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <Card className={cn("transition-all", !s.is_active && "opacity-55")}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0",
            AVATAR_BG[s.role] ?? "bg-gray-500"
          )}>
            {s.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{s.name}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                ROLE_COLOR[s.role] ?? "bg-gray-100 text-gray-600 border-gray-200"
              )}>
                {ROLE_LABEL[s.role] ?? s.role}
              </span>
              {!s.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
                  Inactive
                </span>
              )}
            </div>
            {s.notes && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{s.notes}</p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              size="sm" variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            {effectiveRole === "owner" && (
              <Button
                size="sm" variant="ghost"
                onClick={onToggle}
                className={cn(
                  "h-8 w-8 p-0",
                  s.is_active
                    ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                    : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                )}
                title={s.is_active ? "Deactivate" : "Reactivate"}
              >
                {s.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
