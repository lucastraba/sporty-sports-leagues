// Captures alternate names for the free key's sample leagues into src/api/alternateNames.json.
//
// The free key's all_leagues.php leaves strLeagueAlternate empty; lookupleague.php has it.
// Fetching those at runtime costs one request per league, and the free key starts answering
// 429 after about ten requests in a few seconds, which then blocks the badge request. So the
// names are captured here, once, with requests spaced out, and ship with the app.
//
// Run: node scripts/capture-alternate-names.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const API = 'https://www.thesportsdb.com/api/v1/json/123'
const GAP_MS = 7000
const OUT = fileURLToPath(new URL('../src/api/alternateNames.json', import.meta.url))

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

const { leagues } = await getJson(`${API}/all_leagues.php`)
const names = {}
for (const { idLeague, strLeague } of leagues) {
  await wait(GAP_MS)
  const { leagues: [details] = [] } = await getJson(`${API}/lookupleague.php?id=${idLeague}`)
  const alternates = details?.strLeagueAlternate?.trim()
  if (alternates) names[idLeague] = alternates
  console.log(idLeague, strLeague, '→', alternates || '(none)')
}

writeFileSync(OUT, `${JSON.stringify(names, null, 2)}\n`)
console.log(`Wrote ${Object.keys(names).length} leagues to ${OUT}`)
