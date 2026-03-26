
interface OfflineOperation {
  id: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  data: any
  timestamp: number
}

class OfflineStorage {
  private dbName = 'graceharvestseedlings-offline'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Store for pending operations
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const store = db.createObjectStore('pendingOperations', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp')
        }
        
        // Store for cached data
        if (!db.objectStoreNames.contains('cachedData')) {
          const store = db.createObjectStore('cachedData', { keyPath: 'id' })
          store.createIndex('table', 'table')
          store.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  async addPendingOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) await this.init()
    
    const fullOperation: OfflineOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    }
    
    const transaction = this.db!.transaction(['pendingOperations'], 'readwrite')
    const store = transaction.objectStore('pendingOperations')
    await store.add(fullOperation)
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init()
    
    const transaction = this.db!.transaction(['pendingOperations'], 'readonly')
    const store = transaction.objectStore('pendingOperations')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    const transaction = this.db!.transaction(['pendingOperations'], 'readwrite')
    const store = transaction.objectStore('pendingOperations')
    await store.delete(id)
  }

  async cacheData(table: string, data: any[]): Promise<void> {
    if (!this.db) await this.init()
    
    const transaction = this.db!.transaction(['cachedData'], 'readwrite')
    const store = transaction.objectStore('cachedData')
    
    // Clear existing data for this table
    const index = store.index('table')
    const request = index.openCursor(IDBKeyRange.only(table))
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    
    // Add new data
    data.forEach(item => {
      store.add({
        id: `${table}-${item.id || Date.now()}`,
        table,
        data: item,
        timestamp: Date.now()
      })
    })
  }

  async getCachedData(table: string): Promise<any[]> {
    if (!this.db) await this.init()
    
    const transaction = this.db!.transaction(['cachedData'], 'readonly')
    const store = transaction.objectStore('cachedData')
    const index = store.index('table')
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(table)
      request.onsuccess = () => {
        const results = request.result.map(item => item.data)
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlineStorage = new OfflineStorage()
