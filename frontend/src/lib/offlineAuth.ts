/**
 * offlineAuth.ts
 *
 * Caches a successful online login session to IndexedDB so the app can
 * restore it when the device is offline and the user re-enters their
 * credentials.
 *
 * Rules (from CLAUDE.md offline architecture):
 *  - Auth writes must NEVER queue — this module writes directly to IndexedDB,
 *    bypassing the write queue entirely.
 *  - Passwords are never stored in plain text. A SHA-256 digest of
 *    (email + ":" + password) is stored as the verifier.
 *  - Only the most recent successful session per email is retained.
 */

import type { User, Pharmacy, PharmacyMembership } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineLoginSnapshot {
  user: User;
  accessToken: string;
  refreshToken: string;
  pharmacy: Pharmacy | null;
  memberships: PharmacyMembership[];
  deviceSelectedPharmacyId: string | null;
}

interface OfflineLoginCache extends OfflineLoginSnapshot {
  email: string;
  /** SHA-256 hex digest of `email:password` — used to verify on unlock */
  passwordHash: string;
  savedAt: string;
}

interface SaveOfflineLoginCacheParams extends OfflineLoginSnapshot {
  email: string;
  password: string;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME = 'pharmaconnect-auth-cache';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyed by email so each user gets exactly one cached session
        db.createObjectStore(STORE_NAME, { keyPath: 'email' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db: IDBDatabase, record: OfflineLoginCache): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db: IDBDatabase, email: string): Promise<OfflineLoginCache | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(email);
    req.onsuccess = () => resolve(req.result as OfflineLoginCache | undefined);
    req.onerror = () => reject(req.error);
  });
}

// ── Password hashing ──────────────────────────────────────────────────────────

async function hashPassword(email: string, password: string): Promise<string> {
  const raw = `${email.toLowerCase().trim()}:${password}`;
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Persist an offline login snapshot after a successful online authentication.
 * Replaces any previous snapshot for the same email address.
 */
export async function saveOfflineLoginCache(params: SaveOfflineLoginCacheParams): Promise<void> {
  try {
    const { email, password, ...snapshot } = params;
    const passwordHash = await hashPassword(email, password);
    const db = await openDb();
    await dbPut(db, {
      email,
      passwordHash,
      savedAt: new Date().toISOString(),
      ...snapshot,
    });
    db.close();
  } catch {
    // Offline cache save is best-effort — never throw, never block login
  }
}

/**
 * Attempt to restore a cached session by verifying the supplied credentials.
 *
 * Returns the snapshot if credentials match, or `null` if:
 *  - No cached session exists for this email
 *  - The password does not match the stored hash
 *  - IndexedDB is unavailable
 */
export async function unlockOfflineLogin(
  email: string,
  password: string,
): Promise<OfflineLoginSnapshot | null> {
  try {
    const db = await openDb();
    const record = await dbGet(db, email.toLowerCase().trim());
    db.close();

    if (!record) return null;

    const hash = await hashPassword(email, password);
    if (hash !== record.passwordHash) return null;

    const { passwordHash: _h, savedAt: _s, email: _e, ...snapshot } = record;
    return snapshot;
  } catch {
    return null;
  }
}
