// fetch() wrapper: timeout, one retry for transient failures, and errors the UI can explain.

export type ApiErrorKind = 'network' | 'timeout' | 'rate-limit' | 'http' | 'invalid-response'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export type RequestOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  /** Extra attempts after the first, for network errors, timeouts and 5xx only. */
  retries?: number
  retryDelayMs?: number
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /**
   * Asked when fetch fails before any response arrives. True means the failure is probably a
   * rate limit the browser couldn't show: a 429 sent without CORS headers.
   */
  looksRateLimited?: () => boolean
}

const RATE_LIMIT_MESSAGE = 'Too many requests to TheSportsDB. Wait a minute and try again.'

// Counts requests in a sliding window. TheSportsDB's free key answers a burst with HTTP 429
// and no CORS header, so the browser can't read the status and fetch fails as if the
// connection had dropped. A failure right after a burst is taken to be that rate limit.
export const createBurstCounter = ({
  limit = 8,
  windowMs = 60_000,
  now = Date.now,
}: { limit?: number; windowMs?: number; now?: () => number } = {}) => {
  const started: number[] = []
  const prune = () => {
    const since = now() - windowMs
    while ((started[0] ?? Infinity) <= since) started.shift()
  }
  return {
    count: () => {
      prune()
      started.push(now())
    },
    isBurst: () => {
      prune()
      return started.length >= limit
    },
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const isTransient = (error: ApiError) =>
  error.kind === 'network' ||
  error.kind === 'timeout' ||
  (error.kind === 'http' && (error.status ?? 0) >= 500)

const attemptOnce = async (
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  outer?: AbortSignal,
  looksRateLimited?: () => boolean,
): Promise<unknown> => {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (outer?.aborted) controller.abort()
  outer?.addEventListener('abort', forwardAbort, { once: true })

  try {
    let response: Response
    try {
      response = await fetchImpl(url, { signal: controller.signal })
    } catch (error) {
      if (outer?.aborted) throw error
      if (timedOut) throw new ApiError('timeout', 'TheSportsDB took too long to respond.')
      // Offline is certain; anything else might be a 429 the browser hid.
      if (globalThis.navigator?.onLine !== false && looksRateLimited?.()) {
        throw new ApiError('rate-limit', RATE_LIMIT_MESSAGE)
      }
      throw new ApiError('network', 'Could not reach TheSportsDB. Check your connection.')
    }

    if (response.status === 429) throw new ApiError('rate-limit', RATE_LIMIT_MESSAGE, 429)
    if (!response.ok) {
      throw new ApiError(
        'http',
        `TheSportsDB responded with HTTP ${response.status}.`,
        response.status,
      )
    }

    try {
      return await response.json()
    } catch (error) {
      if (outer?.aborted) throw error
      if (timedOut) throw new ApiError('timeout', 'TheSportsDB took too long to respond.')
      throw new ApiError('invalid-response', 'TheSportsDB sent a response that is not valid JSON.')
    }
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', forwardAbort)
  }
}

export const getJson = async (url: string, options: RequestOptions = {}): Promise<unknown> => {
  const {
    retries = 1,
    retryDelayMs = 600,
    sleep = wait,
    fetchImpl = (input, init) => fetch(input, init),
  } = options

  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptOnce(
        url,
        fetchImpl,
        options.timeoutMs ?? 10_000,
        options.signal,
        options.looksRateLimited,
      )
    } catch (error) {
      // A caller-initiated abort is not an API failure: pass it through untouched.
      if (!(error instanceof ApiError)) throw error
      // A rate limit is deliberately not retried: retrying at once only extends the lockout.
      if (attempt >= retries || !isTransient(error)) throw error
      await sleep(retryDelayMs * 2 ** attempt)
    }
  }
}
