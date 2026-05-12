import type { Product } from '@/types';

const DB_NAME = 'pharmaconnect-products';
const DB_VERSION = 1;
const CATALOG_STORE = 'catalog';
const META_STORE = 'meta';
const CATALOG_SYNC_KEY = 'catalogLastSynced';
const LAST_WRITE_KEY = 'lastUpdated';

type CacheProductsOptions = {
  catalogSnapshot?: boolean;
};

function supportsIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        db.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open products DB'));
  });
}

export async function cacheProducts(products: Product[], options: CacheProductsOptions = {}): Promise<void> {
  if (!supportsIndexedDb() || products.length === 0) return;
  const db = await openDb();
  const tx = db.transaction([CATALOG_STORE, META_STORE], 'readwrite');
  const store = tx.objectStore(CATALOG_STORE);
  const metaStore = tx.objectStore(META_STORE);
  for (const product of products) {
    store.put(product);
  }
  const now = new Date().toISOString();
  metaStore.put({ key: LAST_WRITE_KEY, value: now });
  if (options.catalogSnapshot) {
    metaStore.put({ key: CATALOG_SYNC_KEY, value: now });
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function markProductCatalogSynced(): Promise<void> {
  if (!supportsIndexedDb()) return;
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readwrite');
  tx.objectStore(META_STORE).put({ key: CATALOG_SYNC_KEY, value: new Date().toISOString() });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function searchCachedProducts(search: string, limit = 12): Promise<Product[]> {
  if (!supportsIndexedDb()) return [];
  const db = await openDb();
  const tx = db.transaction(CATALOG_STORE, 'readonly');
  const all = await requestToPromise(tx.objectStore(CATALOG_STORE).getAll() as IDBRequest<Product[]>);
  db.close();
  if (!search.trim()) return all.slice(0, limit);
  const q = search.toLowerCase();
  return all
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q) ||
        (p.barcode && String(p.barcode).includes(q)),
    )
    .slice(0, limit);
}

export async function getCachedProductById(id: string): Promise<Product | null> {
  if (!supportsIndexedDb()) return null;
  const db = await openDb();
  const tx = db.transaction(CATALOG_STORE, 'readonly');
  const result = await requestToPromise(
    tx.objectStore(CATALOG_STORE).get(id) as IDBRequest<Product | undefined>,
  );
  db.close();
  return result ?? null;
}

export async function getProductCacheTimestamp(): Promise<string | null> {
  if (!supportsIndexedDb()) return null;
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readonly');
  const meta = await requestToPromise(
    tx.objectStore(META_STORE).get(CATALOG_SYNC_KEY) as IDBRequest<
      { key: string; value: string } | undefined
    >,
  );
  db.close();
  return meta?.value ?? null;
}
