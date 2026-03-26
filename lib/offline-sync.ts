
import { supabase } from './supabase'
import { offlineStorage } from './offline-storage'

class OfflineSync {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private syncInProgress = false

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.syncPendingOperations()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  async addOfflineOperation(type: 'INSERT' | 'UPDATE' | 'DELETE', table: string, data: any) {
    if (this.isOnline) {
      // If online, try to sync immediately
      try {
        await this.executeOperation(type, table, data)
        return { success: true, synced: true }
      } catch (error) {
        // If failed, add to offline queue
        await offlineStorage.addPendingOperation({ type, table, data })
        return { success: true, synced: false, queued: true }
      }
    } else {
      // If offline, add to queue
      await offlineStorage.addPendingOperation({ type, table, data })
      return { success: true, synced: false, queued: true }
    }
  }

  private async executeOperation(type: 'INSERT' | 'UPDATE' | 'DELETE', table: string, data: any) {
    switch (type) {
      case 'INSERT':
        const { error: insertError } = await supabase.from(table).insert(data)
        if (insertError) throw insertError
        break
        
      case 'UPDATE':
        const { error: updateError } = await (supabase.from(table) as any)
          .update(data)
          .eq('id', data.id)
        if (updateError) throw updateError
        break
        
      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id)
        if (deleteError) throw deleteError
        break
    }
  }

  async syncPendingOperations(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline || this.syncInProgress) {
      return { synced: 0, failed: 0 }
    }

    this.syncInProgress = true
    let synced = 0
    let failed = 0

    try {
      const pendingOps = await offlineStorage.getPendingOperations()
      
      for (const op of pendingOps) {
        try {
          await this.executeOperation(op.type, op.table, op.data)
          await offlineStorage.removePendingOperation(op.id)
          synced++
        } catch (error) {
          console.error('Failed to sync operation:', op, error)
          failed++
        }
      }
    } finally {
      this.syncInProgress = false
    }

    return { synced, failed }
  }

  async getCachedDataWithFallback(table: string, fetchFn: () => Promise<any[]>): Promise<any[]> {
    if (this.isOnline) {
      try {
        const data = await fetchFn()
        // Cache the fresh data
        await offlineStorage.cacheData(table, data)
        return data
      } catch (error) {
        console.warn('Failed to fetch fresh data, using cached:', error)
        return await offlineStorage.getCachedData(table)
      }
    } else {
      return await offlineStorage.getCachedData(table)
    }
  }

  get isOffline() {
    return !this.isOnline
  }

  get hasPendingOperations() {
    return offlineStorage.getPendingOperations().then(ops => ops.length > 0)
  }
}

export const offlineSync = new OfflineSync()
