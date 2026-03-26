"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useRole } from "@/contexts/role-context"
import { Users, Plus, Edit2, UserX, UserCheck, Key } from "lucide-react"
import { cn } from "@/lib/utils"

interface StaffMember {
  id: string
  name: string
  role: string
  pin: string
  is_active: boolean
  created_at: string
  notes?: string
}

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager", desc: "Full access except owner settings" },
  { value: "sales",   label: "Sales Staff", desc: "Sales, Customers, Dashboard only" },
  { value: "worker",  label: "Farm Worker", desc: "Tasks and Nursery Layout only" },
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

const AVATAR_COLOR: Record<string, string> = {
  owner: "bg-purple-600", manager: "bg-blue-600", sales: "bg-orange-500", worker: "bg-green-600",
}

const BLANK_FORM = { name: "", role: "worker", pin: "", notes: "" }

export function StaffManagement() {
  const { isOwnerOrManager, effectiveRole } = useRole()
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [tableReady, setTableReady] = useState(true)

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from("vnms_staff") as any)
      .select("*")
      .order("name")

    if (error?.code === "42P01") {
      setTableReady(false)
    } else {
      setStaff(data ?? [])
      setTableReady(true)
    }
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(BLANK_FORM)
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
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" })
    if (!editing && (!form.pin || form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))) {
      return toast({ title: "PIN must be exactly 4 digits", variant: "destructive" })
    }
    if (form.pin && (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))) {
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
        if (form.pin) payload.pin = form.pin

        const { error } = await (supabase.from("vnms_staff") as any)
          .update(payload)
          .eq("id", editing.id)
        if (error) throw error
        toast({ title: "Staff updated" })
      } else {
        const { error } = await (supabase.from("vnms_staff") as any)
          .insert({
            name: form.name.trim(),
            role: form.role,
            pin: form.pin,
            notes: form.notes.trim(),
            is_active: true,
          })
        if (error) throw error
        toast({ title: "Staff added", description: `${form.name} can now log in with their PIN.` })
      }

      setDialogOpen(false)
      fetchStaff()
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
      fetchStaff()
    }
  }

  if (!isOwnerOrManager) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Only managers can view staff accounts.</p>
      </div>
    )
  }

  if (!tableReady) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Staff table not set up yet</p>
        <p>Run the SQL in <code className="bg-amber-100 px-1 rounded">scripts/vnms-staff-migration.sql</code> in your Supabase dashboard to enable staff management.</p>
      </div>
    )
  }

  const active = staff.filter(s => s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">Staff Accounts</h3>
          <p className="text-sm text-gray-500">{active.length} active · {inactive.length} inactive</p>
        </div>
        <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading...</p>
      ) : staff.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-10">
            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600 mb-1">No staff accounts yet</p>
            <p className="text-sm text-gray-400 mb-4">Add staff so they can log in with a PIN</p>
            <Button onClick={openAdd} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {staff.map(s => (
            <Card key={s.id} className={cn("transition-all", !s.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0",
                    AVATAR_COLOR[s.role] ?? "bg-gray-500"
                  )}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{s.name}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", ROLE_COLOR[s.role])}>
                        {ROLE_LABEL[s.role] ?? s.role}
                      </span>
                      {!s.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.notes}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {effectiveRole === "owner" && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => toggleActive(s)}
                        className={cn("h-8 w-8 p-0", s.is_active ? "text-gray-400 hover:text-red-500" : "text-gray-400 hover:text-green-600")}
                      >
                        {s.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. John Kamau"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
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

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                {editing ? "New PIN (leave blank to keep current)" : "4-Digit PIN"}
              </Label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  placeholder="e.g. 4821"
                  maxLength={4}
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="font-mono text-lg tracking-[0.5em] pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-gray-400">Staff will enter this on a big number pad to log in.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Section A supervisor"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
