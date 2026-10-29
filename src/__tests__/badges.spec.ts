import { describe, it, expect } from 'vitest'
import {
  badgeThumbnail,
  defaultBadgeSeason,
  formatSeason,
  seasonsWithBadges,
} from '@/domain/badges'
import { SEASONS_4328 } from './helpers'

describe('badges', () => {
  it('picks the most recent season that has a badge', () => {
    expect(
      defaultBadgeSeason([
        { season: '2010', badgeUrl: 'a' },
        { season: '2011', badgeUrl: 'b' },
        { season: '2012', badgeUrl: null },
      ])?.season,
    ).toBe('2011')
    expect(defaultBadgeSeason(SEASONS_4328)?.season).toBe('1996-1997')
  })

  it('returns nothing when no season has a badge', () => {
    expect(defaultBadgeSeason([{ season: '1892-1893', badgeUrl: null }])).toBeUndefined()
    expect(seasonsWithBadges([])).toEqual([])
  })

  it('formats seasons for display', () => {
    expect(formatSeason('1996-1997')).toBe('1996–97')
    expect(formatSeason('1999-2000')).toBe('1999–2000')
    expect(formatSeason('2024')).toBe('2024')
  })

  it('asks TheSportsDB for the 256px thumbnail and leaves other hosts alone', () => {
    expect(badgeThumbnail('https://r2.thesportsdb.com/images/x.png')).toBe(
      'https://r2.thesportsdb.com/images/x.png/small',
    )
    expect(badgeThumbnail('https://example.com/x.png')).toBe('https://example.com/x.png')
    expect(badgeThumbnail('not a url')).toBe('not a url')
  })
})
