import { createSportsDbClient, type SportsDbClient } from './sportsDb'

// One client per app. Stores read it through useSportsDb(); tests swap it with provideSportsDb().
let current: SportsDbClient | undefined

export const useSportsDb = (): SportsDbClient => {
  current ??= createSportsDbClient({
    // Optional premium key. Anything in a VITE_ variable ships to the browser, which is
    // how TheSportsDB v1 works anyway (the key is part of the URL).
    apiKey: import.meta.env.VITE_SPORTSDB_API_KEY || undefined,
  })
  return current
}

export const provideSportsDb = (client: SportsDbClient) => {
  current = client
}
