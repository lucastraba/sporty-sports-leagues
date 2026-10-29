// Runtime checks for TheSportsDB responses. The API is community-maintained and loosely
// typed (empty strings, nulls, missing fields), so nothing past this file trusts it blindly.

import type { League, Season } from '@/domain/types'
import { ApiError } from './http'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const listField = (data: unknown, field: string): unknown[] => {
  if (!isRecord(data)) {
    throw new ApiError('invalid-response', 'TheSportsDB sent an unexpected response.')
  }
  const list = data[field]
  // The API answers "nothing found" with { field: null }.
  if (list == null) return []
  if (!Array.isArray(list)) {
    throw new ApiError('invalid-response', 'TheSportsDB sent an unexpected response.')
  }
  return list
}

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
  for (const item of listField(data, 'leagues')) {
    if (!isRecord(item)) continue
    const id = text(item.idLeague)
    const name = text(item.strLeague)
    if (!id || !name || seenIds.has(id)) continue
    seenIds.add(id)
    leagues.push({
      id,
      name,
      sport: text(item.strSport) || 'Other',
      alternateNames: splitAlternateNames(text(item.strLeagueAlternate), name),
    })
  }
  return leagues
}

export const parseSeasons = (data: unknown): Season[] => {
  return listField(data, 'seasons').flatMap((item) => {
    if (!isRecord(item)) return []
    const season = text(item.strSeason)
    if (!season) return []
    return [{ season, badgeUrl: text(item.strBadge) || null }]
  })
}
