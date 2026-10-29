import { test, expect, type Route } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { animationsSettled, mockApi } from './support'

test.describe('league list', () => {
  test('lists leagues with name, sport and alternate names', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('status').filter({ hasText: 'leagues' })).toHaveText('20 leagues')
    const epl = page.getByRole('button', { name: /English Premier League/ })
    await expect(epl).toContainText('Soccer')
    await expect(epl).toContainText('Premier League, EPL')
  })

  test('searches by name and nickname, and filters by sport', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    const search = page.getByRole('searchbox', { name: 'Search' })
    await search.fill('epl')
    await expect(page.locator('[data-league-id]')).toHaveCount(1)
    await expect(page.locator('[data-league-id] mark')).toHaveText('EPL')

    await search.fill('')
    const sport = page.getByRole('combobox', { name: 'Sport' })
    await sport.selectOption('Motorsport')
    await expect(page.locator('[data-league-id]')).toHaveCount(5)
    await expect(page).toHaveURL(/sport=Motorsport/)

    await search.fill('premier')
    await expect(page.getByText('No leagues matching “premier” in Motorsport.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('[data-league-id]')).toHaveCount(20)
    await expect(sport).toHaveValue('')
  })

  test('finds a league by nickname on the free key, whose list has none', async ({ page }) => {
    const mock = await mockApi(page, { leagues: 'free' })
    await page.goto('/')
    await expect(page.locator('[data-league-id]')).toHaveCount(10)

    await page.getByRole('searchbox', { name: 'Search' }).fill('epl')
    await expect(page.locator('[data-league-id]')).toHaveCount(1)
    await expect(page.locator('[data-league-id="4328"] mark')).toHaveText('EPL')
    // The names ship with the app: no request beyond the list itself.
    expect(mock.calls).toEqual({ leagues: 1, seasons: [] })
  })

  test('restores a shared URL', async ({ page }) => {
    await mockApi(page)
    await page.goto('/?q=bundes&sport=Soccer')
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('bundes')
    await expect(page.locator('[data-league-id]')).toHaveCount(1)
  })

  test('shows skeletons while loading', async ({ page }) => {
    await mockApi(page, { delayMs: 800 })
    await page.goto('/')
    await expect(page.getByTestId('skeleton').first()).toBeVisible()
    await expect(page.locator('[data-league-id]').first()).toBeVisible()
  })

  test('recovers from an API error with "Try again"', async ({ page }) => {
    // 403 is not retried automatically, so the error state is shown.
    const mock = await mockApi(page, { failLeagues: { status: 403, times: 1 } })
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('HTTP 403')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('[data-league-id]')).toHaveCount(20)
    expect(mock.calls.leagues).toBe(2)
  })

  test('does not keep an empty list, and "Try again" asks again', async ({ page }) => {
    const mock = await mockApi(page, { emptyLeagues: 1 })
    await page.goto('/')
    await expect(page.getByText('No leagues available')).toBeVisible()
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('[data-league-id]')).toHaveCount(20)
    expect(mock.calls.leagues).toBe(2)
  })

  test('shows the saved list when TheSportsDB is unreachable after the cache expires', async ({
    page,
  }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('[data-league-id]')).toHaveCount(20)

    // Age every saved response past its TTL, then cut the API off, as on a phone with no signal.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage).filter((k) => k.startsWith('sportsdb:'))) {
        const entry = JSON.parse(localStorage.getItem(key)!)
        localStorage.setItem(key, JSON.stringify({ ...entry, expiresAt: 0 }))
      }
    })
    const offline = (route: Route) => route.abort('internetdisconnected')
    await page.route('https://www.thesportsdb.com/api/**', offline)
    await page.reload()

    await expect(page.locator('[data-league-id]')).toHaveCount(20)
    const notice = page.getByTestId('stale-notice')
    await expect(notice).toContainText('Could not reach TheSportsDB')
    await expect(notice).toContainText('Showing the list saved on')

    // Back online: the browser's "online" event refreshes the list and the notice goes away.
    await page.unroute('https://www.thesportsdb.com/api/**', offline)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(notice).toBeHidden()
  })

  test('"/" focuses the search box @desktop', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('[data-league-id]').first()).toBeVisible()
    await page.keyboard.press('/')
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused()
  })
})

test.describe('season badge', () => {
  test('opens a dialog with the badge, switches season, and closes with Escape', async ({
    page,
  }) => {
    const mock = await mockApi(page)
    await page.goto('/')

    const card = page.getByRole('button', { name: /English Premier League/ })
    await card.click()
    const dialog = page.getByRole('dialog', { name: 'English Premier League' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', /1996–97/)
    await expect(page).toHaveURL(/league=4328/)

    await dialog.getByRole('radio', { name: '1992–93' }).check()
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', /1992–93/)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(card).toBeFocused() // focus returns to the card that opened it
    await expect(page).not.toHaveURL(/league=/)

    // Second open is served from the cache.
    await card.click()
    await expect(dialog.getByRole('img')).toBeVisible()
    expect(mock.calls.seasons).toEqual(['4328'])
  })

  test('caches across a reload', async ({ page }) => {
    const mock = await mockApi(page)
    await page.goto('/')
    await page.getByRole('button', { name: /English Premier League/ }).click()
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
    expect(mock.calls).toEqual({ leagues: 1, seasons: ['4328'] })
  })

  test('says so when a league has no badge', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await page.getByRole('button', { name: /English League Championship/ }).click()
    await expect(page.getByRole('dialog')).toContainText('No badge on file')
  })

  test('closes from the close button and the backdrop', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await page.getByRole('button', { name: /German Bundesliga/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: /German Bundesliga/ }).click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(dialog).toBeHidden()
  })
})

test.describe('localization', () => {
  test.use({ locale: 'es-AR' })

  test('follows the browser language and remembers a manual switch', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Encuentra tu liga.')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('status').filter({ hasText: 'ligas' })).toHaveText('20 ligas')
    await expect(page.getByRole('button', { name: /English Premier League/ })).toContainText(
      'Fútbol',
    )
    await page.getByRole('combobox', { name: 'Deporte' }).selectOption('Motorsport')
    await expect(page.getByRole('heading', { name: 'Ligas de Automovilismo' })).toBeVisible()

    await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find your league.')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find your league.')
    await expect(page).toHaveTitle('Sports Leagues')
  })

  test('has no detectable accessibility violations in Spanish', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('[data-league-id]').first()).toBeVisible()
    await animationsSettled(page)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
})

test.describe('quality', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no detectable accessibility violations (${colorScheme} theme)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await mockApi(page)
      await page.goto('/')
      await expect(page.locator('[data-league-id]').first()).toBeVisible()
      await animationsSettled(page)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

      await page.getByRole('button', { name: /English Premier League/ }).click()
      await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
      await animationsSettled(page)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    })
  }

  test('does not animate with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('[data-league-id]').first()).toBeVisible()
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)

    await page.getByRole('button', { name: /English Premier League/ }).click()
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  })

  test('does not scroll horizontally on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('[data-league-id]').first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})
