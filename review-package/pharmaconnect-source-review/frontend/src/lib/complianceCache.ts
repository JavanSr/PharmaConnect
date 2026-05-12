import type { ComplianceItem } from '@/types';

const DB_NAME = 'pharmaconnect-compliance-cache';
const DB_VERSION = 1;
const STORE_NAME = 'dashboard';

export type CachedComplianceDashboard = {
  pharmacyId: string;
  savedAt: string;
  health: {
    score: number;
    breakdown: Record<string, number>;
    total?: number;
    applicable?: number;
    generatedAt?: string;
  };
  items: ComplianceItem[];
};

function supportsIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'pharmacyId' });
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

export async function getCachedComplianceDashboard(pharmacyId: string): Promise<CachedComplianceDashboard | null> {
  if (!supportsIndexedDb()) {
    return null;
  }

  return withStore('readonly', (store) => requestToPromise(store.get(pharmacyId) as IDBRequest<CachedComplianceDashboard | undefined>))
    .then((result) => result ?? null);
}

export async function setCachedComplianceDashboard(entry: CachedComplianceDashboard): Promise<void> {
  if (!supportsIndexedDb()) {
    return;
  }

  await withStore('readwrite', (store) => requestToPromise(store.put(entry)));
}
