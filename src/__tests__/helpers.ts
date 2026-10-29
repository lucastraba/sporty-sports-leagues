import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { provideSportsDb } from '@/api/client'
import type { SportsDbClient } from '@/api/sportsDb'
import { parseLeagues, parseSeasons } from '@/api/parse'
import type { League, Season } from '@/domain/types'
import mixedLeagues from '@/api/__fixtures__/all_leagues.mixed.json'
import seasons4328 from '@/api/__fixtures__/seasons_4328.json'

// Real API data: the free key's 10 Soccer leagues (alternate names filled in from
// search_all_leagues.php) plus 5 Basketball and 5 Motorsport leagues.
export const LEAGUES: League[] = parseLeagues(mixedLeagues)
export const SEASONS_4328: Season[] = parseSeasons(seasons4328)

export const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type Overrides = Partial<Omit<SportsDbClient, 'isFreeTier'>>

// Every method is a vi.fn, overridden or not, so tests can always assert on calls.
export const fakeClient = (overrides: Overrides = {}) => {
  return {
    isFreeTier: false,
    peekLeagues: vi.fn<SportsDbClient['peekLeagues']>(overrides.peekLeagues ?? (() => undefined)),
    getLeagues: vi.fn<SportsDbClient['getLeagues']>(overrides.getLeagues ?? (async () => LEAGUES)),
    peekStaleLeagues: vi.fn<SportsDbClient['peekStaleLeagues']>(
      overrides.peekStaleLeagues ?? (() => undefined),
    ),
    peekSeasons: vi.fn<SportsDbClient['peekSeasons']>(overrides.peekSeasons ?? (() => undefined)),
    getSeasons: vi.fn<SportsDbClient['getSeasons']>(
      overrides.getSeasons ?? (async () => SEASONS_4328),
    ),
    peekStaleSeasons: vi.fn<SportsDbClient['peekStaleSeasons']>(
      overrides.peekStaleSeasons ?? (() => undefined),
    ),
  }
}

/** Fresh Pinia plus a fake API client. Call before creating stores or mounting. */
export const setup = (overrides: Overrides = {}) => {
  const client = fakeClient(overrides)
  provideSportsDb(client)
  const pinia = createPinia()
  setActivePinia(pinia)
  return { client, pinia }
}

export const memoryStorage = () => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}
