import { describe, it, expect } from 'vitest'
import { useLeaguesStore } from '@/stores/leagues'
import { useSeasonsStore } from '@/stores/seasons'
import { ApiError } from '@/api/http'
import { deferred, LEAGUES, SEASONS_4328, setup } from './helpers'

describe('leagues store', () => {
  it('goes idle -> loading -> ready', async () => {
    const pending = deferred<typeof LEAGUES>()
    setup({ getLeagues: () => pending.promise })
    const store = useLeaguesStore()
    expect(store.status).toBe('idle')
    const loading = store.load()
    expect(store.status).toBe('loading')
    pending.resolve(LEAGUES)
    await loading
    expect(store.status).toBe('ready')
    expect(store.results).toHaveLength(20)
  })

  it('starts ready from the cache, without a request', async () => {
    const { client } = setup({ peekLeagues: () => LEAGUES })
    const store = useLeaguesStore()
    expect(store.status).toBe('ready')
    await store.load()
    expect(client.getLeagues).not.toHaveBeenCalled()
  })

  it('does not start a second request while one is in flight', async () => {
    const { client } = setup()
    const store = useLeaguesStore()
    await Promise.all([store.load(), store.load()])
    expect(client.getLeagues).toHaveBeenCalledTimes(1)
  })

  it('keeps the error kind and can retry', async () => {
    const { client } = setup()
    client.getLeagues.mockRejectedValueOnce(new ApiError('network', 'Could not reach TheSportsDB.'))
    const store = useLeaguesStore()
    await store.load()
    expect(store.status).toBe('error')
    expect(store.error).toEqual({ kind: 'network' })
    await store.load()
    expect(store.status).toBe('ready')
    expect(store.error).toBeNull()
  })

  it('reload() asks the API again after an empty list', async () => {
    const { client } = setup()
    client.getLeagues.mockResolvedValueOnce([])
    const store = useLeaguesStore()
    await store.load()
    expect(store.leagues).toHaveLength(0)
    await store.reload()
    expect(client.getLeagues).toHaveBeenCalledTimes(2)
    expect(store.leagues).toHaveLength(20)
  })

  it('falls back to the saved list when a fresh one fails, and refreshes it in place', async () => {
    const saved = { value: LEAGUES.slice(0, 3), savedAt: 1_700_000_000_000 }
    const { client } = setup({ peekStaleLeagues: () => saved })
    client.getLeagues.mockRejectedValueOnce(new ApiError('network', 'offline'))
    const store = useLeaguesStore()
    await store.load()
    expect(store.status).toBe('ready')
    expect(store.leagues).toHaveLength(3)
    expect(store.staleSince).toBe(saved.savedAt)
    expect(store.error).toEqual({ kind: 'network' })

    // A failed refresh keeps the saved list on screen.
    client.getLeagues.mockRejectedValueOnce(new ApiError('timeout', 'slow'))
    await store.refresh()
    expect(store.leagues).toHaveLength(3)
    expect(store.error).toEqual({ kind: 'timeout' })

    await store.refresh()
    expect(store.leagues).toHaveLength(20)
    expect(store.staleSince).toBeNull()
    expect(store.error).toBeNull()
  })

  it('drops a sport or league from a shared URL that does not exist in the data', async () => {
    setup()
    const store = useLeaguesStore()
    store.sport = 'Cricket'
    store.select('nope')
    await store.load()
    expect(store.sport).toBe('')
    expect(store.selectedId).toBeNull()
  })

  it('keeps valid filters from a shared URL', async () => {
    setup()
    const store = useLeaguesStore()
    store.sport = 'Motorsport'
    store.select('4372')
    await store.load()
    expect(store.sport).toBe('Motorsport')
    expect(store.selectedLeague?.name).toBe('BTCC')
  })

  it('clearFilters() resets search and sport', async () => {
    setup()
    const store = useLeaguesStore()
    await store.load()
    store.query = 'zzz'
    store.sport = 'Soccer'
    expect(store.results).toHaveLength(0)
    store.clearFilters()
    expect(store.hasFilters).toBe(false)
    expect(store.results).toHaveLength(20)
  })
})

describe('seasons store', () => {
  it('loads once per league', async () => {
    const { client } = setup()
    const store = useSeasonsStore()
    await Promise.all([store.load('4328'), store.load('4328')])
    await store.load('4328')
    expect(client.getSeasons).toHaveBeenCalledTimes(1)
    expect(store.byLeague['4328']).toEqual({ status: 'ready', seasons: SEASONS_4328 })
  })

  it('uses the cache synchronously when it can', async () => {
    const { client } = setup({ peekSeasons: () => SEASONS_4328 })
    const store = useSeasonsStore()
    void store.load('4328')
    expect(store.byLeague['4328']?.status).toBe('ready')
    expect(client.getSeasons).not.toHaveBeenCalled()
  })

  it('keeps each league separate when answers arrive out of order', async () => {
    const slow = deferred<typeof SEASONS_4328>()
    const fast = deferred<typeof SEASONS_4328>()
    setup({ getSeasons: (id) => (id === 'A' ? slow.promise : fast.promise) })
    const store = useSeasonsStore()
    const a = store.load('A')
    const b = store.load('B')
    fast.resolve([{ season: 'B-season', badgeUrl: 'b.png' }])
    await b
    slow.resolve([{ season: 'A-season', badgeUrl: 'a.png' }])
    await a
    expect(store.byLeague.A).toEqual({
      status: 'ready',
      seasons: [{ season: 'A-season', badgeUrl: 'a.png' }],
    })
    expect(store.byLeague.B).toEqual({
      status: 'ready',
      seasons: [{ season: 'B-season', badgeUrl: 'b.png' }],
    })
  })

  it('records errors and retries on the next load', async () => {
    const { client } = setup()
    client.getSeasons.mockRejectedValueOnce(new ApiError('timeout', 'slow'))
    const store = useSeasonsStore()
    await store.load('4328')
    expect(store.byLeague['4328']).toEqual({ status: 'error', error: { kind: 'timeout' } })
    await store.load('4328')
    expect(store.byLeague['4328']?.status).toBe('ready')
  })

  it('shows saved badges of any age when the network fails', async () => {
    const saved = { value: SEASONS_4328, savedAt: 0 }
    const { client } = setup({ peekStaleSeasons: () => saved })
    client.getSeasons.mockRejectedValueOnce(new ApiError('network', 'offline'))
    const store = useSeasonsStore()
    await store.load('4328')
    expect(store.byLeague['4328']).toEqual({ status: 'ready', seasons: SEASONS_4328 })
  })
})
