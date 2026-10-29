<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLeaguesStore } from '@/stores/leagues'
import { useSlashToFocus } from '@/composables/useSlashToFocus'
import { useLabels } from '@/composables/useLabels'
import { sportHue } from '@/domain/sportColor'
import SportIcon from './SportIcon.vue'

const store = useLeaguesStore()
const { query, sport } = storeToRefs(store)
const { t, locale } = useI18n()
const { sportName } = useLabels()

const input = ref<HTMLInputElement | null>(null)
useSlashToFocus(input)

const ready = computed(() => store.status === 'ready')

// "All sports" first, then one option per sport in the data, sorted by the translated name
// so the list reads alphabetically in every language. Counts follow the search.
const options = computed(() => [
  {
    value: '',
    label: t('filters.allSports'),
    count: store.sports.reduce((sum, o) => sum + o.count, 0),
  },
  ...store.sports
    .map((o) => ({ value: o.sport, label: sportName(o.sport), count: o.count }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
])

const clearSearch = () => {
  query.value = ''
  input.value?.focus()
}
</script>

<template>
  <form
    class="sticky top-3 z-5 flex flex-wrap items-center gap-3 rounded-[calc(var(--radius-lg)+--spacing(2))] border border-line bg-glass bg-clip-padding p-2 shadow-float backdrop-blur-[16px] backdrop-saturate-140"
    role="search"
    :aria-label="t('filters.label')"
    @submit.prevent
  >
    <div class="relative flex min-w-0 flex-[1_1_20rem] items-center">
      <label class="sr-only" for="league-search">{{ t('filters.search') }}</label>
      <svg
        class="pointer-events-none absolute left-4 size-5 text-ink-muted"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M13 13l4 4" />
      </svg>
      <input
        id="league-search"
        ref="input"
        v-model="query"
        class="min-h-13 w-full rounded-lg border border-line-strong bg-surface px-12 text-lg font-medium text-ink transition-[border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-ink-muted focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-focus-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        type="search"
        :placeholder="t('filters.placeholder')"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="search"
        aria-controls="league-results"
        @keydown.esc="query = ''"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-2 grid size-9 place-items-center rounded-full bg-surface-muted text-ink-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        :aria-label="t('filters.clear')"
        @click="clearSearch"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
      <kbd
        v-else
        class="pointer-events-none absolute right-3.5 rounded-sm border border-b-2 border-line-strong bg-surface-muted px-2 py-[0.1rem] font-mono text-xs leading-[1.4] font-semibold text-ink-muted touch:hidden phone:hidden"
        :title="t('filters.shortcutHint')"
        >/</kbd
      >
    </div>

    <!-- A native select: on phones it opens the system picker, and it stays one line however
         many sports a premium key returns. The selected sport's icon sits inside it. Wide
         enough for "Todos los deportes (10)" on one line. -->
    <div class="relative flex min-w-0 flex-[0_1_18rem] items-center max-sm:flex-auto">
      <label class="sr-only" for="league-sport">{{ t('filters.sport') }}</label>
      <SportIcon
        class="pointer-events-none absolute left-4 text-[1.25rem]"
        :class="
          sport ? 'text-[hsl(var(--hue)_70%_var(--sport-text-lightness))]' : 'text-accent-ink'
        "
        :style="sport ? { '--hue': sportHue(sport) } : undefined"
        :sport="sport"
        aria-hidden="true"
      />
      <select
        id="league-sport"
        v-model="sport"
        class="custom-select min-h-13 w-full cursor-pointer rounded-lg whitespace-nowrap border border-line-strong bg-surface pr-11 pl-12 text-lg font-semibold text-ink transition-[border-color,box-shadow] duration-150 focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-focus-ring focus-visible:outline-none disabled:cursor-progress disabled:text-ink-muted"
        :disabled="!ready"
        aria-controls="league-results"
      >
        <!-- The icon only shows where the option list is styled (see `custom-select`); the
             native list reads the text alone. -->
        <option v-for="option in options" :key="option.value" :value="option.value">
          <SportIcon
            class="text-[1.125rem]"
            :class="
              option.value
                ? 'text-[hsl(var(--hue)_70%_var(--sport-text-lightness))]'
                : 'text-accent-ink'
            "
            :style="option.value ? { '--hue': sportHue(option.value) } : undefined"
            :sport="option.value"
          />
          <span>{{
            ready ? t('filters.option', { sport: option.label, count: option.count }) : option.label
          }}</span>
        </option>
      </select>
      <svg
        class="pointer-events-none absolute right-4 size-4 text-ink-muted"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  </form>
</template>
