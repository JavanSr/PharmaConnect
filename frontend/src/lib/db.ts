import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { SyncQueueItem } from '@/types'
import { useConnectivityStore } from '@/stores/connectivityStore'

interface PharmaConnectDB extends DBSchema {
  products: {
    key: string
    value: {
      id: string
      pharmacyId: string
      sku: string
      barcode?: string
      name: string
      genericName: string
      currentStock: number
      [key: string]: unknown
    }
    indexes: {
      pharmacyId: string
      sku: string
      barcode: string
    }
  }
  batches: {
    key: string
    value: {
      id: string
      productId: string
      pharmacyId: string
      expiryDate: string
      batchNumber: string
      quantity: number
      [key: string]: unknown
    }
    indexes: {
      productId: string
      pharmacyId: string
      expiryDate: string
    }
  }
  stockMovements: {
    key: string
    value: {
      id: string
      productId: string
      pharmacyId: string
      createdAt: string
      type: string
      quantity: number
      [key: string]: unknown
    }
    indexes: {
      productId: string
      pharmacyId: string
      createdAt: string
    }
  }
  dispensingEvents: {
    key: string
    value: {
      id: string
      patientId: string
      pharmacyId: string
      dispensedAt: string
      productId: string
      quantity: number
      [key: string]: unknown
    }
    indexes: {
      patientId: string
      pharmacyId: string
      dispensedAt: string
    }
  }
  complianceItems: {
    key: string
    value: {
      id: string
      pharmacyId: string
      status: string
      name: string
      expiryDate: string
      [key: string]: unknown
    }
    indexes: {
      pharmacyId: string
      status: string
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
  }
}

let dbInstance: IDBPDatabase<PharmaConnectDB> | null = null

export async function getDb(): Promise<IDBPDatabase<PharmaConnectDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<PharmaConnectDB>('pharmaconnect-db', 1, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' })
        productStore.createIndex('pharmacyId', 'pharmacyId')
        productStore.createIndex('sku', 'sku')
        productStore.createIndex('barcode', 'barcode')
      }

      // Batches store
      if (!db.objectStoreNames.contains('batches')) {
        const batchStore = db.createObjectStore('batches', { keyPath: 'id' })
        batchStore.createIndex('productId', 'productId')
        batchStore.createIndex('pharmacyId', 'pharmacyId')
        batchStore.createIndex('expiryDate', 'expiryDate')
      }

      // Stock movements store
      if (!db.objectStoreNames.contains('stockMovements')) {
        const movementStore = db.createObjectStore('stockMovements', { keyPath: 'id' })
        movementStore.createIndex('productId', 'productId')
        movementStore.createIndex('pharmacyId', 'pharmacyId')
        movementStore.createIndex('createdAt', 'createdAt')
      }

      // Dispensing events store
      if (!db.objectStoreNames.contains('dispensingEvents')) {
        const dispensingStore = db.createObjectStore('dispensingEvents', { keyPath: 'id' })
        dispensingStore.createIndex('patientId', 'patientId')
        dispensingStore.createIndex('pharmacyId', 'pharmacyId')
        dispensingStore.createIndex('dispensedAt', 'dispensedAt')
      }

      // Compliance items store
      if (!db.objectStoreNames.contains('complianceItems')) {
        const complianceStore = db.createObjectStore('complianceItems', { keyPath: 'id' })
        complianceStore.createIndex('pharmacyId', 'pharmacyId')
        complianceStore.createIndex('status', 'status')
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
    }
  })

  return dbInstance
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'timestamp'>): Promise<void> {
  const db = await getDb()
  const queueItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    retryCount: 0
  }
  await db.add('syncQueue', queueItem)
  useConnectivityStore.getState().incrementPendingSync()
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const db = await getDb()
  const items = await db.getAll('syncQueue')
  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      const { api } = await import('./api')
      await api.request({
        url: item.url,
        method: item.method,
        data: item.body
      })
      await db.delete('syncQueue', item.id)
      processed++
    } catch {
      failed++
      // Update retry count
      await db.put('syncQueue', { ...item, retryCount: item.retryCount + 1 })
    }
  }

  return { processed, failed }
}

// Convenience helpers
export async function saveProductOffline(product: PharmaConnectDB['products']['value']): Promise<void> {
  const db = await getDb()
  await db.put('products', product)
}

export async function saveBatchOffline(batch: PharmaConnectDB['batches']['value']): Promise<void> {
  const db = await getDb()
  await db.put('batches', batch)
}

export async function saveDispensingEventOffline(event: PharmaConnectDB['dispensingEvents']['value']): Promise<void> {
  const db = await getDb()
  await db.put('dispensingEvents', event)
}

export async function getOfflineProducts(pharmacyId: string): Promise<PharmaConnectDB['products']['value'][]> {
  const db = await getDb()
  return db.getAllFromIndex('products', 'pharmacyId', pharmacyId)
}

export async function getOfflineBatchesByProduct(productId: string): Promise<PharmaConnectDB['batches']['value'][]> {
  const db = await getDb()
  return db.getAllFromIndex('batches', 'productId', productId)
}

export { type PharmaConnectDB }
