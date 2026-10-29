import { describe, it, expect } from 'vitest'
import { filterLeagues, fold, highlight, sportOptions, tokenize } from '@/domain/search'
import { LEAGUES } from './helpers'

const names = (query: string, sport = '') =>
  filterLeagues(LEAGUES, tokenize(query), sport).map((m) => m.league.name)

describe('tokenize / fold', () => {
  it('lower-cases, strips accents and splits on whitespace', () => {
    expect(fold('Básquet Fußball')).toBe('basquet fußball')
    expect(tokenize('  Premier   LEAGUE ')).toEqual(['premier', 'league'])
    expect(tokenize('   ')).toEqual([])
  })
})

describe('filterLeagues', () => {
  it('returns everything in API order without a query', () => {
    expect(names('')).toEqual(LEAGUES.map((l) => l.name))
  })

  it('matches names case-insensitively', () => {
    expect(names('BUNDESLIGA')).toEqual(['German Bundesliga'])
  })

  it('requires every word to match, in any order', () => {
    expect(names('premier english')).toEqual(['English Premier League'])
  })

  it('matches nicknames through alternate names and reports which one matched', () => {
    const [match] = filterLeagues(LEAGUES, tokenize('epl'))
    expect(match?.league.name).toBe('English Premier League')
    expect(match?.matchedAlternate).toBe('EPL')
  })

  it('ignores accents in both directions', () => {
    expect(names('basquet')).toEqual(['Argentine LNB'])
    expect(names('básquet')).toEqual(['Argentine LNB'])
  })

  it('ranks name prefixes above word starts above substrings above alternates', () => {
    // "brit": BTCC matches only via "British Touring Car Championship" (alternate);
    // British GT Championship matches by name prefix.
    expect(names('brit')).toEqual(['British GT Championship', 'BTCC'])
  })

  it('combines with the sport filter', () => {
    expect(names('', 'Basketball')).toHaveLength(5)
    // Name prefix (NBL1 ...), then word start (Australian NBL), then substring (WNBL).
    expect(names('nbl', 'Basketball')).toEqual([
      'NBL1 West',
      'NBL1 Central',
      'Australian NBL',
      'Australian WNBL',
    ])
    expect(names('premier', 'Motorsport')).toEqual([])
  })
})

describe('sportOptions', () => {
  it('lists every sport alphabetically with counts for the current search', () => {
    expect(sportOptions(LEAGUES, [])).toEqual([
      { sport: 'Basketball', count: 5 },
      { sport: 'Motorsport', count: 5 },
      { sport: 'Soccer', count: 10 },
    ])
  })

  it('keeps sports with zero matches so the dropdown does not jump around', () => {
    expect(sportOptions(LEAGUES, tokenize('premier'))).toEqual([
      { sport: 'Basketball', count: 0 },
      { sport: 'Motorsport', count: 0 },
      { sport: 'Soccer', count: 2 },
    ])
  })
})

describe('highlight', () => {
  const marked = (text: string, query: string) =>
    highlight(text, tokenize(query))
      .filter((s) => s.hit)
      .map((s) => s.text)

  it('marks every match of every token', () => {
    expect(marked('English Premier League', 'e lea')).toEqual(['E', 'e', 'e', 'Lea', 'e'])
  })

  it('keeps the original accents when matching without them', () => {
    expect(marked('Liga Nacional de Básquet', 'basq')).toEqual(['Básq'])
  })

  it('returns the whole text unmarked without tokens', () => {
    expect(highlight('Serie A', [])).toEqual([{ text: 'Serie A', hit: false }])
  })

  it('merges overlapping matches into one run', () => {
    expect(marked('Bundesliga', 'bundes desliga')).toEqual(['Bundesliga'])
  })
})
