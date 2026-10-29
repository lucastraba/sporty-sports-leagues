import { describe, it, expect, vi } from 'vitest'
import { createRequestCache } from '@/api/cache'
import { parseLeagues, parseSeasons, splitAlternateNames } from '@/api/parse'
import { createSportsDbClient } from '@/api/sportsDb'
import freeLeagues from '@/api/__fixtures__/all_leagues.json'
import seasons4328 from '@/api/__fixtures__/seasons_4328.json'
import { memoryStorage } from './helpers'

describe('parseLeagues', () => {
  it('parses the real free-tier response, which has no alternate names', () => {
    const leagues = parseLeagues(freeLeagues)
    expect(leagues).toHaveLength(10)
    expect(leagues[0]).toEqual({
      id: '4328',
      name: 'English Premier League',
      sport: 'Soccer',
      alternateNames: [],
    })
  })

  it('splits, trims and de-duplicates alternate names, dropping the main name', () => {
    expect(
      splitAlternateNames(
        ' EPL, Premier League ,, epl, English Premier League',
        'English Premier League',
      ),
    ).toEqual(['EPL', 'Premier League'])
  })

  it('skips malformed and duplicate entries instead of failing the whole list', () => {
    const leagues = parseLeagues({
      leagues: [
        { idLeague: '1', strLeague: 'A', strSport: 'Soccer' },
        { idLeague: '1', strLeague: 'A again', strSport: 'Soccer' },
        { idLeague: '', strLeague: 'No id' },
        { idLeague: '2', strLeague: '   ' },
        null,
        'nonsense',
        { idLeague: '3', strLeague: 'No sport', strSport: null },
      ],
    })
    expect(leagues.map((l) => [l.id, l.sport])).toEqual([
      ['1', 'Soccer'],
      ['3', 'Other'],
    ])
  })

  it('treats { leagues: null } as an empty list', () => {
    expect(parseLeagues({ leagues: null })).toEqual([])
  })

  it('rejects responses that are not the expected shape', () => {
    expect(() => parseLeagues('<html>')).toThrow(/unexpected response/)
    expect(() => parseLeagues({ leagues: 'x' })).toThrow(/unexpected response/)
  })

  it('rejects a response without the leagues field, instead of reading it as empty', () => {
    expect(() => parseLeagues({})).toThrow(/unexpected response/)
  })
})

describe('parseSeasons', () => {
  it('parses the real response and keeps seasons without a badge as null', () => {
    const seasons = parseSeasons(seasons4328)
    expect(seasons[0]).toEqual({
      season: '1992-1993',
      badgeUrl: expect.stringMatching(/^https:\/\/r2\.thesportsdb\.com\//),
    })
    expect(parseSeasons({ seasons: [{ strSeason: '1892-1893', strBadge: null }] })).toEqual([
      { season: '1892-1893', badgeUrl: null },
    ])
  })

  it('treats { seasons: null } (unknown league) as no seasons', () => {
    expect(parseSeasons({ seasons: null })).toEqual([])
  })

  it('rejects a response without the seasons field, so it is not cached as "no badge"', () => {
    expect(() => parseSeasons({})).toThrow(/unexpected response/)
  })

  it('skips malformed seasons and keeps the rest', () => {
    expect(
      parseSeasons({
        seasons: [
          { strSeason: ' 2001-2002 ', strBadge: '' },
          { strSeason: 2002 },
          { strBadge: 'x.png' },
          null,
        ],
      }),
    ).toEqual([{ season: '2001-2002', badgeUrl: null }])
  })
})

describe('createSportsDbClient', () => {
  const setup = (apiKey?: string) => {
    const request = vi.fn<(url: string) => Promise<unknown>>(async (url) =>
      url.includes('all_leagues') ? freeLeagues : seasons4328,
    )
    const storage = memoryStorage()
    const client = createSportsDbClient({
      apiKey,
      request,
      cache: createRequestCache({ storage }),
    })
    return { client, request, storage }
  }

  it('uses the working free key, not the retired "3" from the brief', async () => {
    const { client, request } = setup()
    await client.getLeagues()
    expect(request).toHaveBeenCalledWith(
      'https://www.thesportsdb.com/api/v1/json/123/all_leagues.php',
    )
    expect(client.isFreeTier).toBe(true)
  })

  it('calls the season badge endpoint with the league id', async () => {
    const { client, request } = setup()
    await client.getSeasons('4328')
    expect(request).toHaveBeenCalledWith(
      'https://www.thesportsdb.com/api/v1/json/123/search_all_seasons.php?badge=1&id=4328',
    )
  })

  it('fills in the alternate names the free list leaves out, so "EPL" can match', async () => {
    const { client } = setup()
    const leagues = await client.getLeagues()
    expect(leagues.find((league) => league.id === '4328')?.alternateNames).toContain('EPL')
  })

  it('caches both endpoints', async () => {
    const { client, request } = setup()
    await client.getLeagues()
    await client.getLeagues()
    await client.getSeasons('4328')
    await client.getSeasons('4328')
    expect(request).toHaveBeenCalledTimes(2)
    expect(client.peekLeagues()).toHaveLength(10)
    expect(client.peekSeasons('4328')).toHaveLength(5)
    expect(client.peekSeasons('9999')).toBeUndefined()
  })

  it('does not cache an empty league list, so the next load asks again', async () => {
    const { client, request } = setup()
    request.mockResolvedValueOnce({ leagues: null })
    await expect(client.getLeagues()).resolves.toEqual([])
    expect(client.peekLeagues()).toBeUndefined()
    await expect(client.getLeagues()).resolves.toHaveLength(10)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not cache a seasons response that is missing its field', async () => {
    const { client, request } = setup()
    request.mockResolvedValueOnce({})
    await expect(client.getSeasons('4328')).rejects.toMatchObject({ kind: 'invalid-response' })
    expect(client.peekSeasons('4328')).toBeUndefined()
    await expect(client.getSeasons('4328')).resolves.toHaveLength(5)
  })

  it('keeps a premium key out of storage and its cache apart from the free one', async () => {
    const { client, storage } = setup('secret-key')
    await client.getLeagues()
    expect(client.isFreeTier).toBe(false)
    const keys = [...storage.data.keys()].join()
    expect(keys).toContain('premium:leagues')
    expect(keys).not.toContain('secret-key')
  })
})
