// Request cache shared by every endpoint.
//
// - One entry per key, with a TTL.
// - Concurrent callers share one in-flight request (two quick clicks = one fetch).
// - Entries are mirrored to localStorage, so a reload inside the TTL makes no request
//   and can render synchronously via peek().
// - Expired entries stay in storage until a fresh response replaces them: peekStale() returns
//   them, so the app can show the last list it had when the network is gone.
// - Failures are never cached, so "Try again" really tries again. Neither is a value the
//   caller marks as not worth keeping (an empty list from a glitch upstream).

export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type CacheOptions = {
  /** null disables persistence (memory only). Defaults to localStorage when usable. */
  storage?: StorageLike | null
  namespace?: string
  defaultTtlMs?: number
  now?: () => number
}

type Entry<T> = {
  value: T
  savedAt: number
  expiresAt: number
}

export type StaleEntry<T> = { value: T; savedAt: number }

// Safari private mode and some embedded browsers throw on access or on write.
const usableLocalStorage = (): StorageLike | null => {
  try {
    const storage = globalThis.localStorage
    const probe = '__cache_probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export const createRequestCache = ({
  storage = usableLocalStorage(),
  namespace = 'sportsdb:v2:',
  defaultTtlMs = 60 * 60 * 1000,
  now = Date.now,
}: CacheOptions = {}) => {
  const memory = new Map<string, Entry<unknown>>()
  const inFlight = new Map<string, Promise<unknown>>()

  // Any entry, fresh or expired. Expired ones are kept: they are the offline fallback.
  const read = <T>(key: string): Entry<T> | undefined => {
    const hit = memory.get(key)
    if (hit) return hit as Entry<T>

    const raw = storage?.getItem(namespace + key)
    if (raw == null) return undefined
    try {
      const stored = JSON.parse(raw) as Entry<T>
      if (typeof stored?.expiresAt === 'number' && typeof stored.savedAt === 'number') {
        memory.set(key, stored)
        return stored
      }
    } catch {
      // Corrupt entry: dropped below, and refetched.
    }
    storage?.removeItem(namespace + key)
    return undefined
  }

  const peek = <T>(key: string): T | undefined => {
    const entry = read<T>(key)
    return entry && entry.expiresAt > now() ? entry.value : undefined
  }

  const peekStale = <T>(key: string): StaleEntry<T> | undefined => {
    const entry = read<T>(key)
    return entry && { value: entry.value, savedAt: entry.savedAt }
  }

  const write = <T>(key: string, value: T, ttlMs: number) => {
    const entry: Entry<T> = { value, savedAt: now(), expiresAt: now() + ttlMs }
    memory.set(key, entry)
    try {
      storage?.setItem(namespace + key, JSON.stringify(entry))
    } catch {
      // Quota exceeded: the memory cache still works for this session.
    }
  }

  const get = <T>(
    key: string,
    load: () => Promise<T>,
    {
      ttlMs = defaultTtlMs,
      keep = () => true,
    }: { ttlMs?: number; keep?: (value: T) => boolean } = {},
  ): Promise<T> => {
    const cached = peek<T>(key)
    if (cached !== undefined) return Promise.resolve(cached)

    const pending = inFlight.get(key)
    if (pending) return pending as Promise<T>

    const request = load()
      .then((value) => {
        if (keep(value)) write(key, value, ttlMs)
        return value
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
    return request
  }

  const invalidate = (key: string) => {
    memory.delete(key)
    storage?.removeItem(namespace + key)
  }

  return { peek, peekStale, get, invalidate }
}

export type RequestCache = ReturnType<typeof createRequestCache>
