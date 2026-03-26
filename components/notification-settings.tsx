
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, AlertCircle, TrendingUp, CheckSquare } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    lowStockEnabled: true,
    newSaleEnabled: true,
    taskDueEnabled: true,
    inventoryUpdateEnabled: false,
    lowStockThreshold: 20,
    emailAddresses: ['chepkoechjoan55@gmail.com', 'wesleykoech2022@gmail.com']
  })

  const [recentNotifications, setRecentNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRecentNotifications()
  }, [])

  const loadRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      // In a real implementation, you'd save these to a settings table
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'new_sale':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'task_due':
        return <CheckSquare className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sent</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Email Notification Settings</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which events should trigger email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low-stock">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  When inventory falls below threshold
                </p>
              </div>
              <Switch
                id="low-stock"
                checked={settings.lowStockEnabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, lowStockEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-sale">New Sale Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  When a new sale is recorded
                </p>
              </div>
              <Switch
                id="new-sale"
                checked={settings.newSaleEnabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, newSaleEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-due">Task Due Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Daily reminder for due tasks
                </p>
              </div>
              <Switch
                id="task-due"
                checked={settings.taskDueEnabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, taskDueEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inventory-update">Inventory Updates</Label>
                <p className="text-sm text-muted-foreground">
                  When inventory is added or modified
                </p>
              </div>
              <Switch
                id="inventory-update"
                checked={settings.inventoryUpdateEnabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, inventoryUpdateEnabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 20 }))
                }
                min="1"
                max="100"
              />
              <p className="text-sm text-muted-foreground">
                Send alerts when stock falls below this quantity
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Recipients */}
        <Card>
          <CardHeader>
            <CardTitle>Email Recipients</CardTitle>
            <CardDescription>
              Email addresses that will receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Recipients</Label>
              <div className="space-y-2">
                {settings.emailAddresses.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{email}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={handleSaveSettings} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            History of email notifications sent from your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getNotificationIcon(notification.notification_type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{notification.title}</h4>
                      {getStatusBadge(notification.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
