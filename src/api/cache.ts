// Request cache for every endpoint: a TTL per key, one shared in-flight request per key,
// and a localStorage mirror checked against a schema on read. Failures are never cached.
// Expired entries stay in storage until replaced; peekStale() reads them for the offline fallback.

import * as z from 'zod/mini'

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

export type Schema<T> = z.ZodMiniType<T>

const entrySchema = <T>(value: Schema<T>) =>
  z.object({ value, savedAt: z.number(), expiresAt: z.number() })

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

  const parseStored = (raw: string): unknown => {
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  // Memory only ever holds values this session loaded, so only storage is checked.
  const read = <T>(key: string, schema: Schema<T>): Entry<T> | undefined => {
    const hit = memory.get(key)
    if (hit) return hit as Entry<T>

    const raw = storage?.getItem(namespace + key)
    if (raw == null) return undefined
    const stored = entrySchema(schema).safeParse(parseStored(raw))
    if (stored.success) {
      memory.set(key, stored.data)
      return stored.data
    }
    storage?.removeItem(namespace + key)
    return undefined
  }

  const peek = <T>(key: string, schema: Schema<T>): T | undefined => {
    const entry = read(key, schema)
    return entry && entry.expiresAt > now() ? entry.value : undefined
  }

  const peekStale = <T>(key: string, schema: Schema<T>): StaleEntry<T> | undefined => {
    const entry = read(key, schema)
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
      schema,
      ttlMs = defaultTtlMs,
      keep = () => true,
    }: { schema: Schema<T>; ttlMs?: number; keep?: (value: T) => boolean },
  ): Promise<T> => {
    const cached = peek(key, schema)
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
