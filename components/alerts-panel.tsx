
"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, TrendingDown, Calendar, DollarSign, Bell, X } from "lucide-react"

interface AlertsPanelProps {
  inventory: any[]
  sales: any[]
}

export function AlertsPanel({ inventory, sales }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newAlerts = []

    // Low stock alerts
    const lowStockItems = inventory.filter(item => 
      item.quantity <= 5 && item.status !== 'Sold'
    )
    if (lowStockItems.length > 0) {
      newAlerts.push({
        id: 'low-stock',
        type: 'warning',
        title: `Low Stock Alert (${lowStockItems.length} items)`,
        description: `${lowStockItems.map(item => item.plant_name).join(', ')} running low`,
        icon: TrendingDown,
        items: lowStockItems
      })
    }

    // Critical status items
    const criticalItems = inventory.filter(item => item.status === 'Critical')
    if (criticalItems.length > 0) {
      newAlerts.push({
        id: 'critical-status',
        type: 'destructive',
        title: `Critical Plants (${criticalItems.length})`,
        description: `Plants need immediate attention`,
        icon: AlertTriangle,
        items: criticalItems
      })
    }

    // High value items with low quantity
    const highValueLowStock = inventory.filter(item => 
      item.price > 1000 && item.quantity <= 3 && item.status !== 'Sold'
    )
    if (highValueLowStock.length > 0) {
      newAlerts.push({
        id: 'high-value-low-stock',
        type: 'default',
        title: `High-Value Items Low Stock`,
        description: `Expensive items running low`,
        icon: DollarSign,
        items: highValueLowStock
      })
    }

    // Recently planted items (within 30 days) that might need attention
    const recentlyPlanted = inventory.filter(item => {
      if (!item.date_planted) return false
      const plantedDate = new Date(item.date_planted)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return plantedDate > thirtyDaysAgo
    })
    if (recentlyPlanted.length > 0) {
      newAlerts.push({
        id: 'recently-planted',
        type: 'default',
        title: `Recently Planted (${recentlyPlanted.length})`,
        description: `Monitor for early growth issues`,
        icon: Calendar,
        items: recentlyPlanted
      })
    }

    setAlerts(newAlerts.filter(alert => !dismissedAlerts.has(alert.id)))
  }, [inventory, sales, dismissedAlerts])

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(Array.from(prev).concat(alertId)))
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No alerts at this time. All systems running smoothly!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alerts & Notifications
          <Badge variant="secondary">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const Icon = alert.icon
          return (
            <Alert key={alert.id} variant={alert.type}>
              <Icon className="h-4 w-4" />
              <div className="flex justify-between items-start">
                <div>
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.description}</AlertDescription>
                  {alert.items && alert.items.length <= 3 && (
                    <div className="mt-2 space-y-1">
                      {alert.items.map((item: any) => (
                        <div key={item.id} className="text-xs">
                          • {item.plant_name} - Qty: {item.quantity}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Alert>
          )
        })}
      </CardContent>
    </Card>
  )
}
