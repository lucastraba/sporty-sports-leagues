// Matching rules:
// - Case- and accent-insensitive: "basquet" finds "Liga Nacional de Básquet".
// - Every word must match: "premier eng" finds "English Premier League".
// - Alternate names count: "EPL" finds the English Premier League.
// - With a query, results are ranked: name prefix, then word start, then anywhere in the
//   name, then alternate names. Without one, the API order is kept.

import type { League } from './types'

export const fold = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()

export const tokenize = (query: string) => fold(query).split(/\s+/).filter(Boolean)

const words = (value: string) => value.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

export type LeagueMatch = {
  league: League
  /** Set when the query matched an alternate name rather than the main name. */
  matchedAlternate?: string
}

type Scored = LeagueMatch & {
  score: number
  index: number
}

const scoreLeague = (league: League, tokens: string[]): Omit<Scored, 'index'> | null => {
  if (tokens.length === 0) return { league, score: 0 }

  const name = fold(league.name)
  const nameWords = words(name)
  const alternates = league.alternateNames.map((alt) => ({ alt, folded: fold(alt) }))
  let score = 0
  let matchedAlternate: string | undefined

  for (const token of tokens) {
    if (name.startsWith(token)) continue
    if (nameWords.some((word) => word.startsWith(token))) score += 1
    else if (name.includes(token)) score += 2
    else {
      const hit = alternates.find(({ folded }) => folded.includes(token))
      if (!hit) return null
      score += 3
      matchedAlternate ??= hit.alt
    }
  }
  return { league, score, matchedAlternate }
}

export const filterLeagues = (leagues: League[], tokens: string[], sport = ''): LeagueMatch[] => {
  const scored: Scored[] = []
  leagues.forEach((league, index) => {
    if (sport && league.sport !== sport) return
    const result = scoreLeague(league, tokens)
    if (result) scored.push({ ...result, index })
  })
  if (tokens.length) scored.sort((a, b) => a.score - b.score || a.index - b.index)
  return scored.map(({ league, matchedAlternate }) =>
    matchedAlternate ? { league, matchedAlternate } : { league },
  )
}

export type SportOption = {
  sport: string
  /** Leagues of this sport that match the current search (not the sport filter). */
  count: number
}

// Every sport in the data stays in the list, even at zero, so options don't jump around
// while typing. Alphabetical, because the free API returns sports in no useful order.
export const sportOptions = (leagues: League[], tokens: string[]): SportOption[] => {
  const counts = new Map<string, number>()
  for (const league of leagues) {
    const matches = scoreLeague(league, tokens) !== null
    counts.set(league.sport, (counts.get(league.sport) ?? 0) + (matches ? 1 : 0))
  }
  return [...counts]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => a.sport.localeCompare(b.sport))
}

export type TextSegment = {
  text: string
  hit: boolean
}

// Splits text into highlighted and plain runs. Works on folded text but slices the
// original, so "Básquet" stays "Básquet" when highlighted by "basquet".
export const highlight = (value: string, tokens: string[]): TextSegment[] => {
  if (!value || tokens.length === 0) return [{ text: value, hit: false }]

  let folded = ''
  const origin: number[] = [] // folded index -> index in value
  let offset = 0
  for (const char of value) {
    for (const unit of fold(char)) {
      folded += unit
      origin.push(offset)
    }
    offset += char.length
  }

  const marked: boolean[] = Array.from({ length: value.length }, () => false)
  for (const token of tokens) {
    for (let at = folded.indexOf(token); at !== -1; at = folded.indexOf(token, at + token.length)) {
      const start = origin[at] ?? 0
      const last = origin[at + token.length - 1] ?? start
      const end = last + (value.codePointAt(last)! > 0xffff ? 2 : 1)
      marked.fill(true, start, end)
    }
  }

  const segments: TextSegment[] = []
  for (let i = 0; i < value.length; i++) {
    const hit = marked[i] ?? false
    const previous = segments[segments.length - 1]
    if (previous && previous.hit === hit) previous.text += value[i]
    else segments.push({ text: value[i] ?? '', hit })
  }
  return segments
}
