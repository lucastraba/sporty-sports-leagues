<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LeagueMatch } from '@/domain/search'
import { sportHue } from '@/domain/sportColor'
import { useLabels } from '@/composables/useLabels'
import HighlightText from './HighlightText.vue'
import SportIcon from './SportIcon.vue'

const props = defineProps<{ match: LeagueMatch; tokens: string[] }>()
const emit = defineEmits<{ open: [leagueId: string] }>()
const { t } = useI18n()
const { sportName } = useLabels()

const MAX_ALTERNATES = 2
const league = computed(() => props.match.league)
const hue = computed(() => sportHue(league.value.sport))

// Show the alternate name that matched the search first, so the user sees why it matched.
const alternates = computed(() => {
  const all = league.value.alternateNames
  const matched = props.match.matchedAlternate
  const ordered = matched ? [matched, ...all.filter((name) => name !== matched)] : all
  return { shown: ordered.slice(0, MAX_ALTERNATES), hidden: ordered.length - MAX_ALTERNATES }
})

const moreLabel = computed(() =>
  alternates.value.hidden > 0 ? t('card.more', { count: alternates.value.hidden }) : '',
)

// The card lifts on hover. ::before is a strip of the sport's colour along the top edge that
// runs full width on hover; ::after is a soft glow of that colour in the corner.
const CARD = [
  'group relative isolate flex size-full flex-col items-start gap-2 overflow-hidden rounded-lg border border-line bg-surface p-5 text-left shadow-sm',
  'transition-[border-color,box-shadow,translate] duration-250 ease-out motion-reduce:transition-none',
  'hover:border-[hsl(var(--hue)_50%_60%/0.55)] hover:shadow-[var(--elevation-md),0_18px_36px_-18px_hsl(var(--hue)_70%_40%/0.45)] motion-safe:hover:-translate-y-[3px] motion-safe:active:-translate-y-px',
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:origin-left before:scale-x-[0.18] before:bg-linear-to-r before:from-[hsl(var(--hue)_70%_45%)] before:to-[hsl(var(--hue)_80%_60%)] before:transition-transform before:duration-400 before:ease-out group-hover:before:scale-x-100 motion-reduce:before:transition-none',
  'after:absolute after:-right-[30%] after:-bottom-[40%] after:-z-1 after:aspect-square after:w-[80%] after:rounded-full after:bg-[radial-gradient(closest-side,hsl(var(--hue)_70%_50%/0.14),transparent)] after:opacity-60 after:transition-opacity after:duration-300 group-hover:after:opacity-100',
]
</script>

<template>
  <button
    type="button"
    :class="CARD"
    aria-haspopup="dialog"
    :data-league-id="league.id"
    :style="{ '--hue': hue }"
    @click="emit('open', league.id)"
  >
    <!-- The big sport icon in the corner, like a jersey print. -->
    <SportIcon
      class="absolute -right-7 -bottom-7 -z-1 -rotate-18 text-[8.5rem] text-[hsl(var(--hue)_60%_50%)] opacity-7 transition-[rotate,scale,opacity] duration-500 ease-spring group-hover:opacity-13 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-106 motion-reduce:transition-none"
      :sport="league.sport"
    />

    <span class="mb-2 flex items-center gap-3">
      <span
        class="grid size-11 place-items-center rounded-md bg-linear-135 from-[hsl(var(--hue)_70%_46%)] to-[hsl(var(--hue)_75%_30%)] text-[1.5rem] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_14px_-6px_hsl(var(--hue)_70%_30%/0.7)]"
        ><SportIcon :sport="league.sport"
      /></span>
      <span
        class="text-xs font-bold tracking-[0.12em] text-[hsl(var(--hue)_70%_var(--sport-text-lightness))] uppercase"
        >{{ sportName(league.sport) }}</span
      >
    </span>

    <span
      class="text-[1.4rem] leading-[1.1] font-extrabold font-condensed tracking-[-0.005em] text-balance"
      data-testid="league-name"
    >
      <HighlightText :text="league.name" :tokens="tokens" />
    </span>
    <span v-if="alternates.shown.length" class="text-sm leading-[1.45] text-ink-muted">
      <span class="sr-only">{{ t('card.alsoKnownAs') }}</span>
      <template v-for="(name, index) in alternates.shown" :key="name">
        <template v-if="index > 0">, </template>
        <HighlightText :text="name" :tokens="tokens" />
      </template>
      {{ moreLabel }}
    </span>
    <span v-else class="text-sm leading-[1.45] text-ink-muted italic">
      {{ t('card.noAlternates') }}
    </span>

    <span
      class="mt-auto flex items-center justify-between gap-2 self-stretch pt-4 text-sm font-bold text-ink"
      aria-hidden="true"
    >
      {{ t('card.seasonBadges') }}
      <span
        class="grid size-8 place-items-center rounded-full bg-surface-muted text-ink transition-[background-color,color,translate,rotate] duration-300 ease-spring group-hover:bg-[hsl(var(--hue)_70%_32%)] group-hover:text-white motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-rotate-45 motion-reduce:transition-none"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </span>
    </span>
  </button>
</template>
