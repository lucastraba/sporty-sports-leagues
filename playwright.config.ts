import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// E2E runs against the production build (vite preview), with TheSportsDB mocked from
// recorded fixtures so results are deterministic and the rate limit never bites.
// One test (live.spec.ts) hits the real API; SKIP_LIVE=1 skips it. CI runs it as a separate
// step that can't fail the build, so an outage at TheSportsDB doesn't block a correct change.
const PORT = 4174

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // Tests tagged @desktop run once: keyboard shortcuts, and the live API smoke test
  // (the free key allows only a few requests in quick succession). Firefox and WebKit run the rest, because
  // layout differs between engines: the season badge once rendered at 0×0 in Safari only.
  testIgnore: process.env.SKIP_LIVE ? ['**/live.spec.ts'] : [],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grepInvert: /@desktop/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@desktop/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /@desktop/ },
  ],
  webServer: {
    command: `pnpm build-only && pnpm exec vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
