"use client"

import { useState } from "react"
import {
  BarChart3, Package, Map, ShoppingCart,
  CheckSquare, FileText, MoreHorizontal,
  Users, SlidersHorizontal, Settings, X, LogOut,
  CreditCard, MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useRole, ROLE_TABS } from "@/contexts/role-context"

const ALL_PRIMARY = [
  { id: "dashboard",  label: "Dashboard",  icon: BarChart3 },
  { id: "layout",     label: "Layout",     icon: Map },
  { id: "inventory",  label: "Inventory",  icon: Package },
  { id: "sales",      label: "Sales",      icon: ShoppingCart },
  { id: "tasks",      label: "Tasks",      icon: CheckSquare },
  { id: "reports",    label: "Reports",    icon: FileText },
]

const ALL_MORE = [
  { id: "customers",  label: "Customers",   icon: Users },
  { id: "creditors",  label: "Creditors",   icon: CreditCard },
  { id: "website",    label: "Comms",        icon: MessageCircle },
  { id: "settings",   label: "Settings",    icon: SlidersHorizontal },
  { id: "ops",        label: "Operations",  icon: Settings },
]

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-purple-600", manager: "bg-blue-600", sales: "bg-orange-500", worker: "bg-green-600",
}
const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", manager: "Manager", sales: "Sales", worker: "Farm Worker",
}

interface Props {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function BottomNav({ activeTab, setActiveTab }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { signOut, user } = useAuth()
  const { staffUser, effectiveRole, logoutStaff } = useRole()

  const allowed = ROLE_TABS[effectiveRole]
  const primaryNav = ALL_PRIMARY.filter(n => allowed.includes(n.id))
  const moreNav = ALL_MORE.filter(n => allowed.includes(n.id))
  const isMoreActive = moreNav.some(n => n.id === activeTab)

  function handleSelect(id: string) {
    setActiveTab(id)
    setMoreOpen(false)
  }

  function handleSignOut() {
    if (staffUser) {
      logoutStaff()
    } else {
      signOut()
    }
    setMoreOpen(false)
  }

  const showMoreButton = moreNav.length > 0

  return (
    <>
      {/* "More" tray */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-[72px] left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-5 pb-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base text-gray-700">More</span>
              <button onClick={() => setMoreOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {moreNav.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {moreNav.map(item => {
                  const Icon = item.icon
                  const active = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-95",
                        active
                          ? "bg-green-600 text-white shadow-md"
                          : "bg-gray-50 text-gray-600 hover:bg-green-50"
                      )}
                    >
                      <Icon className="h-7 w-7" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Signed-in user info + sign out */}
            <div className="border-t pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {staffUser ? (
                  <>
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0",
                      ROLE_COLOR[staffUser.role] ?? "bg-gray-500"
                    )}>
                      {staffUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{staffUser.name}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABEL[staffUser.role] ?? staffUser.role}</p>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 truncate">{user?.email}</span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-red-500 font-semibold bg-red-50 px-4 py-2 rounded-xl shrink-0"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-[72px] pt-1">
          {primaryNav.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setMoreOpen(false); setActiveTab(item.id) }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative",
                  active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-600 rounded-b-full" />
                )}
                <Icon className={cn("h-6 w-6 transition-all", active && "scale-110")} />
                <span className={cn("text-[10px] font-semibold leading-none", active ? "text-green-600" : "text-gray-400")}>
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* More button — only show if there are more items or need sign out */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative",
              isMoreActive || moreOpen ? "text-green-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {(isMoreActive || moreOpen) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-600 rounded-b-full" />
            )}
            <MoreHorizontal className={cn("h-6 w-6 transition-all", (isMoreActive || moreOpen) && "scale-110")} />
            <span className={cn("text-[10px] font-semibold leading-none", (isMoreActive || moreOpen) ? "text-green-600" : "text-gray-400")}>
              More
            </span>
          </button>
        </div>

        <div className="h-safe-bottom bg-white" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>
    </>
  )
}
