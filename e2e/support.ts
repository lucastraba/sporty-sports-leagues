import { readFileSync } from 'node:fs'
import type { Page, Route } from '@playwright/test'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url))

const LEAGUES = {
  // The free key's real list: 10 Soccer leagues, no alternate names.
  free: fixture('all_leagues.json'),
  // The same plus Basketball and Motorsport, with real alternate names filled in.
  mixed: fixture('all_leagues.mixed.json'),
}
const SEASONS = fixture('seasons_4328.json')
const BADGE = fixture('badge.png')

export type MockOptions = {
  /** Delay before answering, to observe loading states. */
  delayMs?: number
  /** Status for all_leagues.php on the first N calls. */
  failLeagues?: { status: number; times: number }
  /** Which league list to serve. Defaults to 'mixed'. */
  leagues?: keyof typeof LEAGUES
}

export type ApiMock = {
  calls: { leagues: number; seasons: string[] }
}

const json = (route: Route, body: Buffer) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body,
  })

// Waits for entrance animations and transitions to finish (cards dealing in, the dialog opening).
// Mid-fade colours would fail contrast checks. Endless ones (loading shimmer) are ignored.
export const animationsSettled = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  )

export const mockApi = async (page: Page, options: MockOptions = {}): Promise<ApiMock> => {
  const mock: ApiMock = { calls: { leagues: 0, seasons: [] } }
  let failures = options.failLeagues?.times ?? 0
  const wait = () => new Promise((r) => setTimeout(r, options.delayMs ?? 0))

  await page.route('https://www.thesportsdb.com/api/v1/json/**', async (route) => {
    const url = new URL(route.request().url())
    await wait()
    if (url.pathname.endsWith('/all_leagues.php')) {
      mock.calls.leagues++
      if (failures > 0) {
        failures--
        return route.fulfill({ status: options.failLeagues!.status, body: 'error' })
      }
      return json(route, LEAGUES[options.leagues ?? 'mixed'])
    }
    if (url.pathname.endsWith('/search_all_seasons.php')) {
      const id = url.searchParams.get('id') ?? ''
      mock.calls.seasons.push(id)
      if (id === '4329') {
        return json(
          route,
          Buffer.from(JSON.stringify({ seasons: [{ strSeason: '1892-1893', strBadge: null }] })),
        )
      }
      return json(route, SEASONS)
    }
    return route.fulfill({ status: 404, body: 'not mocked' })
  })

  await page.route('https://r2.thesportsdb.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BADGE }),
  )

  return mock
}
