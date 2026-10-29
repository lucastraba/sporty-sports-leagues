<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLeaguesStore } from '@/stores/leagues'
import { useLabels } from '@/composables/useLabels'
import LeagueCard from './LeagueCard.vue'
import StatusPanel from './StatusPanel.vue'

const store = useLeaguesStore()
const { t, locale } = useI18n()
const { sportName, errorMessage } = useLabels()
const SKELETON_COUNT = 8
// Cards deal in one after another; past this many they all arrive together.
const MAX_STAGGER = 12

// Equal row heights, so one long alternate name doesn't make its row taller than the rest.
// One column on phones, where equal heights would only add empty space to the short cards.
const GRID =
  'grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4 phone:auto-rows-auto phone:gap-3'

const SHIMMER = 'block shimmer animate-shimmer motion-reduce:animate-none'
// Sport tile, name, alternate names, action.
const SKELETON_LINES = [
  'size-11 rounded-md',
  'h-6 w-[85%] rounded-sm',
  'h-3.5 w-[70%] rounded-sm',
  'mt-4 h-3.5 w-[40%] rounded-sm',
]

const loading = computed(() => store.status === 'idle' || store.status === 'loading')

// Announced to screen readers when the result count changes.
const summary = computed(() => {
  if (store.status !== 'ready') return ''
  const total = store.leagues.length
  return store.hasFilters
    ? t('results.filtered', { shown: store.results.length }, total)
    : t('results.total', total)
})

const heading = computed(() =>
  store.sport
    ? t('results.sportLeagues', { sport: sportName(store.sport) })
    : t('results.allLeagues'),
)

// The saved list stands in for a fresh one: say why and how old it is.
const staleNotice = computed(() => {
  if (store.staleSince === null) return ''
  const date = new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(store.staleSince)
  const reason = store.error ? `${errorMessage(store.error)} ` : ''
  return reason + t('results.stale', { date })
})

const emptyMessage = computed(() => {
  const query = store.query.trim()
  const sport = store.sport && sportName(store.sport)
  if (query && sport) return t('results.noMatchBoth', { query, sport })
  if (query) return t('results.noMatchQuery', { query })
  return t('results.noMatchSport', { sport })
})
</script>

<template>
  <section aria-labelledby="results-heading">
    <div class="mb-5 flex items-end justify-between gap-3 border-b border-line pb-3">
      <!-- A short red underline on the heading, like a broadcast lower third. -->
      <h2
        id="results-heading"
        class="relative type-display text-2xl leading-none uppercase after:absolute after:-bottom-[calc(--spacing(3)+1px)] after:left-0 after:h-[3px] after:w-12 after:rounded-[3px] after:bg-accent"
      >
        {{ heading }}
      </h2>
      <p class="text-sm font-semibold text-ink-muted tabular-nums" role="status">{{ summary }}</p>
    </div>

    <div
      v-if="staleNotice && store.status === 'ready'"
      class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm"
      data-testid="stale-notice"
    >
      <p role="status">{{ staleNotice }}</p>
      <button
        type="button"
        class="min-h-11 rounded-full border border-line-strong bg-surface px-4 font-semibold text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-progress disabled:opacity-60"
        :disabled="store.refreshing"
        @click="store.refresh()"
      >
        {{ t('results.retry') }}
      </button>
    </div>

    <div v-if="loading" :class="GRID" aria-busy="true">
      <span class="sr-only" role="status">{{ t('results.loading') }}</span>
      <div
        v-for="n in SKELETON_COUNT"
        :key="n"
        class="grid min-h-48 content-start gap-3 rounded-lg border border-line bg-surface p-5"
        data-testid="skeleton"
        aria-hidden="true"
      >
        <span v-for="line in SKELETON_LINES" :key="line" :class="[SHIMMER, line]" />
      </div>
    </div>

    <StatusPanel
      v-else-if="store.status === 'error'"
      tone="error"
      illustration="red-card"
      :title="t('results.errorTitle')"
      :message="store.error ? errorMessage(store.error) : undefined"
      :action="t('results.retry')"
      @action="store.load()"
    />

    <StatusPanel
      v-else-if="store.leagues.length === 0"
      illustration="goal"
      :title="t('results.emptyTitle')"
      :message="t('results.emptyMessage')"
      :action="t('results.retry')"
      @action="store.reload()"
    />

    <StatusPanel
      v-else-if="store.results.length === 0"
      illustration="goal"
      :title="t('results.noMatchTitle')"
      :message="emptyMessage"
      :action="t('results.clearFilters')"
      @action="store.clearFilters()"
    />

    <!-- Cards deal in on first paint, and glide to their new place when a filter changes.
         Leaving cards drop out of the flow at once, so the others can glide into the gap. -->
    <TransitionGroup
      v-else
      id="league-results"
      tag="ul"
      appear
      :class="GRID"
      role="list"
      enter-active-class="deal-in motion-reduce:transition-none"
      enter-from-class="translate-y-[18px] scale-96 opacity-0"
      move-class="transition-transform duration-450 ease-out motion-reduce:transition-none"
      leave-active-class="hidden"
    >
      <li
        v-for="(match, index) in store.results"
        :key="match.league.id"
        :style="{ '--stagger': Math.min(index, MAX_STAGGER) }"
      >
        <LeagueCard :match="match" :tokens="store.tokens" @open="store.select" />
      </li>
    </TransitionGroup>
  </section>
</template>
