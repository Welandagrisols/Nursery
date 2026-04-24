"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Menu, 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  CheckSquare, 
  FileText, 
  Settings,
  Globe,
  Bell
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";


interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "customers", label: "Customers", icon: Users },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "ops", label: "Operations", icon: Settings },
  { id: "website", label: "Website", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell }
]

export function Header({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const isMobile = useIsMobile()

  const NavigationContent = () => (
    <div className="flex flex-col space-y-2 p-4">
      {navigationItems.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className="justify-start w-full"
            onClick={() => {
              setActiveTab(item.id)
              setMobileMenuOpen(false)
            }}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        )
      })}
    </div>
  )

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div>
                <h1 className="text-xl font-bold">Grace Harvest Seedlings</h1>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex space-x-1">
              {navigationItems.slice(0, 6).map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                )
              })}
            </nav>
          )}

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            {/* Mobile Menu */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="mt-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <div>
                        <h2 className="text-lg font-bold">Grace Harvest Seedlings</h2>
                      </div>
                    </div>
                    <NavigationContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
