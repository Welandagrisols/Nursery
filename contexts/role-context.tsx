"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"

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

const DEMO_STAFF: StaffUser[] = [
  { id: "demo-owner",   name: "Grace (Owner)",   role: "owner" },
  { id: "demo-manager", name: "Mary (Manager)",  role: "manager" },
  { id: "demo-sales",   name: "John (Sales)",    role: "sales" },
  { id: "demo-worker",  name: "Samuel (Worker)", role: "worker" },
]

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

      if (isDemoMode) {
        const demoUser = DEMO_STAFF.find(s => s.id === staffId)
        if (!demoUser) return { error: "Staff member not found." }
        if (pin !== "1234") return { error: "Wrong PIN. Try again. (Demo PIN: 1234)" }
        setStaffUser(demoUser)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
        return {}
      }

      const { data, error } = await (supabase.rpc as any)("vnms_verify_staff_pin", {
        p_staff_id: staffId,
        p_pin: pin,
      })

      if (error) return { error: "Login failed. Please try again." }
      if (!data || (data as any[]).length === 0) return { error: "Wrong PIN. Try again." }

      const row = (data as any[])[0]
      const user: StaffUser = { id: row.id, name: row.name, role: row.role as StaffRole }
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

export { DEMO_STAFF }
