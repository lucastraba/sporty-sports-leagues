import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSportsDb } from '@/api/client'
import type { Season } from '@/domain/types'
import { toLoadError, type LoadError } from './leagues'

export type SeasonsState =
  | { status: 'loading' }
  | { status: 'ready'; seasons: Season[] }
  | { status: 'error'; error: LoadError }

// Season badges per league. State is keyed by league id, so opening league A and then
// league B before A has answered can't show A's badge under B's name.
// Freshness belongs to the request cache: every open asks it, so its TTL applies here too.
export const useSeasonsStore = defineStore('seasons', () => {
  const api = useSportsDb()
  const byLeague = ref<Record<string, SeasonsState>>({})

  const load = async (leagueId: string) => {
    const current = byLeague.value[leagueId]
    if (current?.status === 'loading') return

    const cached = api.peekSeasons(leagueId)
    if (cached) {
      byLeague.value[leagueId] = { status: 'ready', seasons: cached }
      return
    }

    // Expired badges stay on screen while fresh ones load.
    if (current?.status !== 'ready') byLeague.value[leagueId] = { status: 'loading' }
    try {
      byLeague.value[leagueId] = { status: 'ready', seasons: await api.getSeasons(leagueId) }
    } catch (e) {
      // Badges are history: a saved copy of any age is still right, so it's shown without
      // a warning when the network fails.
      const saved = api.peekStaleSeasons(leagueId)
      byLeague.value[leagueId] = saved
        ? { status: 'ready', seasons: saved.value }
        : { status: 'error', error: toLoadError(e) }
    }
  }

  return { byLeague, load }
})
