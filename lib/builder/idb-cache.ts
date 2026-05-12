/**
 * IndexedDB cache for WebContainer node_modules snapshots.
 *
 * After a successful `npm install`, the caller exports the WebContainer FS
 * as a JSON FileSystemTree and stores it here, keyed by a hash of the
 * package.json. On subsequent boots with the same package.json, the cached
 * tree is mounted directly — skipping npm install entirely.
 */

import type { FileSystemTree } from "@webcontainer/api";

const DB_NAME = "wc-dep-cache";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";

// ── helpers ────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── public API ─────────────────────────────────────────────────────────

/**
 * Hash a package.json string into a short hex key using SHA-256.
 * Returns something like "a3f7c21b".
 */
export async function hashPackageJson(packageJsonString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(packageJsonString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Use first 16 hex chars (64-bit) — plenty for cache keying
  return hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Retrieve a cached node_modules FileSystemTree for the given package.json hash.
 * Returns `null` if nothing is cached.
 */
export async function getCachedSnapshot(
  hash: string
): Promise<FileSystemTree | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[idb-cache] Failed to read cache:", err);
    return null;
  }
}

/**
 * Store a node_modules FileSystemTree snapshot keyed by the
 * package.json hash.
 */
export async function setCachedSnapshot(
  hash: string,
  snapshot: FileSystemTree
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(snapshot, hash);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[idb-cache] Failed to write cache:", err);
  }
}

/**
 * Delete ALL cached snapshots. Useful for a "clear cache" button.
 */
export async function clearAllSnapshots(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[idb-cache] Failed to clear cache:", err);
  }
}
