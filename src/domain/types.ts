import * as z from 'zod/mini'

// The app's own model. API shapes (strLeague, strSport, ...) stop at src/api/parse.ts,
// so components never deal with nulls, padding or comma-separated strings.
// The schemas check data read back from localStorage, which the app can't trust either:
// it may be from an older version of the app, or edited by hand.

export const LeagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  sport: z.string(),
  /** strLeagueAlternate split on commas, trimmed, de-duplicated, without the main name. */
  alternateNames: z.array(z.string()),
})
export type League = z.infer<typeof LeagueSchema>

export const SeasonSchema = z.object({
  season: z.string(),
  /** Many seasons have no badge (strBadge: null). */
  badgeUrl: z.nullable(z.string()),
})
export type Season = z.infer<typeof SeasonSchema>
