// Captures alternate names for the free key's sample leagues into src/api/alternateNames.json,
// with requests spaced out to stay under the rate limit. Run: node scripts/capture-alternate-names.mjs

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
