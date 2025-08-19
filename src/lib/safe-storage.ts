// src/lib/safe-storage.ts
type Entry<T> = { v: T; exp?: number }
const now = () => Date.now()

export function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as Entry<T>
    if (obj?.exp && obj.exp < now()) { sessionStorage.removeItem(key); return null }
    return obj?.v ?? null
  } catch {
    try { sessionStorage.removeItem(key) } catch {}
    return null
  }
}

export function ssSet<T>(key: string, v: T, ttlMs?: number) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ v, exp: ttlMs ? now() + ttlMs : undefined }))
  } catch {}
}

export function ssDel(key: string) {
  try { sessionStorage.removeItem(key) } catch {}
}

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as Entry<T>
    if (obj?.exp && obj.exp < now()) { localStorage.removeItem(key); return null }
    return obj?.v ?? null
  } catch {
    try { localStorage.removeItem(key) } catch {}
    return null
  }
}

export function lsSet<T>(key: string, v: T, ttlMs?: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ v, exp: ttlMs ? now() + ttlMs : undefined }))
  } catch {}
}

export function lsDel(key: string) {
  try { localStorage.removeItem(key) } catch {}
}


