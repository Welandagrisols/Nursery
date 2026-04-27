"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { compare } from "bcryptjs"

export type StaffRole = "owner" | "manager" | "sales" | "worker"

export interface StaffUser {
  id: string
  name: string
  role: StaffRole
}

export const ROLE_TABS: Record<StaffRole, string[]> = {
  owner:   ["dashboard", "layout", "inventory", "sales", "tasks", "reports", "customers", "creditors", "website", "settings", "ops"],
  manager: ["dashboard", "layout", "inventory", "sales", "tasks", "reports", "customers", "creditors", "website", "settings"],
  sales:   ["dashboard", "sales", "customers", "website"],
  worker:  ["tasks", "layout"],
}

interface RoleContextValue {
  staffUser: StaffUser | null
  effectiveRole: StaffRole
  isOwnerOrManager: boolean
  canAccess: (tab: string) => boolean
  loginStaff: (staffId: string, pin: string) => Promise<{ error?: string }>
  logoutStaff: () => void
}

const RoleContext = createContext<RoleContextValue>({
  staffUser: null,
  effectiveRole: "owner",
  isOwnerOrManager: true,
  canAccess: () => true,
  loginStaff: async () => ({}),
  logoutStaff: () => {},
})

export function useRole() {
  return useContext(RoleContext)
}

const STORAGE_KEY = "vnms_staff_session"

export function RoleProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setStaffUser(JSON.parse(stored))
    } catch {}
  }, [])

  const loginStaff = async (staffId: string, pin: string): Promise<{ error?: string }> => {
    try {
      if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits." }

      const { data, error } = await (supabase.from("vnms_staff") as any)
        .select("id, name, role, pin_hash")
        .eq("id", staffId)
        .eq("is_active", true)
        .single()

      if (error || !data) return { error: "Staff member not found." }
      const isValidPin = await compare(pin, data.pin_hash)
      if (!isValidPin) return { error: "Wrong PIN. Try again." }

      const user: StaffUser = { id: data.id, name: data.name, role: data.role }
      setStaffUser(user)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return {}
    } catch (e: any) {
      return { error: e.message || "Login failed." }
    }
  }

  const logoutStaff = () => {
    setStaffUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const effectiveRole: StaffRole = staffUser ? staffUser.role : "owner"
  const allowedTabs = ROLE_TABS[effectiveRole]

  return (
    <RoleContext.Provider value={{
      staffUser,
      effectiveRole,
      isOwnerOrManager: effectiveRole === "owner" || effectiveRole === "manager",
      canAccess: (tab: string) => allowedTabs.includes(tab),
      loginStaff,
      logoutStaff,
    }}>
      {children}
    </RoleContext.Provider>
  )
}
