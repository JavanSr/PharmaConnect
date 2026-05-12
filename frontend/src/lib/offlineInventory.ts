import type { Product } from '@/types';

const DB_NAME = 'pharmaconnect-offline';
const DB_VERSION = 2;
const STORE_NAME = 'inventoryDeltas';
const DELTA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InventoryDelta = {
  id: string;
  productId: string;
  quantityDelta: number;
  sourceId: string;
  createdAt: string;
};

function supportsIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('writeQueue')) {
        const writeStore = db.createObjectStore('writeQueue', { keyPath: 'id' });
        writeStore.createIndex('createdAt', 'createdAt', { unique: false });
        writeStore.createIndex('localTimestamp', 'localTimestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('productId', 'productId', { unique: false });
        store.createIndex('sourceId', 'sourceId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline inventory store.'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
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

export async function recordInventoryDelta(input: {
  productId: string;
  quantityDelta: number;
  sourceId: string;
  createdAt?: string;
}) {
  if (!supportsIndexedDb()) {
    return;
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  await withStore('readwrite', (store) =>
    requestToPromise(
      store.put({
        id: `${input.sourceId}:${input.productId}`,
        productId: input.productId,
        quantityDelta: input.quantityDelta,
        sourceId: input.sourceId,
        createdAt,
      } satisfies InventoryDelta),
    ),
  );
}

export async function removeInventoryDeltasForSource(sourceId: string) {
  if (!supportsIndexedDb()) {
    return;
  }

  await withStore('readwrite', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<InventoryDelta[]>);
    await Promise.all(
      rows
        .filter((row) => row.sourceId === sourceId)
        .map((row) => requestToPromise(store.delete(row.id))),
    );
  });
}

export async function purgeExpiredInventoryDeltas(now = Date.now()) {
  if (!supportsIndexedDb()) {
    return 0;
  }

  const expired = await withStore('readonly', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<InventoryDelta[]>);
    return rows.filter((row) => {
      const createdAt = new Date(row.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt > DELTA_TTL_MS;
    });
  });

  if (expired.length > 0) {
    await withStore('readwrite', async (store) => {
      await Promise.all(expired.map((row) => requestToPromise(store.delete(row.id))));
    });
  }

  return expired.length;
}

export async function getInventoryDeltaByProduct(): Promise<Map<string, number>> {
  if (!supportsIndexedDb()) {
    return new Map();
  }

  await purgeExpiredInventoryDeltas();
  return withStore('readonly', async (store) => {
    const rows = await requestToPromise(store.getAll() as IDBRequest<InventoryDelta[]>);
    return rows.reduce((map, row) => {
      map.set(row.productId, (map.get(row.productId) ?? 0) + row.quantityDelta);
      return map;
    }, new Map<string, number>());
  });
}

export async function applyInventoryDeltaToProduct<T extends Product>(product: T): Promise<T> {
  const deltas = await getInventoryDeltaByProduct();
  const delta = deltas.get(product.id) ?? 0;
  return {
    ...product,
    currentStock:
      typeof product.currentStock === 'number'
        ? Math.max(0, product.currentStock + delta)
        : product.currentStock,
  };
}

export async function applyInventoryDeltasToProducts<T extends Product>(products: T[]): Promise<T[]> {
  const deltas = await getInventoryDeltaByProduct();
  return products.map((product) => {
    const delta = deltas.get(product.id) ?? 0;
    if (!delta || typeof product.currentStock !== 'number') {
      return product;
    }

    return {
      ...product,
      currentStock: Math.max(0, product.currentStock + delta),
    };
  });
}
