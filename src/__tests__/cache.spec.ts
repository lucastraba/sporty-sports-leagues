import { describe, it, expect, vi } from 'vitest'
import { createRequestCache } from '@/api/cache'
import { deferred, memoryStorage } from './helpers'

describe('createRequestCache', () => {
  it('calls the loader once for repeated keys', async () => {
    const cache = createRequestCache({ storage: null })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load)
    await cache.get('k', load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight request between concurrent callers', async () => {
    const cache = createRequestCache({ storage: null })
    const pending = deferred<string>()
    const load = vi.fn<() => Promise<string>>(() => pending.promise)
    const first = cache.get('k', load)
    const second = cache.get('k', load)
    pending.resolve('value')
    await expect(Promise.all([first, second])).resolves.toEqual(['value', 'value'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps keys separate', async () => {
    const cache = createRequestCache({ storage: null })
    await cache.get('a', async () => 'A')
    await expect(cache.get('b', async () => 'B')).resolves.toBe('B')
  })

  it('does not cache failures, so a retry calls the API again', async () => {
    const cache = createRequestCache({ storage: null })
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')
    await expect(cache.get('k', load)).rejects.toThrow('boom')
    await expect(cache.get('k', load)).resolves.toBe('ok')
  })

  it('expires entries after their TTL', async () => {
    let now = 0
    const cache = createRequestCache({ storage: null, now: () => now })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load, { ttlMs: 1000 })
    now = 999
    await cache.get('k', load, { ttlMs: 1000 })
    now = 1001
    await cache.get('k', load, { ttlMs: 1000 })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('survives a reload through storage and can be read synchronously', async () => {
    const storage = memoryStorage()
    await createRequestCache({ storage }).get('k', async () => ['value'])

    const reloaded = createRequestCache({ storage })
    expect(reloaded.peek('k')).toEqual(['value'])
    const load = vi.fn<() => Promise<string[]>>()
    await expect(reloaded.get('k', load)).resolves.toEqual(['value'])
    expect(load).not.toHaveBeenCalled()
  })

  it('ignores and removes corrupt or malformed storage entries', () => {
    const storage = memoryStorage()
    storage.setItem('ns:bad', '{not json')
    storage.setItem('ns:shape', JSON.stringify({ value: 1, expiresAt: 5 }))
    const cache = createRequestCache({ storage, namespace: 'ns:', now: () => 10 })
    expect(cache.peek('bad')).toBeUndefined()
    expect(cache.peekStale('shape')).toBeUndefined()
    expect(storage.data.size).toBe(0)
  })

  it('keeps expired entries for peekStale(), the offline fallback', async () => {
    let now = 100
    const storage = memoryStorage()
    await createRequestCache({ storage, now: () => now }).get('k', async () => 'old', {
      ttlMs: 1000,
    })

    now = 5000
    const reloaded = createRequestCache({ storage, now: () => now })
    expect(reloaded.peek('k')).toBeUndefined()
    expect(reloaded.peekStale('k')).toEqual({ value: 'old', savedAt: 100 })

    // A failed refresh leaves the old copy in place; a successful one replaces it.
    await expect(reloaded.get('k', () => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline',
    )
    expect(reloaded.peekStale('k')).toEqual({ value: 'old', savedAt: 100 })
    await reloaded.get('k', async () => 'new')
    expect(reloaded.peekStale('k')).toEqual({ value: 'new', savedAt: 5000 })
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
    await cache.get('k', load)
    await cache.get('k', load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('invalidate() forces the next call to load again', async () => {
    const storage = memoryStorage()
    const cache = createRequestCache({ storage })
    const load = vi.fn<() => Promise<string>>(async () => 'value')
    await cache.get('k', load)
    cache.invalidate('k')
    expect(storage.data.size).toBe(0)
    await cache.get('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
