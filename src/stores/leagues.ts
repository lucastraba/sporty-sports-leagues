import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useSportsDb } from '@/api/client'
import { ApiError, type ApiErrorKind } from '@/api/http'
import { filterLeagues, sportOptions, tokenize } from '@/domain/search'
import type { League } from '@/domain/types'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

// What went wrong, without the wording: components turn it into a message in the user's language.
export type LoadError = { kind: ApiErrorKind | 'unknown'; status?: number }

export const toLoadError = (error: unknown): LoadError =>
  error instanceof ApiError ? { kind: error.kind, status: error.status } : { kind: 'unknown' }

export const useLeaguesStore = defineStore('leagues', () => {
  const api = useSportsDb()

  // A cached list renders on the first frame after a reload: no spinner, no request.
  const cached = api.peekLeagues()
  const leagues = shallowRef<League[]>(cached ?? [])
  const status = ref<LoadStatus>(cached ? 'ready' : 'idle')
  const error = ref<LoadError | null>(null)
  // Set when a fresh list couldn't be fetched and an older saved one is shown instead.
  const staleSince = ref<number | null>(null)
  const refreshing = ref(false)

  const query = ref('')
  const sport = ref('') // '' means all sports
  const selectedId = ref<string | null>(null)

  const tokens = computed(() => tokenize(query.value))
  const results = computed(() => filterLeagues(leagues.value, tokens.value, sport.value))
  const sports = computed(() => sportOptions(leagues.value, tokens.value))
  const hasFilters = computed(() => tokens.value.length > 0 || sport.value !== '')
  const selectedLeague = computed(
    () => leagues.value.find((league) => league.id === selectedId.value) ?? null,
  )

  // Filters can come from a shared URL. Drop the ones that don't exist in the data,
  // so "?sport=Cricket" shows everything instead of a confusing empty list.
  const dropUnknownFilters = () => {
    if (sport.value && !leagues.value.some((league) => league.sport === sport.value)) {
      sport.value = ''
    }
    if (selectedId.value && !selectedLeague.value) selectedId.value = null
  }

  // When the fetch fails, falls back to the last saved list, however old.
  const fetchLeagues = async () => {
    try {
      leagues.value = await api.getLeagues()
      error.value = null
      staleSince.value = null
    } catch (e) {
      error.value = toLoadError(e)
      const saved = api.peekStaleLeagues()
      if (!saved) {
        status.value = 'error'
        return
      }
      leagues.value = saved.value
      staleSince.value = saved.savedAt
    }
    status.value = 'ready'
    dropUnknownFilters()
  }

  // Asks the API even if a list is showing. An empty list is never cached, so after one
  // this really goes back to TheSportsDB.
  const reload = async () => {
    status.value = 'loading'
    error.value = null
    await fetchLeagues()
  }

  const load = async () => {
    if (status.value === 'loading' || status.value === 'ready') {
      dropUnknownFilters()
      return
    }
    await reload()
  }

  // Retries a stale list in place: the saved one stays on screen while it tries.
  const refresh = async () => {
    if (refreshing.value || staleSince.value === null) return
    refreshing.value = true
    await fetchLeagues()
    refreshing.value = false
  }

  const clearFilters = () => {
    query.value = ''
    sport.value = ''
  }

  return {
    isFreeTier: api.isFreeTier,
    leagues,
    status,
    error,
    staleSince,
    refreshing,
    query,
    sport,
    selectedId,
    tokens,
    results,
    sports,
    hasFilters,
    selectedLeague,
    load,
    reload,
    refresh,
    clearFilters,
    select: (id: string | null) => (selectedId.value = id),
  }
})
