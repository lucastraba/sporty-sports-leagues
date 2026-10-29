import * as z from 'zod/mini'
import { LeagueSchema, SeasonSchema, type League, type Season } from '@/domain/types'
import { createRequestCache, type RequestCache, type StaleEntry } from './cache'
import { createBurstCounter, getJson } from './http'
import { parseLeagues, parseSeasons, splitAlternateNames } from './parse'
import capturedAlternates from './alternateNames.json'

// The brief's URLs use key "3". TheSportsDB has retired it: every call returns HTTP 403
// "The old '3' Free Sports API key is permanently disabled, Please use the new test key '123'".
export const FREE_API_KEY = '123'

export const API_BASE_URL = 'https://www.thesportsdb.com/api/v1/json'

// all_leagues.php is served with Cache-Control: max-age=14400, so match the server's 4 hours.
// Season badges are historical and change rarely.
const LEAGUES_TTL_MS = 4 * 60 * 60 * 1000
const SEASONS_TTL_MS = 24 * 60 * 60 * 1000

const LeaguesSchema = z.array(LeagueSchema)
const SeasonsSchema = z.array(SeasonSchema)

// The free key's list has no strLeagueAlternate. These were captured by
// scripts/capture-alternate-names.mjs and fill in only where the API sends none.
const CAPTURED_ALTERNATES: Record<string, string> = capturedAlternates

const withCapturedAlternates = (league: League): League => {
  const raw = CAPTURED_ALTERNATES[league.id]
  if (league.alternateNames.length > 0 || !raw) return league
  return { ...league, alternateNames: splitAlternateNames(raw, league.name) }
}

export type SportsDbClient = {
  /** The free key returns a 10-league sample; the UI says so. */
  readonly isFreeTier: boolean
  /** Synchronous read of cached leagues, so a reload can render without a spinner. */
  peekLeagues: () => League[] | undefined
  getLeagues: () => Promise<League[]>
  /** The last leagues response, however old, for when a fresh one can't be fetched. */
  peekStaleLeagues: () => StaleEntry<League[]> | undefined
  peekSeasons: (leagueId: string) => Season[] | undefined
  getSeasons: (leagueId: string) => Promise<Season[]>
  peekStaleSeasons: (leagueId: string) => StaleEntry<Season[]> | undefined
}

export type SportsDbClientOptions = {
  apiKey?: string
  baseUrl?: string
  cache?: RequestCache
  request?: (url: string) => Promise<unknown>
}

// See createBurstCounter in http.ts.
const rateLimitAwareRequest = () => {
  const burst = createBurstCounter()
  return (url: string) => {
    burst.count()
    return getJson(url, { looksRateLimited: burst.isBurst })
  }
}

export const createSportsDbClient = ({
  apiKey = FREE_API_KEY,
  baseUrl = API_BASE_URL,
  cache = createRequestCache(),
  request = rateLimitAwareRequest(),
}: SportsDbClientOptions = {}): SportsDbClient => {
  const root = `${baseUrl}/${encodeURIComponent(apiKey)}`
  const isFreeTier = apiKey === FREE_API_KEY
  // A premium key returns different data than the free one: keep their caches apart
  // without writing the key itself into localStorage.
  const tier = isFreeTier ? 'free' : 'premium'
  const leaguesKey = `${tier}:leagues`
  const seasonsKey = (id: string) => `${tier}:seasons:${id}`

  return {
    isFreeTier,

    peekLeagues: () => cache.peek(leaguesKey, LeaguesSchema),

    getLeagues: () =>
      cache.get(
        leaguesKey,
        async () =>
          parseLeagues(await request(`${root}/all_leagues.php`)).map(withCapturedAlternates),
        // An empty list is an upstream glitch, not data: don't keep it for four hours.
        { schema: LeaguesSchema, ttlMs: LEAGUES_TTL_MS, keep: (leagues) => leagues.length > 0 },
      ),

    peekStaleLeagues: () => cache.peekStale(leaguesKey, LeaguesSchema),

    peekSeasons: (leagueId) => cache.peek(seasonsKey(leagueId), SeasonsSchema),

    getSeasons: (leagueId) => {
      const url = `${root}/search_all_seasons.php?badge=1&id=${encodeURIComponent(leagueId)}`
      return cache.get(seasonsKey(leagueId), async () => parseSeasons(await request(url)), {
        schema: SeasonsSchema,
        ttlMs: SEASONS_TTL_MS,
      })
    },

    peekStaleSeasons: (leagueId) => cache.peekStale(seasonsKey(leagueId), SeasonsSchema),
  }
}
