
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

export function AppHeader({ activeTab, setActiveTab }: AppHeaderProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo and Menu Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col leading-none">
            <span className="font-semibold" style={{color: '#22A45D'}}>Grace Harvest Seedlings</span>
            <span className="text-xs hidden sm:block text-muted-foreground">Nursery Management</span>
          </div>
        </div>
        {/* Theme Toggle */}
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
