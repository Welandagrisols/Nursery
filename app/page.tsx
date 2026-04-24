'use client';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DashboardTab } from '@/components/dashboard-tab';
import { InventoryTab } from '@/components/inventory-tab';
import { SalesTab } from '@/components/sales-tab';
import { CustomersTab } from '@/components/customers-tab';
import { TasksTab } from '@/components/tasks-tab';
import { ReportsTab } from '@/components/reports-tab';
import { CommsTab } from '@/components/comms-tab';
import { CreditorsTab } from '@/components/creditors-tab';
import { OpsTab } from '@/components/ops-tab';
import { NurseryLayoutTab } from '@/components/nursery-layout-tab';
import { SettingsTab } from '@/components/settings-tab';
import { AppSidebar } from '@/components/app-sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DemoModeBanner } from '@/components/demo-mode-banner';
import { ErrorBoundary } from '@/components/error-boundary';
import { isDemoMode } from '@/lib/supabase';
import { useRole, ROLE_TABS } from '@/contexts/role-context';
import { cn } from '@/lib/utils';

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-purple-600", manager: "bg-blue-600", sales: "bg-orange-500", worker: "bg-green-600",
}
const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", manager: "Manager", sales: "Sales", worker: "Farm Worker",
}
const ROLE_DEFAULT_TAB: Record<string, string> = {
  owner: "dashboard", manager: "dashboard", sales: "sales", worker: "tasks",
}

export default function HomePage() {
  const { effectiveRole, staffUser } = useRole()
  const [activeTab, setActiveTab] = useState(ROLE_DEFAULT_TAB[effectiveRole] ?? "dashboard")

  useEffect(() => {
    const defaultTab = ROLE_DEFAULT_TAB[effectiveRole] ?? "dashboard"
    const allowed = ROLE_TABS[effectiveRole]
    if (!allowed.includes(activeTab)) {
      setActiveTab(defaultTab)
    }
  }, [effectiveRole])

  const setTab = (tab: string) => {
    const allowed = ROLE_TABS[effectiveRole]
    if (allowed.includes(tab)) setActiveTab(tab)
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">

        {/* ── Sidebar: visible only on large screens ── */}
        <div className="hidden lg:flex">
          <SidebarProvider>
            <AppSidebar activeTab={activeTab} setActiveTab={setTab} />
            <SidebarInset className="flex-1 overflow-auto">
              {isDemoMode && <DemoModeBanner isDemoMode={isDemoMode} connectionStatus="demo" />}
              <main className="p-4 md:p-6 min-h-screen">
                <PageContent activeTab={activeTab} setActiveTab={setTab} />
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>

        {/* ── Touch layout: bottom nav + full-width content ── */}
        <div className="flex flex-col flex-1 lg:hidden min-h-screen">
          {/* Top title bar */}
          <header
            className="sticky top-0 z-20 border-b border-green-100 px-4 pb-3 flex items-center justify-between shadow-sm"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 1.75rem)',
              background: 'linear-gradient(135deg, #e8f5ee 0%, #f0f7ff 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #22A45D 0%, #16834a 100%)' }}
              >
                <span className="text-white font-black text-sm">GH</span>
              </div>
              <div>
                <p className="font-black text-sm leading-none" style={{ color: '#16834a' }}>Grace Harvest</p>
                <p className="text-xs text-gray-400 leading-none mt-0.5">Nursery Management</p>
              </div>
            </div>
            {staffUser && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm",
                  ROLE_COLOR[staffUser.role] ?? "bg-gray-500"
                )}>
                  {staffUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-700 leading-none">{staffUser.name}</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">{ROLE_LABEL[staffUser.role]}</p>
                </div>
              </div>
            )}
          </header>

          {isDemoMode && <DemoModeBanner isDemoMode={isDemoMode} connectionStatus="demo" />}

          {/* Scrollable content — padded at bottom to clear nav bar */}
          <main
            className="flex-1 overflow-auto p-4"
            style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
          >
            <PageContent activeTab={activeTab} setActiveTab={setTab} />
          </main>

          {/* Fixed bottom navigation */}
          <BottomNav activeTab={activeTab} setActiveTab={setTab} />
        </div>

      </div>
    </ErrorBoundary>
  )
}

function PageContent({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsContent value="dashboard"  className="mt-0"><DashboardTab /></TabsContent>
      <TabsContent value="inventory"  className="mt-0"><InventoryTab /></TabsContent>
      <TabsContent value="sales"      className="mt-0"><SalesTab /></TabsContent>
      <TabsContent value="customers"  className="mt-0"><CustomersTab /></TabsContent>
      <TabsContent value="tasks"      className="mt-0"><TasksTab /></TabsContent>
      <TabsContent value="reports"    className="mt-0"><ReportsTab /></TabsContent>
      <TabsContent value="website"    className="mt-0"><CommsTab /></TabsContent>
      <TabsContent value="creditors"  className="mt-0"><CreditorsTab /></TabsContent>
      <TabsContent value="ops"        className="mt-0"><OpsTab /></TabsContent>
      <TabsContent value="layout"     className="mt-0"><NurseryLayoutTab /></TabsContent>
      <TabsContent value="settings"   className="mt-0"><SettingsTab /></TabsContent>
    </Tabs>
  )
}
