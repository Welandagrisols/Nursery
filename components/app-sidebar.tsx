"use client"

import * as React from "react"
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  CheckSquare,
  FileText,
  Settings,
  MessageCircle,
  LogOut,
  Map,
  SlidersHorizontal,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils" // Import cn for className merging

const navigationItems = [
  { id: "dashboard", title: "Dashboard", icon: BarChart3 },
  { id: "inventory", title: "Inventory", icon: Package },
  { id: "layout", title: "Nursery Layout", icon: Map },
  { id: "sales", title: "Sales", icon: ShoppingCart },
  { id: "customers", title: "Customers", icon: Users },
  { id: "tasks", title: "Tasks", icon: CheckSquare },
  { id: "reports", title: "Reports", icon: FileText },
  { id: "website", title: "Comms", icon: MessageCircle },
  { id: "ops", title: "Operations", icon: Settings },
  { id: "settings", title: "Settings", icon: SlidersHorizontal },
]

interface AppSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function AppSidebar({ activeTab, setActiveTab }: AppSidebarProps) {
  const { signOut, user } = useAuth()
  const { setOpenMobile, isMobile, open } = useSidebar()

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId)
    // Auto-close sidebar on mobile when tab is selected
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar className="border-r-0 md:border-r bg-gray-50">
      <SidebarHeader className="p-4 sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
        {/* Updated Header Content */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold text-sm" style={{color: '#22A45D'}}>Grace Harvest Seedlings</span>
            <span className="text-xs text-muted-foreground">Nursery Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-50 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabSelect(item.id)}
                    isActive={activeTab === item.id}
                    className={cn(
                      "transition-all duration-200 rounded-lg group h-12 text-base font-semibold border",
                      activeTab === item.id 
                        ? "text-white shadow-md border-green-600" 
                        : "hover:bg-green-50 hover:border-green-200 bg-white border-gray-200 text-gray-800"
                    )}
                    style={activeTab === item.id ? {backgroundColor: '#4CB76F'} : {}}
                  >
                    <item.icon 
                      className="mr-3 h-5 w-5 transition-colors duration-200 flex-shrink-0"
                      style={
                        activeTab === item.id 
                          ? {color: 'white'} 
                          : {color: '#4CB76F'}
                      }
                      onMouseEnter={(e) => {
                        if (activeTab !== item.id) {
                          e.currentTarget.style.color = '#FF7A29';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== item.id) {
                          e.currentTarget.style.color = '#4CB76F';
                        }
                      }}
                    />
                    <span 
                      className="font-semibold text-base leading-tight"
                      style={
                        activeTab === item.id 
                          ? {color: 'white'} 
                          : {color: '#1a1a1a', fontWeight: '600'}
                      }
                    >
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 sticky bottom-0 bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="space-y-2">
          {user && (
            <div className="text-sm font-medium text-gray-700 bg-white px-2 py-1 rounded border">
              {user.email}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}