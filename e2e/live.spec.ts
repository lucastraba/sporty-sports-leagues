import { test, expect } from '@playwright/test'

// Smoke test against the real TheSportsDB API: proves the free key and both endpoints work.
// Everything else runs on recorded fixtures. Skip offline with SKIP_LIVE=1.

test('loads real leagues and a real season badge @desktop', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-league-id]').first()).toBeVisible({ timeout: 15_000 })
  // The free list has no alternate names; the captured ones in alternateNames.json fill in.
  await page.getByRole('searchbox', { name: 'Search' }).fill('epl')
  await expect(page.locator('[data-league-id]')).toHaveCount(1, { timeout: 15_000 })
  await page.getByRole('searchbox', { name: 'Search' }).fill('')
  await page.getByRole('button', { name: /English Premier League/ }).click()
  const badge = page.getByRole('dialog').getByRole('img')
  await expect(badge).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => badge.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
})
