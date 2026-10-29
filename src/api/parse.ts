// Runtime checks for TheSportsDB responses. The API is community-maintained and loosely
// typed (empty strings, nulls, missing fields), so nothing past this file trusts it blindly.

import * as z from 'zod/mini'
import type { League, Season } from '@/domain/types'
import { ApiError } from './http'

// Non-empty once trimmed.
const requiredText = z.string().check(z.trim(), z.minLength(1))
// The API says "none" with null, '' or by leaving the field out; all become ''.
const optionalText = z.pipe(
  z.nullish(z.string()),
  z.transform((value) => value?.trim() ?? ''),
)

const ApiLeague = z.object({
  idLeague: requiredText,
  strLeague: requiredText,
  strSport: optionalText,
  strLeagueAlternate: optionalText,
})

const ApiSeason = z.object({
  strSeason: requiredText,
  strBadge: optionalText,
})

// "Nothing found" is { leagues: null }. A response without the field at all is not an answer
// to the question asked, so it's an error rather than an empty list that gets cached.
const LeaguesResponse = z.object({ leagues: z.nullable(z.array(z.unknown())) })
const SeasonsResponse = z.object({ seasons: z.nullable(z.array(z.unknown())) })

const parseResponse = <T>(schema: z.ZodMiniType<T>, data: unknown): T => {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError('invalid-response', 'TheSportsDB sent an unexpected response.')
  }
  return result.data
}

// One malformed entry is skipped instead of failing the whole list.
const validEntries = <T>(schema: z.ZodMiniType<T>, items: unknown[] | null): T[] =>
  (items ?? []).flatMap((item) => {
    const result = schema.safeParse(item)
    return result.success ? [result.data] : []
  })

export const splitAlternateNames = (raw: string, mainName: string): string[] => {
  const seen = new Set([mainName.toLocaleLowerCase()])
  const names: string[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    const key = name.toLocaleLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

export const parseLeagues = (data: unknown): League[] => {
  const seenIds = new Set<string>()
  const leagues: League[] = []
  for (const item of validEntries(ApiLeague, parseResponse(LeaguesResponse, data).leagues)) {
    if (seenIds.has(item.idLeague)) continue
    seenIds.add(item.idLeague)
    leagues.push({
      id: item.idLeague,
      name: item.strLeague,
      sport: item.strSport || 'Other',
      alternateNames: splitAlternateNames(item.strLeagueAlternate, item.strLeague),
    })
  }
  return leagues
}

export const parseSeasons = (data: unknown): Season[] =>
  validEntries(ApiSeason, parseResponse(SeasonsResponse, data).seasons).map((item) => ({
    season: item.strSeason,
    badgeUrl: item.strBadge || null,
  }))
