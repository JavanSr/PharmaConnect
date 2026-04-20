import { api } from '@/lib/api';

const DB_NAME = 'pharmaconnect-offline';
const DB_VERSION = 1;
const STORE_NAME = 'writeQueue';
export const OFFLINE_QUEUE_EVENT = 'pc-offline-queue-change';

export type OfflineWriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OfflineWrite {
  id: string;
  feature: string;
  entityType: string;
  entityId: string;
  url: string;
  method: OfflineWriteMethod;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

type OfflineWriteInput = Omit<OfflineWrite, 'id' | 'createdAt' | 'attempts'> & {
  id?: string;
};

type FlushResult = {
  synced: number;
  conflicts: number;
  remaining: number;
};

function emitQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

function supportsIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  const transaction = db.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);

  try {
    return await Promise.resolve(action(store));
  } finally {
    db.close();
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export async function listOfflineWrites(): Promise<OfflineWrite[]> {
  if (!supportsIndexedDb()) {
    return [];
  }

  return withStore('readonly', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<OfflineWrite[]>);
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

export async function getOfflineWriteCount(): Promise<number> {
  if (!supportsIndexedDb()) {
    return 0;
  }

  return withStore('readonly', (store) => requestToPromise(store.count()));
}

export async function enqueueOfflineWrite(input: OfflineWriteInput): Promise<OfflineWrite> {
  const record: OfflineWrite = {
    ...input,
    id: input.id ?? `${input.entityType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  await withStore('readwrite', (store) => requestToPromise(store.put(record)));
  emitQueueChange();
  return record;
}

async function updateOfflineWrite(record: OfflineWrite) {
  await withStore('readwrite', (store) => requestToPromise(store.put(record)));
  emitQueueChange();
}

export async function removeOfflineWrite(id: string): Promise<void> {
  await withStore('readwrite', (store) => requestToPromise(store.delete(id)));
  emitQueueChange();
}

export async function registerOfflineSync(tag = 'inventory-write-queue'): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration | null>((resolve) => {
        window.setTimeout(() => resolve(null), 750);
      }),
    ]);

    if (!registration) {
      return;
    }

    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (syncTag: string) => Promise<void> };
    };
    await syncRegistration.sync?.register(tag);
  } catch {
    // Background sync is a progressive enhancement; app-level flushing remains the primary path.
  }
}

export async function flushOfflineWrites(): Promise<FlushResult> {
  const queuedWrites = await listOfflineWrites();
  let synced = 0;
  let conflicts = 0;

  for (const queuedWrite of queuedWrites) {
    try {
      await api.request({
        url: queuedWrite.url,
        method: queuedWrite.method,
        data: queuedWrite.body,
        headers: queuedWrite.headers,
      });
      await removeOfflineWrite(queuedWrite.id);
      synced += 1;
    } catch (error: any) {
      const status = error?.response?.status as number | undefined;
      const lastError = error?.message || 'Sync failed';

      if (status && status >= 400 && status < 500) {
        try {
          await api.post('/inventory/conflicts', {
            entityType: queuedWrite.entityType,
            entityId: queuedWrite.entityId,
            conflictType: 'OFFLINE_SYNC_REJECTED',
            localPayload: queuedWrite.body,
            serverPayload: error?.response?.data ?? { status, message: lastError },
          });
          conflicts += 1;
        } catch {
          // If conflict logging fails, keep the local queue item below with the updated error.
          await updateOfflineWrite({
            ...queuedWrite,
            attempts: queuedWrite.attempts + 1,
            lastError,
          });
          continue;
        }

        await removeOfflineWrite(queuedWrite.id);
        continue;
      }

      await updateOfflineWrite({
        ...queuedWrite,
        attempts: queuedWrite.attempts + 1,
        lastError,
      });
    }
  }

  return {
    synced,
    conflicts,
    remaining: await getOfflineWriteCount(),
  };
}
