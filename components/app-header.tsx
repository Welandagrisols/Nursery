"use client"

import * as React from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

interface AppHeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  layout: "Nursery Layout",
  inventory: "Inventory",
  sales: "Sales",
  tasks: "Tasks",
  reports: "Reports",
  customers: "Customers",
  creditors: "Creditors",
  website: "Communications",
  settings: "Settings",
  ops: "Operations",
}

export function AppHeader({ activeTab }: AppHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const title = TAB_TITLES[activeTab] ?? ""

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2 h-9 w-9"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-base text-foreground truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
