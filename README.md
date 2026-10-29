# Sports Leagues

A Vue 3 single-page app that lists sports leagues from [TheSportsDB](https://www.thesportsdb.com), with search, a sport dropdown, and season badges on click.

| Desktop | Mobile |
| --- | --- |
| ![League list](docs/screenshots/desktop-list.png) | ![League list on mobile](docs/screenshots/mobile-list.png) |
| ![Badge dialog](docs/screenshots/desktop-dialog.png) | ![Badge sheet on mobile](docs/screenshots/mobile-dialog.png) |
| ![Spanish, dark theme](docs/screenshots/desktop-spanish-dark.png) | ![Badge sheet in the dark theme](docs/screenshots/mobile-dark-dialog.png) |

## Run it

Needs Node 22.18+ or 24.12+ (`.nvmrc` has 24) and pnpm (`npm install -g pnpm` if you don't have it).

```sh
pnpm install
pnpm dev             # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `pnpm test` | 93 unit and component tests (Vitest) |
| `pnpm test:e2e` | 82 browser tests in Chrome (desktop and mobile), Firefox and WebKit (Playwright; first run: `pnpm exec playwright install chromium firefox webkit`) |
| `pnpm check` | Type-check, lint, format check, unit and e2e tests: what CI runs, with the live API test as a separate step |
| `pnpm build` | Type-check and production build to `dist/` |

No API key is needed. `VITE_SPORTSDB_API_KEY=<key>` in `.env.local` uses a premium key instead.

## Time

About 90 minutes of my own time, as the brief suggests. Claude Code wrote most of the code and tests (see [AI_NOTES.md](AI_NOTES.md)); my time went on reading the brief and the API, deciding what the app should do and for whom, and reviewing and testing what came back.

## Who it's for

The brief describes this as a component of an online bookmaker. I assumed its user is on an Android phone, on prepaid data and a connection that drops, and knows leagues by their nicknames. That assumption decided most of what follows. Responses are kept in `localStorage`, so a reload or a second visit costs no data, and when TheSportsDB can't be reached the app shows the last list it saved, says how old it is, and refreshes when the phone is back online. Badges load as small thumbnails, and the only web font is a 14.5 kB cut of one weight. Search matches nicknames and ignores accents. On phones the hero shrinks so the first leagues are on the first screen, the whole card is the tap target, the sport dropdown opens the system picker, and the badge opens as a bottom sheet.

## What it does

- Lists every league with its name (`strLeague`), sport (`strSport`) and alternate names (`strLeagueAlternate`).
- Search by name or nickname, ignoring case and accents and ranked by match quality, with matches highlighted. `EPL` finds the English Premier League; `basquet` finds "Liga Nacional de Básquet".
- A sport dropdown built from the data, with counts that follow the search.
- Clicking a league opens its season badge in a dialog (a bottom sheet on phones), starting at the latest season that has one, with the other seasons in a strip.
- Loading skeletons, errors with retry, empty states and a "no badge" state.
- The URL holds the filters and the open league (`?q=epl&sport=Soccer&league=4328`), so any view can be shared. Opening a league adds a history entry, so Back (or the back gesture on Android) closes the dialog instead of leaving the site.
- English and Spanish, following the browser, with a switcher that remembers the choice.
- Keyboard, screen reader, light and dark themes, and reduced motion are covered; axe reports no violations.

## Things worth knowing about the API

1. The brief's API key `3` is retired: every call returns HTTP 403 asking for the new test key, `123`. The app uses `123`.
2. The free key returns a sample of 10 Soccer leagues with no `strLeagueAlternate`. Built only against that, the dropdown would have one option, a required field would always be empty, and "EPL" would find nothing. So:
   - the UI is built from the data rather than hardcoded, and the app tells the user it is showing a sample;
   - the alternate names for the 10 sample leagues were captured from `lookupleague.php`, which does return them, by `scripts/capture-alternate-names.mjs`, and ship with the app in `src/api/alternateNames.json` (under 1 kB). They fill in only where the API sends none, so a premium list with its own names is untouched. Fetching them live would take one request per league, up to 17 kB each, and the free key's rate limit (below) would then block the badge request;
   - the tests and screenshots also use real API data that adds Basketball and Motorsport leagues, so the sport filter is exercised for real.
3. The free key returns only a league's five oldest seasons, so the EPL opens on its 1996–97 badge; a premium key returns them all. A season's `strBadge` can be null, so the app picks the latest season that has one, and says so when none does.
4. The free key is documented at 30 requests per minute, but I measured HTTP 429 after about 10 requests in five seconds. The 429 has no CORS header, so the browser can't read it: the request fails the same way a dropped connection does. The client counts its own requests, and a failure after eight or more in the last minute, while the browser is online, is treated as the rate limit. It isn't retried, and the message says to wait a minute rather than to check the connection. A first visit makes one request, and each badge one more; after that the cache answers.
5. The brief's caching line ends in `strDescriptionEN`, which reads like a stray paste. All Leagues doesn't return that field; only `lookupleague.php` does, at one request per league. I took it as noise and left the description out. If it was meant as a field to show, it belongs in the badge dialog, fetched alongside the badge and cached the same way.

## Design decisions

Code is split into layers. `api/` knows HTTP and TheSportsDB, `domain/` is pure functions (search, ranking, badge choice), `stores/` hold state, and components render. Each layer is tested on its own. The commit history follows the same layers: I regrouped it for review, so it shows the structure rather than the order the work was done in.

```
src/
  api/          http.ts (fetch, timeout, retry, typed errors) · cache.ts · parse.ts · sportsDb.ts
  domain/       search.ts · badges.ts · sportColor.ts · types.ts
  stores/       leagues.ts (list, filters, selection, offline fallback) · seasons.ts (badges per league)
  i18n/         index.ts · locales/en.ts · locales/es.ts
  composables/  useUrlState · useSlashToFocus · useTilt · useLabels
  components/   AppHero · LeagueFilters · LeagueResults · LeagueCard · LeagueDialog · BadgeImage
                StatusPanel · SportTag · SportIcon · HighlightText · CountUp · LocaleSwitcher
```

Responses are validated at the edge with Zod. The API is loosely typed (nulls, empty strings, a comma-separated alias field), so `parse.ts` checks every response against a schema and maps it to the app's own `League` and `Season`, which are Zod schemas too. A malformed entry is skipped instead of breaking the list. A response with no list field at all is an error, not an empty answer that would be cached; `{ "seasons": null }` is how the API says "none". I used `zod/mini`, the tree-shakeable build: it adds 5.8 kB gzipped, where the full `zod` import would add 24 kB.

The cache is about 140 lines of my own code rather than a library, because two GET endpoints don't justify TanStack Query. It shares one in-flight request between callers, so two quick clicks make one fetch. Leagues are kept for 4 hours, matching the server's `max-age`, and badges for 24. Entries persist in `localStorage` and survive quota errors and private mode. Every read names the schema it expects, so a stored value from an older version of the app, or a hand edit, is dropped and fetched again instead of reaching the UI. Failures are never cached, so "Try again" really tries again, and neither is an empty league list, which only comes from a glitch upstream. Expired entries stay in storage until a fresh response replaces them, which is what the offline fallback reads. A reload renders the cached list on the first frame, without a spinner.

Badge state in Pinia is keyed by league id, so opening league A and then B before A answers can't show A's badge under B's name. The store asks the cache every time a league opens, so the cache's TTL is the only freshness rule.

Errors are explained, not swallowed. Network errors, timeouts and 5xx get one retry with backoff; 4xx and rate limits get none. Stores keep the error's kind, and the UI turns it into a message in the user's language.

The sport filter is a native `<select>`. On phones it opens the system picker, and it stays one line when a premium key returns dozens of sports. The selected sport's icon shows inside it. With a mouse, browsers that support customizable selects (Chrome and Edge 135+, and current WebKit) draw the option list in the app's style, with each sport's icon; everywhere else the browser's own list is used.

The dialog is a native `<dialog>`: `showModal()` gives focus trapping, Escape, an inert background and focus return without a library.

Styles are Tailwind v4 over design tokens, with no UI kit. Tailwind's default palette is off, so every class maps to a token, and the dark theme only swaps token values. The bundle is 74 kB of JavaScript and 12 kB of CSS gzipped.

Body text uses the system font, which costs nothing to load. Headings, scores and league names use Archivo, cut from the 90 kB variable font down to one static condensed ExtraBold instance of 14.5 kB with fontTools' instancer. Accented Latin outside Latin-1 is a second 13 kB file that the browser fetches only when a league name needs it. Archivo is under the OFL, and the licence ships next to the files in `src/assets/fonts/`.

Every animation ends, and with reduced motion there are none; an e2e test asserts that.

Localization uses vue-i18n. `es.ts` is typed against `en.ts`, so a missing key fails the type-check. Messages are full sentences with placeholders, because word order differs between languages.

## Testing

The unit tests cover HTTP (retry, timeout, 429 with and without a readable status, abort), the cache (TTL, de-duplication, persistence, corrupt storage, values that don't match their schema, quota, stale entries, empty lists), parsing against real and malformed responses, search ranking and badge choice. Component tests mount the whole app with a fake API client. The Playwright tests run against the production build in desktop Chrome, a Pixel 7 viewport, Firefox and WebKit, with the API mocked from recorded fixtures. They cover nickname search on the free key's real list, caching across a reload (counting requests), a slow API, the saved list when the API is unreachable after the cache expires, focus return after Escape, Back closing the dialog, an empty list not being kept, a malformed saved list being replaced, no horizontal scroll at 320px, and axe in both themes and both languages. One smoke test hits the live API, including a nickname search (`SKIP_LIVE=1` skips it). CI runs it as its own step that can't fail the build, so an outage at TheSportsDB doesn't block a correct change.

## With more time

- A service worker, so the page itself opens with no connection, not only the data.
- Virtualise the list for the full premium catalogue; 20 cards don't need it.
- Preload a badge on hover or focus.
- Precompile the i18n messages and drop vue-i18n's message compiler from the bundle.

## AI tools

See [AI_NOTES.md](AI_NOTES.md).
