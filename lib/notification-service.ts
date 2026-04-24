import { supabase } from './supabase';
import { 
  sendEmailNotification, 
  createLowStockNotification, 
  createNewSaleNotification, 
  createTaskDueNotification,
  createInventoryUpdateNotification 
} from './email-notifications';

class NotificationService {
  private isMonitoring = false
  private checkInterval: NodeJS.Timeout | null = null

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('Starting notification monitoring service...')

    // Check for notifications every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkLowStock()
      this.checkDueTasks()
    }, 5 * 60 * 1000)

    // Initial check
    this.checkLowStock()
    this.checkDueTasks()
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isMonitoring = false
    console.log('Stopped notification monitoring service')
  }

  private async checkLowStock() {
    try {
      const { data: inventory, error } = await supabase
        .from('vnms_batches')
        .select('*')
        .lt('quantity', 20) // Low stock threshold
        .eq('status', 'In Stock')

      if (error) {
        console.error('Error checking low stock:', error)
        return
      }

      if (inventory && inventory.length > 0) {
        const notification = createLowStockNotification(inventory)
        await sendEmailNotification(notification)
        console.log(`Sent low stock notification for ${inventory.length} items`)
      }
    } catch (error) {
      console.error('Error in checkLowStock:', error)
    }
  }

  private async checkDueTasks() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('vnms_staff_tasks')
        .select('*')
        .lte('task_date', today)
        .neq('status', 'Completed')

      if (error) {
        console.error('Error checking due tasks:', error)
        return
      }

      const dueTasks = data || []

      if (dueTasks.length > 0) {
        const notification = createTaskDueNotification(dueTasks)
        await sendEmailNotification(notification)
        console.log(`Sent task due notification for ${dueTasks.length} tasks`)
      }
    } catch (error) {
      console.error('Error in checkDueTasks:', error)
    }
  }

  async notifyNewSale(sale: any) {
    try {
      const notification = createNewSaleNotification(sale)
      await sendEmailNotification(notification)
      console.log('Sent new sale notification')
    } catch (error) {
      console.error('Error sending new sale notification:', error)
    }
  }

  async notifyInventoryUpdate(item: any, action: string) {
    try {
      const notification = createInventoryUpdateNotification(item, action)
      await sendEmailNotification(notification)
      console.log(`Sent inventory update notification: ${action}`)
    } catch (error) {
      console.error('Error sending inventory update notification:', error)
    }
  }
}

export const notificationService = new NotificationService()