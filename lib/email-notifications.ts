
import { supabase } from './supabase'

// Email configuration
const NOTIFICATION_EMAILS = [
  'chepkoechjoan55@gmail.com',
  'wesleykoech2022@gmail.com'
]

export interface NotificationData {
  type: 'low_stock' | 'new_sale' | 'task_due' | 'inventory_update'
  title: string
  message: string
  data?: any
}

export const sendEmailNotification = async (notification: NotificationData) => {
  try {
    // Store notification in database for email service to pick up
    const { error } = await (supabase.from('email_notifications') as any)
      .insert({
        recipient_emails: NOTIFICATION_EMAILS,
        notification_type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error storing email notification:', error)
      return false
    }

    console.log('Email notification queued successfully')
    return true
  } catch (error) {
    console.error('Failed to queue email notification:', error)
    return false
  }
}

// Notification templates
export const createLowStockNotification = (items: any[]): NotificationData => ({
  type: 'low_stock',
  title: 'Low Stock Alert - Grace Harvest Seedlings',
  message: `Warning: ${items.length} item(s) are running low on stock:\n\n` +
    items.map(item => `• ${item.plant_name}: ${item.quantity} remaining`).join('\n') +
    '\n\nPlease restock these items soon.',
  data: { items }
})

export const createNewSaleNotification = (sale: any): NotificationData => ({
  type: 'new_sale',
  title: 'New Sale Recorded - Grace Harvest Seedlings',
  message: `A new sale has been recorded:\n\n` +
    `Customer: ${sale.customer_name}\n` +
    `Total Amount: $${sale.total_amount.toFixed(2)}\n` +
    `Date: ${new Date(sale.sale_date).toLocaleDateString()}\n\n` +
    `Items sold: ${sale.items?.length || 0} item(s)`,
  data: { sale }
})

export const createTaskDueNotification = (tasks: any[]): NotificationData => ({
  type: 'task_due',
  title: 'Tasks Due Today - Grace Harvest Seedlings',
  message: `You have ${tasks.length} task(s) due today:\n\n` +
    tasks.map(task => `• ${task.title} - ${task.description || 'No description'}`).join('\n') +
    '\n\nPlease complete these tasks as scheduled.',
  data: { tasks }
})

export const createInventoryUpdateNotification = (item: any, action: string): NotificationData => ({
  type: 'inventory_update',
  title: 'Inventory Updated - Grace Harvest Seedlings',
  message: `Inventory has been ${action}:\n\n` +
    `Seedling: ${item.plant_name}\n` +
    `Quantity: ${item.quantity}\n` +
    `Status: ${item.status}\n` +
    `Updated: ${new Date().toLocaleString()}`,
  data: { item, action }
})
