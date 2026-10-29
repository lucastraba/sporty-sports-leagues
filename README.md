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

The brief itself took me about 90 minutes. After that I chose to keep going with AI agents, to see how far I could take it: short sessions between 27 and 29 October, with most of the work in one sitting on the 28th. [AI_NOTES.md](AI_NOTES.md) says how I used them. I regrouped the commit history by layer to make it easier to review, so its dates don't show that timeline.

## Who it's for

The first thing I did was work out who the user would be. The brief describes this as a component of an online bookmaker, and from my first interview I understood that much of Sporty Group's market is in Africa and South America. So I assumed the user is on an Android phone, on prepaid data and a connection that drops, and knows leagues by their nicknames.

That assumption decided most of what follows. Responses are kept in `localStorage`, so a reload or a second visit costs no data, and when TheSportsDB can't be reached the app shows the last list it saved, says how old it is, and refreshes when the phone is back online. Badges load as small thumbnails, and the only web font is a 14.5 kB cut of one weight (the font I first chose looked great, but not at 90 kB). Search matches nicknames and ignores accents. On phones the whole card is the tap target, the sport dropdown opens the system picker, and the badge opens as a bottom sheet.

## What it does

- Lists every league with its name (`strLeague`), sport (`strSport`) and alternate names (`strLeagueAlternate`).
- Search by name or nickname, ranked by match quality, with matches highlighted. `EPL` finds the English Premier League.
- A sport dropdown built from the data, with counts that follow the search.
- Clicking a league opens its season badge, starting at the latest season that has one, with the other seasons in a strip.
- Loading, error (with retry), empty and "no badge" states.
- The URL holds the filters and the open league, so any view can be shared, and Back closes the dialog instead of leaving the site.
- English and Spanish. I chose Spanish because it's my first language, so I can check the translation is right.
- Keyboard and screen reader support, light and dark themes, and reduced motion; axe reports no violations.

## What I found in the API

1. The brief's API key `3` is retired: every call returns HTTP 403 asking for the new test key, `123`, which the app uses.
2. The free key returns a sample of 10 Soccer leagues with no `strLeagueAlternate`. So the dropdown is built from the data rather than hardcoded, and the app says it's showing a sample. The alternate names for those 10 leagues were captured once from `lookupleague.php` (`scripts/capture-alternate-names.mjs`) and ship in `src/api/alternateNames.json`; they only fill in where the API sends none. The tests use real responses that add Basketball and Motorsport.
3. The free key returns only a league's five oldest seasons, and a season's `strBadge` can be null, so the app opens on the latest season that has a badge.
4. The free key returns HTTP 429 after about 10 requests in five seconds, and the 429 has no CORS header, so the browser sees it as a network failure. A failure after eight or more requests in the last minute is treated as the rate limit: it isn't retried, and the message says to wait.
5. The brief's caching line ends in `strDescriptionEN`, which reads like a stray paste. All Leagues doesn't return that field, so I left it out.

## Design decisions

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

- `api/` knows HTTP and TheSportsDB, `domain/` is pure functions, `stores/` hold state, and components render. Each is tested on its own.
- Responses are parsed at the edge: `parse.ts` checks every response with Zod (`zod/mini`, 5.8 kB) and maps it to the app's own `League` and `Season`. A malformed entry is skipped instead of breaking the list, and a response missing its list field is an error rather than an empty answer that gets cached.
- The cache is my own, about 140 lines, because two GET endpoints don't justify TanStack Query. It keeps entries in memory and `localStorage` (leagues for 4 hours, badges for 24), makes one shared request when two callers ask at once, and never caches failures or an empty league list. Expired entries stay in storage for the offline fallback.
- Badge state is keyed by league id, so opening A and then B before A answers can't show A's badge under B.
- Network errors, timeouts and 5xx get one retry with backoff; 4xx and rate limits get none.
- The sport filter is a native `<select>` and the badge a native `<dialog>`. The select opens the system picker on phones; the dialog gives focus trapping, Escape and focus return without a library.
- Styles are Tailwind v4 over design tokens, with no UI kit, so the dark theme only swaps token values. The bundle is 74 kB of JavaScript and 12 kB of CSS gzipped.
- `es.ts` is typed against `en.ts`, so a missing key fails the type-check.

## Testing

Unit tests cover HTTP, the cache, parsing, search and badge choice, and component tests mount the whole app with a fake API client. The Playwright tests run against the production build in four browsers with recorded API responses, and cover caching across a reload, the offline fallback, keyboard and Back behaviour, a 320px viewport, and axe in both themes and languages. One smoke test hits the live API; CI runs it separately so a TheSportsDB outage can't block a build.

## Known issues

The last review found these. I stopped here rather than keep extending the time; before a release I'd fix them, roughly in this order:

- An empty response on refresh replaces a saved list instead of keeping it.
- The rate-limit counter resets on reload, so a reload while limited says "check your connection".
- With an expired cache and a connection that hangs, the skeleton shows for about 20 seconds although the saved list is available.
- A list refresh behind an open dialog resets the chosen season.
- The selected season chip can sit half-hidden in the strip.
- "fussball" doesn't find "fußball".
- Focus goes to `<body>` after "Clear filters".
- The search placeholder cuts off "EPL" on phones.
- `<span>` inside `<option>` logs a Vue warning during `pnpm test`.

## AI tools

See [AI_NOTES.md](AI_NOTES.md).
