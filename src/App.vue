<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLeaguesStore } from '@/stores/leagues'
import { useUrlState } from '@/composables/useUrlState'
import AppHero from '@/components/AppHero.vue'
import LeagueFilters from '@/components/LeagueFilters.vue'
import LeagueResults from '@/components/LeagueResults.vue'
import LeagueDialog from '@/components/LeagueDialog.vue'

const { t } = useI18n()
const store = useLeaguesStore()
const { query, sport, selectedId } = storeToRefs(store)

useUrlState({ q: query, sport, league: selectedId })
onMounted(store.load)

// Showing a saved list because the network was down: try again as soon as it's back.
const refreshWhenOnline = () => void store.refresh()
onMounted(() => window.addEventListener('online', refreshWhenOnline))
onUnmounted(() => window.removeEventListener('online', refreshWhenOnline))
</script>

<template>
  <a
    class="absolute -top-16 left-3 z-10 rounded-md bg-accent-fill px-3 py-2 text-on-accent focus:top-3"
    href="#league-search"
    >{{ t('app.skipLink') }}</a
  >

  <AppHero />

  <!-- The toolbar floats up over the bottom of the hero. minmax(0, …) stops a wide child
       from widening the page. -->
  <main class="page-width relative z-1 -mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 pb-16">
    <LeagueFilters />
    <LeagueResults />
  </main>

  <footer class="border-t-3 border-accent bg-night text-sm text-night-muted">
    <div class="page-width flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6">
      <span class="font-extrabold font-condensed tracking-[0.04em] text-night-ink uppercase">
        {{ t('app.brand') }}
      </span>
      <i18n-t keypath="app.footer" tag="span">
        <template #source>
          <a
            class="text-night-accent"
            href="https://www.thesportsdb.com"
            target="_blank"
            rel="noopener noreferrer"
            >TheSportsDB<span class="sr-only">{{ t('app.opensInNewTab') }}</span></a
          >
        </template>
      </i18n-t>
    </div>
  </footer>

  <LeagueDialog />
</template>
