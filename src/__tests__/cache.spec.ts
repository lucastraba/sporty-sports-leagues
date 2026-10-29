import { describe, it, expect, vi } from 'vitest'
import * as z from 'zod/mini'
import { createRequestCache } from '@/api/cache'
import { deferred, memoryStorage } from './helpers'

const text = z.string()
const texts = z.array(z.string())

describe('createRequestCache', () => {
  it('calls the loader once for repeated keys', async () => {
    const cache = createRequestCache({ storage: null })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load, { schema: text })
    await cache.get('k', load, { schema: text })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight request between concurrent callers', async () => {
    const cache = createRequestCache({ storage: null })
    const pending = deferred<string>()
    const load = vi.fn<() => Promise<string>>(() => pending.promise)
    const first = cache.get('k', load, { schema: text })
    const second = cache.get('k', load, { schema: text })
    pending.resolve('value')
    await expect(Promise.all([first, second])).resolves.toEqual(['value', 'value'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps keys separate', async () => {
    const cache = createRequestCache({ storage: null })
    await cache.get('a', async () => 'A', { schema: text })
    await expect(cache.get('b', async () => 'B', { schema: text })).resolves.toBe('B')
  })

  it('does not cache failures, so a retry calls the API again', async () => {
    const cache = createRequestCache({ storage: null })
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')
    await expect(cache.get('k', load, { schema: text })).rejects.toThrow('boom')
    await expect(cache.get('k', load, { schema: text })).resolves.toBe('ok')
  })

  it('does not store a value the caller marks as not worth keeping', async () => {
    const storage = memoryStorage()
    const cache = createRequestCache({ storage })
    const load = vi.fn<() => Promise<string[]>>(async () => [])
    await cache.get('k', load, { schema: texts, keep: (value) => value.length > 0 })
    await cache.get('k', load, { schema: texts, keep: (value) => value.length > 0 })
    expect(load).toHaveBeenCalledTimes(2)
    expect(storage.data.size).toBe(0)
  })

  it('expires entries after their TTL', async () => {
    let now = 0
    const cache = createRequestCache({ storage: null, now: () => now })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load, { schema: text, ttlMs: 1000 })
    now = 999
    await cache.get('k', load, { schema: text, ttlMs: 1000 })
    now = 1001
    await cache.get('k', load, { schema: text, ttlMs: 1000 })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('survives a reload through storage and can be read synchronously', async () => {
    const storage = memoryStorage()
    await createRequestCache({ storage }).get('k', async () => ['value'], { schema: texts })

    const reloaded = createRequestCache({ storage })
    expect(reloaded.peek('k', texts)).toEqual(['value'])
    const load = vi.fn<() => Promise<string[]>>()
    await expect(reloaded.get('k', load, { schema: texts })).resolves.toEqual(['value'])
    expect(load).not.toHaveBeenCalled()
  })

  it('ignores and removes corrupt or malformed storage entries', () => {
    const storage = memoryStorage()
    storage.setItem('ns:bad', '{not json')
    storage.setItem('ns:shape', JSON.stringify({ value: 1, expiresAt: 5 }))
    const cache = createRequestCache({ storage, namespace: 'ns:', now: () => 10 })
    expect(cache.peek('bad', text)).toBeUndefined()
    expect(cache.peekStale('shape', text)).toBeUndefined()
    expect(storage.data.size).toBe(0)
  })

  it('drops a stored value that does not match the schema, so it is fetched again', async () => {
    const storage = memoryStorage()
    storage.setItem('ns:k', JSON.stringify({ value: [{ id: 1 }], savedAt: 0, expiresAt: 99 }))
    const cache = createRequestCache({ storage, namespace: 'ns:', now: () => 10 })
    expect(cache.peek('k', texts)).toBeUndefined()
    expect(storage.data.has('ns:k')).toBe(false)
    await expect(cache.get('k', async () => ['fresh'], { schema: texts })).resolves.toEqual([
      'fresh',
    ])
  })

  it('keeps expired entries for peekStale(), the offline fallback', async () => {
    let now = 100
    const storage = memoryStorage()
    await createRequestCache({ storage, now: () => now }).get('k', async () => 'old', {
      schema: text,
      ttlMs: 1000,
    })

    now = 5000
    const reloaded = createRequestCache({ storage, now: () => now })
    expect(reloaded.peek('k', text)).toBeUndefined()
    expect(reloaded.peekStale('k', text)).toEqual({ value: 'old', savedAt: 100 })

    // A failed refresh leaves the old copy in place; a successful one replaces it.
    await expect(
      reloaded.get('k', () => Promise.reject(new Error('offline')), { schema: text }),
    ).rejects.toThrow('offline')
    expect(reloaded.peekStale('k', text)).toEqual({ value: 'old', savedAt: 100 })
    await reloaded.get('k', async () => 'new', { schema: text })
    expect(reloaded.peekStale('k', text)).toEqual({ value: 'new', savedAt: 5000 })
  })

  it('still works in memory when storage throws (quota, private mode)', async () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    const cache = createRequestCache({ storage })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load, { schema: text })
    await cache.get('k', load, { schema: text })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('invalidate() forces the next call to load again', async () => {
    const storage = memoryStorage()
    const cache = createRequestCache({ storage })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load, { schema: text })
    cache.invalidate('k')
    expect(storage.data.size).toBe(0)
    await cache.get('k', load, { schema: text })
    expect(load).toHaveBeenCalledTimes(2)
  })
})
