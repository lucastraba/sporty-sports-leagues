import { describe, it, expect, vi } from 'vitest'
import { ApiError, getJson } from '@/api/http'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const noSleep = () => Promise.resolve()

const rejection = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('Expected the request to fail')
}

describe('getJson', () => {
  it('returns parsed JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ ok: true }))
    await expect(getJson('/x', { fetchImpl })).resolves.toEqual({ ok: true })
  })

  it('retries a network failure once, then succeeds', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({ ok: true }))
    await expect(getJson('/x', { fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retries 5xx but gives up after the retry budget', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({}, 503))
    const error = await rejection(getJson('/x', { fetchImpl, sleep: noSleep, retries: 2 }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 503 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('does not retry 429 and explains the rate limit', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({}, 429))
    const error = await rejection(getJson('/x', { fetchImpl, sleep: noSleep }))
    expect(error).toMatchObject({ kind: 'rate-limit', status: 429 })
    expect(error.message).toMatch(/30 per minute/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not retry 4xx', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({}, 403))
    await expect(getJson('/x', { fetchImpl, sleep: noSleep })).rejects.toMatchObject({
      kind: 'http',
      status: 403,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('turns a hung request into a timeout error', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
        ),
    )
    await expect(getJson('/x', { fetchImpl, timeoutMs: 5, retries: 0 })).rejects.toMatchObject({
      kind: 'timeout',
    })
  })

  it('reports invalid JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('<html>', { status: 200 }))
    await expect(getJson('/x', { fetchImpl })).rejects.toMatchObject({ kind: 'invalid-response' })
  })

  it('passes a caller abort through instead of wrapping it', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      controller.abort()
      init?.signal?.throwIfAborted()
      return json({})
    })
    const error = await rejection(getJson('/x', { fetchImpl, signal: controller.signal }))
    expect(error).not.toBeInstanceOf(ApiError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
