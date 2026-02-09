/**
 * Lightweight Promise-based wrapper for IndexedDB.
 * Used for offline storage and sync queue.
 * Zero-dependency alternative to idb-keyval.
 */

const DB_NAME = 'bonalyze-store'
const STORE_NAME = 'keyval'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function set(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(value, key)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function del(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function keys(): Promise<IDBValidKey[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clear(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
