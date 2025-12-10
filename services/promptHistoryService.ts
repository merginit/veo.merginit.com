import { AspectRatio, Resolution, VeoModel, PromptHistoryEntry } from '../types'

const DB_NAME = 'veo-studio'
const STORE_NAME = 'prompt-history'
const DB_VERSION = 2

type NewEntry = Omit<PromptHistoryEntry, 'id'>

function isBrowser(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close()
        const retry = window.indexedDB.open(DB_NAME, db.version + 1)
        retry.onupgradeneeded = () => {
          const rdb = retry.result
          if (!rdb.objectStoreNames.contains(STORE_NAME)) {
            rdb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
          }
        }
        retry.onsuccess = () => resolve(retry.result)
        retry.onerror = () => reject(retry.error || new Error('Failed to upgrade DB'))
        return
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error || new Error('Failed to open DB'))
  })
}

// Simple, explicit wrappers around IDB requests without hidden state

export async function addPromptHistory(entry: NewEntry): Promise<PromptHistoryEntry> {
  const db = await openDb()
  return new Promise<PromptHistoryEntry>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const addReq = store.add(entry)
    addReq.onerror = () => reject(addReq.error || new Error('Failed to add history entry'))
    addReq.onsuccess = () => {
      const id = addReq.result as number
      const getReq = store.get(id)
      getReq.onerror = () => reject(getReq.error || new Error('Failed to fetch inserted entry'))
      getReq.onsuccess = () => resolve(getReq.result as PromptHistoryEntry)
    }
    tx.onerror = () => reject(tx.error || new Error('Transaction error'))
  })
}

export async function listPromptHistory(): Promise<PromptHistoryEntry[]> {
  const db = await openDb()
  return new Promise<PromptHistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onerror = () => reject(req.error || new Error('Failed to list history'))
    req.onsuccess = () => {
      const items = (req.result as PromptHistoryEntry[]).slice().sort((a, b) => b.createdAt - a.createdAt)
      resolve(items)
    }
    tx.onerror = () => reject(tx.error || new Error('Transaction error'))
  })
}

export async function deletePromptHistory(id: number): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onerror = () => reject(req.error || new Error('Failed to delete history entry'))
    req.onsuccess = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Transaction error'))
  })
}

export async function clearPromptHistory(): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.clear()
    req.onerror = () => reject(req.error || new Error('Failed to clear history'))
    req.onsuccess = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Transaction error'))
  })
}

export async function updatePromptHistory(id: number, patch: Partial<PromptHistoryEntry>): Promise<PromptHistoryEntry> {
  const db = await openDb()
  return new Promise<PromptHistoryEntry>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onerror = () => reject(getReq.error || new Error('Failed to load entry'))
    getReq.onsuccess = () => {
      const current = getReq.result as PromptHistoryEntry | undefined
      if (!current) {
        reject(new Error('Entry not found'))
        return
      }
      const updated: PromptHistoryEntry = { ...current, ...patch, id: current.id }
      const putReq = store.put(updated)
      putReq.onerror = () => reject(putReq.error || new Error('Failed to update entry'))
      putReq.onsuccess = () => resolve(updated)
    }
    tx.onerror = () => reject(tx.error || new Error('Transaction error'))
  })
}

export function buildHistoryEntry(params: {
  prompt: string
  aspectRatio: AspectRatio
  resolution: Resolution
  model: VeoModel
  videoUri: string | null
  videoBlob?: Blob | null
  error: string | null
}): NewEntry {
  return {
    prompt: params.prompt,
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    model: params.model,
    videoUri: params.videoUri,
    videoBlob: params.videoBlob ?? null,
    error: params.error,
    createdAt: Date.now()
  }
}
