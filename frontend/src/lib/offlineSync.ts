import { api } from '@/lib/api';
import { removeInventoryDeltasForSource } from '@/lib/offlineInventory';

const DB_NAME = 'pharmaconnect-offline';
const DB_VERSION = 2;
const STORE_NAME = 'writeQueue';
export const OFFLINE_QUEUE_EVENT = 'pc-offline-queue-change';
export const OFFLINE_SYNC_STATUS_EVENT = 'pc-offline-sync-status';
export const OFFLINE_WRITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  localTimestamp: string;
  attempts: number;
  lastError?: string;
}

type OfflineWriteInput = Omit<OfflineWrite, 'id' | 'createdAt' | 'localTimestamp' | 'attempts'> & {
  id?: string;
};

type FlushResult = {
  synced: number;
  conflicts: number;
  remaining: number;
  purgedExpired: number;
};

function emitQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

function emitSyncStatus(detail: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_STATUS_EVENT, { detail }));
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
        store.createIndex('localTimestamp', 'localTimestamp', { unique: false });
      } else {
        const store = request.transaction?.objectStore(STORE_NAME);
        if (store && !store.indexNames.contains('localTimestamp')) {
          store.createIndex('localTimestamp', 'localTimestamp', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('inventoryDeltas')) {
        const deltaStore = db.createObjectStore('inventoryDeltas', { keyPath: 'id' });
        deltaStore.createIndex('productId', 'productId', { unique: false });
        deltaStore.createIndex('sourceId', 'sourceId', { unique: false });
        deltaStore.createIndex('createdAt', 'createdAt', { unique: false });
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

  await purgeExpiredOfflineWrites();

  return withStore('readonly', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<OfflineWrite[]>);
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

export async function getOfflineWriteCount(): Promise<number> {
  if (!supportsIndexedDb()) {
    return 0;
  }

  await purgeExpiredOfflineWrites();
  return withStore('readonly', (store) => requestToPromise(store.count()));
}

export async function enqueueOfflineWrite(input: OfflineWriteInput): Promise<OfflineWrite> {
  const localTimestamp =
    typeof input.body?.localTimestamp === 'string'
      ? input.body.localTimestamp
      : new Date().toISOString();
  const record: OfflineWrite = {
    ...input,
    id: input.id ?? `${input.entityType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    localTimestamp,
    body: {
      ...input.body,
      localTimestamp,
    },
    attempts: 0,
  };

  await withStore('readwrite', (store) => requestToPromise(store.put(record)));
  emitQueueChange();
  return record;
}

export type OfflineDispensingSessionInput = {
  localSessionId: string;
  localTimestamp: string;
  checkout: Record<string, unknown>;
};

export async function enqueueDispensingSession(input: OfflineDispensingSessionInput): Promise<OfflineWrite> {
  return enqueueOfflineWrite({
    id: input.localSessionId,
    feature: 'dispensing',
    entityType: 'DISPENSING_SESSION',
    entityId: input.localSessionId,
    url: '/dispensing/sync-batch',
    method: 'POST',
    body: {
      sessions: [
        {
          localSessionId: input.localSessionId,
          localTimestamp: input.localTimestamp,
          payload: {
            ...input.checkout,
            localSessionId: input.localSessionId,
            localTimestamp: input.localTimestamp,
          },
        },
      ],
      localTimestamp: input.localTimestamp,
    },
  });
}

async function updateOfflineWrite(record: OfflineWrite) {
  await withStore('readwrite', (store) => requestToPromise(store.put(record)));
  emitQueueChange();
}

export async function removeOfflineWrite(id: string): Promise<void> {
  await withStore('readwrite', (store) => requestToPromise(store.delete(id)));
  emitQueueChange();
}

export async function clearAllOfflineWrites(): Promise<void> {
  if (!supportsIndexedDb()) return;
  await withStore('readwrite', (store) => requestToPromise(store.clear()));
  emitQueueChange();
}

export async function purgeExpiredOfflineWrites(now = Date.now()): Promise<number> {
  if (!supportsIndexedDb()) {
    return 0;
  }

  const expired = await withStore('readonly', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<OfflineWrite[]>);
    return rows.filter((row) => {
      const createdAt = new Date(row.localTimestamp || row.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt > OFFLINE_WRITE_TTL_MS;
    });
  });

  if (expired.length === 0) {
    return 0;
  }

  await withStore('readwrite', async (store) => {
    await Promise.all(expired.map((row) => requestToPromise(store.delete(row.id))));
  });
  emitQueueChange();
  emitSyncStatus({
    type: 'PURGED_EXPIRED_WRITES',
    purged: expired.length,
    message: `${expired.length} queued offline write${expired.length === 1 ? '' : 's'} expired after 7 days and were removed.`,
  });
  return expired.length;
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

// In-tab guard: prevents re-entrant calls within the same tab in environments
// without Web Locks support (old Safari, Firefox ESR).
let syncInProgress = false;

async function _doFlush(): Promise<FlushResult> {
  const purgedExpired = await purgeExpiredOfflineWrites();
  const queuedWrites = await listOfflineWrites();
  let synced = 0;
  let conflicts = 0;

  for (const queuedWrite of queuedWrites) {
    try {
      if (queuedWrite.feature === 'dispensing' && queuedWrite.entityType === 'DISPENSING_SESSION') {
        const response = await api.post('/dispensing/sync-batch', queuedWrite.body);
        const results = response.data?.data?.results ?? [];
        const hasConflict = results.some((result: any) => result.status === 'CONFLICT');
        if (hasConflict) {
          conflicts += 1;
        } else {
          synced += 1;
        }
        await removeInventoryDeltasForSource(queuedWrite.entityId);
        await removeOfflineWrite(queuedWrite.id);
        continue;
      }

      await api.request({
        url: queuedWrite.url,
        method: queuedWrite.method,
        data: queuedWrite.body,
        headers: queuedWrite.headers,
        _offlineQueued: true,
      });
      await removeOfflineWrite(queuedWrite.id);
      synced += 1;
    } catch (error: any) {
      const status = error?.response?.status as number | undefined;
      const lastError = error?.message || 'Sync failed';

      if (status && status >= 400 && status < 500) {
        // 4xx = server permanently rejected the write. Always drop it from the
        // queue — retrying would loop forever. Attempt conflict recording for
        // inventory writes but do not block removal on its success.
        try {
          await api.post('/inventory/conflicts', {
            entityType: queuedWrite.entityType,
            entityId: queuedWrite.entityId,
            conflictType: 'OFFLINE_SYNC_REJECTED',
            localPayload: queuedWrite.body,
            serverPayload: error?.response?.data ?? { status, message: lastError },
          });
        } catch {
          console.warn('[offlineSync] conflict recording failed for', queuedWrite.entityType, queuedWrite.entityId, lastError);
        }
        conflicts += 1;
        await removeOfflineWrite(queuedWrite.id);
        continue;
      }

      const nextAttempts = queuedWrite.attempts + 1;
      if (nextAttempts >= 10) {
        // After 10 failed attempts the write is permanently broken — drop it
        // rather than blocking the queue forever.
        console.warn('[offlineSync] dropping write after 10 failed attempts', queuedWrite.url, lastError);
        conflicts += 1;
        await removeOfflineWrite(queuedWrite.id);
      } else {
        await updateOfflineWrite({ ...queuedWrite, attempts: nextAttempts, lastError });
      }
    }
  }

  return {
    synced,
    conflicts,
    remaining: await getOfflineWriteCount(),
    purgedExpired,
  };
}

const _noopResult = async (): Promise<FlushResult> => ({
  synced: 0,
  conflicts: 0,
  remaining: await getOfflineWriteCount(),
  purgedExpired: 0,
});

export async function flushOfflineWrites(): Promise<FlushResult> {
  // Cross-tab lock via Web Locks API — at most one tab flushes at a time.
  // ifAvailable: true makes this a non-blocking tryLock: if another tab holds
  // the lock the callback receives null and we bail out immediately rather than
  // queuing up a second flush behind the first.
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return (navigator.locks as any).request(
      'pc-offline-sync-lock',
      { ifAvailable: true },
      async (lock: unknown) => {
        if (!lock) return _noopResult();
        return _doFlush();
      },
    ) as Promise<FlushResult>;
  }

  // Fallback for browsers without Web Locks (old Safari / Firefox ESR):
  // simple in-tab boolean guard.
  if (syncInProgress) return _noopResult();
  syncInProgress = true;
  try {
    return await _doFlush();
  } finally {
    syncInProgress = false;
  }
}
