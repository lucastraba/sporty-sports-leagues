<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLeaguesStore } from '@/stores/leagues'
import { useSeasonsStore } from '@/stores/seasons'
import { useTilt } from '@/composables/useTilt'
import { useLabels } from '@/composables/useLabels'
import { defaultBadgeSeason, formatSeason, seasonsWithBadges } from '@/domain/badges'
import { sportHue } from '@/domain/sportColor'
import BadgeImage from './BadgeImage.vue'
import SportIcon from './SportIcon.vue'
import SportTag from './SportTag.vue'
import StatusPanel from './StatusPanel.vue'

// Native <dialog> with showModal(): focus trap, Escape, inert background and focus return
// to the card come from the browser instead of hand-written code (see onClose for Safari).

const leagues = useLeaguesStore()
const seasons = useSeasonsStore()
const { t } = useI18n()
const { errorMessage } = useLabels()
const dialog = ref<HTMLDialogElement | null>(null)
const { style: tiltStyle, onPointerMove, onPointerLeave } = useTilt()

const league = computed(() => leagues.selectedLeague)
const hue = computed(() => (league.value ? sportHue(league.value.sport) : 0))
const state = computed(() => (league.value ? seasons.byLeague[league.value.id] : undefined))
const badgeSeasons = computed(() =>
  state.value?.status === 'ready' ? seasonsWithBadges(state.value.seasons) : [],
)
const newestFirst = computed(() => [...badgeSeasons.value].reverse())

const chosen = ref('')
const current = computed(
  () =>
    badgeSeasons.value.find((season) => season.season === chosen.value) ??
    defaultBadgeSeason(badgeSeasons.value),
)

const sync = () => {
  const element = dialog.value
  if (!element) return
  if (league.value) {
    chosen.value = ''
    void seasons.load(league.value.id)
    if (!element.open) element.showModal()
  } else if (element.open) {
    element.close()
  }
}

watch(league, sync, { flush: 'post' })
onMounted(sync)

// Fired by Escape, the close button and backdrop clicks alike. The browser hands focus back
// to whatever had it before the dialog opened, but Safari doesn't focus a button on click,
// so there focus stays in the closed dialog; the card that opened it gets focus instead.
const onClose = () => {
  const id = league.value?.id
  leagues.select(null)
  const active = document.activeElement
  if (id === undefined || (active !== document.body && !dialog.value?.contains(active))) return
  const card = [...document.querySelectorAll<HTMLElement>('[data-league-id]')].find(
    (element) => element.dataset.leagueId === id,
  )
  card?.focus()
}

const onBackdropClick = (event: MouseEvent) => {
  if (event.target === dialog.value) dialog.value?.close()
}

// A centred modal that springs in; on phones, a bottom sheet that slides up, easier to reach
// and to dismiss with a thumb.
const DIALOG = [
  'm-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,100vw-2rem)] rounded-xl border border-line bg-surface p-0 text-ink',
  'shadow-[var(--elevation-lg),0_0_120px_-20px_hsl(var(--hue)_70%_45%/0.35)]',
  'backdrop:bg-[rgb(5_7_10/0.6)] backdrop:backdrop-blur-[6px] backdrop:backdrop-saturate-80',
  'phone:mx-0 phone:mt-auto phone:mb-0 phone:w-screen phone:max-w-none phone:rounded-b-none phone:border-b-0',
  'motion-safe:wide:open:animate-dialog-in motion-safe:phone:open:animate-sheet-in motion-safe:open:backdrop:animate-backdrop-in',
]

// A spotlight from above, and a pool of the sport's colour on the floor.
const STAGE =
  'group/stage relative grid min-h-76 place-items-center p-6 phone:min-h-64 phone:p-5 bg-[conic-gradient(from_180deg_at_50%_-20%,transparent_155deg,rgb(255_255_255/0.07)_172deg,rgb(255_255_255/0.11)_180deg,rgb(255_255_255/0.07)_188deg,transparent_205deg),radial-gradient(16rem_3.5rem_at_50%_78%,hsl(var(--hue)_80%_55%/0.4),transparent_70%)]'

const SEASON =
  'relative inline-grid min-h-11 flex-none cursor-pointer snap-start place-items-center rounded-full border border-transparent bg-surface-muted px-3 font-bold whitespace-nowrap tabular-nums transition-colors duration-150 hover:not-has-checked:border-line-strong has-checked:bg-[hsl(var(--hue)_70%_28%)] has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus motion-reduce:transition-none'
</script>

<template>
  <dialog
    ref="dialog"
    :class="DIALOG"
    aria-labelledby="dialog-title"
    :style="{ '--hue': hue }"
    @close="onClose"
    @click="onBackdropClick"
  >
    <div v-if="league">
      <!-- The dark half, header and stage, stays dark in both themes. -->
      <div
        class="relative isolate overflow-hidden bg-[radial-gradient(30rem_16rem_at_0%_0%,hsl(var(--hue)_70%_40%/0.35),transparent_70%),linear-gradient(180deg,#0d1117_0%,var(--color-night)_100%)] text-night-ink"
      >
        <SportIcon
          class="absolute -top-10 -right-10 -z-1 -rotate-14 text-[12rem] text-[hsl(var(--hue)_70%_70%)] opacity-7"
          :sport="league.sport"
        />

        <header class="flex items-start justify-between gap-3 px-6 pt-6 phone:px-5 phone:pt-4">
          <div class="grid justify-items-start gap-3">
            <SportTag :sport="league.sport" night />
            <h2
              id="dialog-title"
              class="type-display text-[clamp(1.75rem,1.2rem+2.5vw,2.25rem)] leading-[0.95] text-balance uppercase"
            >
              {{ league.name }}
            </h2>
            <p v-if="league.alternateNames.length" class="text-sm text-night-muted">
              {{ t('dialog.alsoKnownAs', { names: league.alternateNames.join(' · ') }) }}
            </p>
          </div>
          <button
            type="button"
            class="grid size-10 flex-none place-items-center rounded-full border border-night-line bg-white/8 text-night-ink transition-[background-color,rotate] duration-250 ease-spring hover:bg-white/16 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-safe:hover:rotate-90 motion-reduce:transition-none"
            :aria-label="t('dialog.close')"
            @click="dialog?.close()"
          >
            <svg
              class="size-4"
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
        </header>

        <section
          :class="STAGE"
          :aria-label="t('dialog.badgeSection')"
          @pointermove="onPointerMove"
          @pointerleave="onPointerLeave"
        >
          <div
            v-if="!state || state.status === 'loading'"
            class="aspect-square w-44 animate-pulse rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.1),transparent)] motion-reduce:animate-none"
            aria-busy="true"
          >
            <span class="sr-only" role="status">{{ t('dialog.loading') }}</span>
          </div>

          <StatusPanel
            v-else-if="state.status === 'error'"
            compact
            night
            tone="error"
            illustration="red-card"
            :title="t('dialog.errorTitle')"
            :message="errorMessage(state.error)"
            :action="t('dialog.retry')"
            @action="seasons.load(league.id)"
          />

          <StatusPanel
            v-else-if="!current?.badgeUrl"
            compact
            night
            illustration="crest"
            :title="t('dialog.noBadgeTitle')"
            :message="t('dialog.noBadgeMessage')"
          />

          <figure v-else class="grid w-full justify-items-center gap-4">
            <!-- Turns toward the pointer; follows it quickly while hovered, settles slowly.
                 Full width so the badge's percentage size has something to resolve against:
                 shrink-wrapped, Safari sizes it to 0. -->
            <div
              class="tilt w-full transition-transform duration-400 ease-out will-change-transform group-hover/stage:duration-120 motion-reduce:transition-none"
              :style="tiltStyle"
            >
              <BadgeImage
                :src="current.badgeUrl"
                :alt="
                  t('dialog.badgeAlt', {
                    league: league.name,
                    season: formatSeason(current.season),
                  })
                "
              />
            </div>
            <figcaption class="grid justify-items-center gap-[0.15rem]">
              <span class="text-xs font-bold tracking-[0.18em] text-night-muted uppercase">
                {{ t('dialog.season') }}
              </span>
              <span
                class="type-display text-[2rem] leading-none tabular-nums [text-shadow:0_0_24px_hsl(var(--hue)_80%_60%/0.5)]"
                data-testid="season"
                >{{ formatSeason(current.season) }}</span
              >
            </figcaption>
          </figure>
        </section>
      </div>

      <fieldset v-if="badgeSeasons.length > 1" class="min-w-0 px-6 pt-5 phone:px-5">
        <!-- Floated, so it lays out like a normal heading instead of sitting on the border. -->
        <legend
          class="float-left mb-3 flex w-full items-baseline gap-2 text-xs font-bold tracking-[0.14em] uppercase"
        >
          {{ t('dialog.history') }}
          <span class="font-semibold tracking-[0.02em] text-ink-muted normal-case">
            {{ t('dialog.seasonCount', badgeSeasons.length) }}
          </span>
        </legend>
        <!-- Newest first; scrolls sideways when a league has decades of badges. -->
        <div class="scroll-rail clear-both -m-1 snap-x snap-proximity gap-2 p-1">
          <label v-for="season in newestFirst" :key="season.season" :class="SEASON">
            <input
              class="absolute inset-0 m-0 cursor-[inherit] opacity-0"
              type="radio"
              name="season"
              :value="season.season"
              :checked="season.season === current?.season"
              @change="chosen = season.season"
            />
            {{ formatSeason(season.season) }}
          </label>
        </div>
      </fieldset>

      <!-- On the sheet, keep the link clear of the home indicator and browser toolbar. -->
      <footer
        class="flex items-center justify-between gap-3 px-6 pt-5 pb-6 text-sm phone:px-5 phone:pb-[calc(--spacing(5)+env(safe-area-inset-bottom))]"
      >
        <span class="font-mono text-xs text-ink-muted">
          {{ t('dialog.leagueId', { id: league.id }) }}
        </span>
        <a
          class="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-bold no-underline transition-colors duration-150 hover:border-accent-ink hover:bg-surface-muted"
          :href="`https://www.thesportsdb.com/league/${league.id}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('dialog.viewOnSource') }}
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3h7v7M13 3L5 11" />
          </svg>
          <span class="sr-only">{{ t('app.opensInNewTab') }}</span>
        </a>
      </footer>
    </div>
  </dialog>
</template>
