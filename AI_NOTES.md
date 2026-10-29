# AI tools

I used Claude Code (Anthropic) in a terminal, with access to the repo, a shell and a headless browser, over several sessions: the first build, a visual pass, a move to Tailwind with Spanish added, and a final pass that checked the app against the brief and its likely user.

## What it did

- Called both endpoints before any code was written. It found that the brief's key `3` returns 403 and that the free key returns a 10-league Soccer-only sample without alternate names, and saved real responses as test fixtures. Building the sport list from the data and the "free sample" notice came from that.
- Scaffolded with `create-vue`, then wrote code and tests in small steps, running type-check, lint and both test suites after each one.
- Reviewed the UI from screenshots of the production build, in both themes, on desktop and a phone.
- Checked the app against the brief, which turned up two misses. A redesign had swapped the sport dropdown for chips; it's a native `<select>` again. And nickname search only worked on the test data: the free key's live list has no alternate names, so "EPL" found nothing and every card said "No alternate names". It first tried looking each league up live with `lookupleague.php`. The live smoke test then failed: the free key allows only about ten quick requests, so the lookups used up the budget and the badge request got a 429. The names are now captured once by a paced script and ship with the app, and an e2e test runs the search on the free key's real list.
- Cut the web font from 90 kB to 14.5 kB: body text moved to the system font, and Archivo was reduced to the one condensed weight the headings use.

## What the checks caught

- axe found contrast failures in the sport tags (4.34:1) and a muted text colour (3.86:1). The tokens were fixed, and the check runs in both themes.
- The CSS minifier collapsed `backdrop-filter` and a hand-written `-webkit-` copy into the prefixed form only, which Chrome ignores. The source now has the standard property and the build adds the prefix.
- Every unit test failed on Node 25+, whose own empty `localStorage` global hid jsdom's. Vitest workers now start with `--no-experimental-webstorage`.
- Vue drops whitespace-only text that contains a line break, so Prettier's wrapping glued "EPL" to "+1 more". The template now has an explicit space, and a test checks it.
- Running the e2e suite in Firefox and WebKit, not only Chrome, found two Safari bugs. The season badge rendered at 0×0: its size was a percentage of a wrapper that shrink-wrapped it, which Chrome and Firefox resolve and WebKit doesn't. And Safari doesn't focus a button on click, so closing the dialog left focus nowhere; it now goes back to the card. Both engines stay in the suite.
- A ranking test was wrong, not the code: a name that starts with the query ("NBL1 West") should rank above one where a later word does ("Australian NBL").

## Decisions I kept

Every choice in the README has its reason written down so it can be questioned in a review: no caching library, the native `<dialog>` and `<select>`, parsing at the edge, no UI kit, and the offline fallback.
