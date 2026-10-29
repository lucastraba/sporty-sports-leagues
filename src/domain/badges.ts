import type { Season } from './types'

// "1996-1997" -> "1996–97", "2024" -> "2024". Display only; the API value stays the key.
export const formatSeason = (season: string): string => {
  const range = /^(\d{4})-(\d{4})$/.exec(season)
  if (!range) return season
  const [, start, end] = range as unknown as [string, string, string]
  return start.slice(0, 2) === end.slice(0, 2) ? `${start}–${end.slice(2)}` : `${start}–${end}`
}

export const seasonsWithBadges = (seasons: Season[]) => seasons.filter((s) => s.badgeUrl)

// The brief allows any season. The API lists seasons oldest first, so the most recent
// season that has a badge is the last one; it is the most recognisable choice.
export const defaultBadgeSeason = (seasons: Season[]): Season | undefined => {
  const withBadges = seasonsWithBadges(seasons)
  return withBadges[withBadges.length - 1]
}

// TheSportsDB serves resized images when "/small" (256px) is appended to the URL.
// The original badges are 512px, twice what the card displays.
export const badgeThumbnail = (url: string): string => {
  try {
    const { hostname } = new URL(url)
    return hostname.endsWith('thesportsdb.com') ? `${url}/small` : url
  } catch {
    return url
  }
}
