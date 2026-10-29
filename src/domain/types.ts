// The app's own model. API shapes (strLeague, strSport, ...) stop at src/api/parse.ts,
// so components never deal with nulls, padding or comma-separated strings.

export type League = {
  id: string
  name: string
  sport: string
  /** strLeagueAlternate split on commas, trimmed, de-duplicated, without the main name. */
  alternateNames: string[]
}

export type Season = {
  season: string
  /** Many seasons have no badge (strBadge: null). */
  badgeUrl: string | null
}
