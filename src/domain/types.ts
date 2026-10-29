import * as z from 'zod/mini'

// The app's own model; API shapes stop at src/api/parse.ts. The schemas also check data
// read back from localStorage, which may come from an older version of the app.

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
