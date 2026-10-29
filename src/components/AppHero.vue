<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLeaguesStore } from '@/stores/leagues'
import CountUp from './CountUp.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'
import SportIcon from './SportIcon.vue'

const { t } = useI18n()
const store = useLeaguesStore()
const ready = computed(() => store.status === 'ready')

const stats = computed(() => [
  { label: t('hero.leagues'), value: store.leagues.length },
  { label: t('hero.sports'), value: store.sports.length },
])
</script>

<template>
  <header
    class="relative isolate overflow-hidden bg-[radial-gradient(40rem_22rem_at_8%_0%,rgb(228_0_43/0.22),transparent_70%),radial-gradient(60rem_30rem_at_85%_110%,rgb(22_163_74/0.18),transparent_70%),linear-gradient(180deg,#0a0d12_0%,var(--color-night)_100%)] pb-16 text-night-ink max-sm:pb-12"
  >
    <!-- A floodlit pitch at night, tilted into perspective. Pure decoration. -->
    <div class="pointer-events-none absolute inset-0 -z-1" aria-hidden="true">
      <div
        class="pitch-tilt absolute top-2 -right-56 aspect-[1050/680] w-[min(62rem,120vw)] opacity-95 max-sm:top-12 max-sm:-right-104 max-sm:w-208 max-sm:opacity-60"
      >
        <svg class="size-full overflow-visible" viewBox="0 0 1050 680" preserveAspectRatio="none">
          <defs>
            <pattern id="pitch-mow" width="150" height="680" patternUnits="userSpaceOnUse">
              <rect width="75" height="680" class="fill-[#0e3420]" />
            </pattern>
          </defs>
          <rect width="1050" height="680" class="fill-[#0b2a18]" />
          <rect width="1050" height="680" fill="url(#pitch-mow)" />
          <!-- The lines draw themselves in once: each path is one unit long, dashed to match. -->
          <g
            class="animate-draw-lines fill-none stroke-white/60 stroke-[3.5] [stroke-dasharray:1] [stroke-dashoffset:0] motion-reduce:animate-none"
          >
            <rect x="25" y="25" width="1000" height="630" pathLength="1" />
            <path d="M525 25V655" pathLength="1" />
            <circle cx="525" cy="340" r="91.5" pathLength="1" />
            <rect x="25" y="138.4" width="165" height="403.2" pathLength="1" />
            <rect x="860" y="138.4" width="165" height="403.2" pathLength="1" />
            <rect x="25" y="248.4" width="55" height="183.2" pathLength="1" />
            <rect x="970" y="248.4" width="55" height="183.2" pathLength="1" />
            <path d="M190 266.9a91.5 91.5 0 0 1 0 146.2" pathLength="1" />
            <path d="M860 266.9a91.5 91.5 0 0 0 0 146.2" pathLength="1" />
          </g>
          <g class="animate-fade-in-late fill-white/70 motion-reduce:animate-none">
            <circle cx="525" cy="340" r="5" />
            <circle cx="135" cy="340" r="4" />
            <circle cx="915" cy="340" r="4" />
          </g>
        </svg>
      </div>
      <!-- Two floodlight pools, and a vignette that blends the pitch into the night behind
           the copy. -->
      <div
        class="absolute inset-0 animate-lights-on bg-[radial-gradient(28rem_18rem_at_72%_34%,rgb(255_255_240/0.14),transparent_70%),radial-gradient(22rem_14rem_at_96%_70%,rgb(255_255_240/0.08),transparent_70%)] motion-reduce:animate-none"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(90deg,var(--color-night)_0%,rgb(7_9_13/0.85)_34%,transparent_62%),linear-gradient(0deg,var(--color-night)_0%,transparent_30%)]"
      />
    </div>

    <div class="page-width flex items-center justify-between gap-4 py-5 max-sm:py-3">
      <span
        class="inline-flex items-center gap-2 font-extrabold font-condensed tracking-[0.02em] uppercase"
      >
        <span
          class="grid size-8 place-items-center rounded-[9px] bg-accent text-[1.25rem] text-white shadow-[0_6px_20px_-4px_rgb(228_0_43/0.6)]"
          ><SportIcon sport="Soccer"
        /></span>
        {{ t('app.brand') }}
      </span>
      <div class="flex items-center gap-4">
        <LocaleSwitcher />
        <!-- The footer credits the source too, so phones keep the bar to brand and language. -->
        <a
          class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-night-muted no-underline hover:text-night-ink max-sm:hidden"
          href="https://www.thesportsdb.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('hero.dataBy') }}<span class="sr-only">{{ t('app.opensInNewTab') }}</span>
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
        </a>
      </div>
    </div>

    <div
      class="page-width grid gap-8 pt-6 max-sm:gap-5 max-sm:pt-2 min-[56rem]:grid-cols-[1fr_auto] min-[56rem]:items-end"
    >
      <div>
        <p
          class="mb-4 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-night-accent uppercase max-sm:hidden"
        >
          <span class="size-2 rounded-full bg-accent shadow-[0_0_0_4px_rgb(228_0_43/0.25)]" />{{
            t('hero.eyebrow')
          }}
        </p>
        <h1
          class="text-3xl leading-[0.9] font-extrabold font-condensed tracking-[-0.015em] uppercase"
        >
          <span class="block animate-rise motion-reduce:animate-none">{{
            t('hero.titleStart')
          }}</span>
          <!-- The lines are blocks, so the space between the words has to be written out. -->
          {{ ' ' }}
          <!-- An italic-style slant without loading an italic font file. -->
          <span
            class="block origin-bottom-left -skew-x-8 animate-rise-skewed bg-linear-[100deg] from-[#ff2e55] to-[#ff6a3d] bg-clip-text text-transparent motion-reduce:animate-none"
            >{{ t('hero.titleEnd') }}</span
          >
        </h1>
        <!-- Phones skip the eyebrow, the lede and the scoreboard, so the first leagues fit on
             the first screen. The search placeholder says what the lede does. -->
        <p
          class="mt-5 max-w-[34rem] animate-rise-late text-lg leading-[1.55] text-night-muted motion-reduce:animate-none max-sm:hidden"
        >
          {{ t('hero.lede') }}
        </p>
      </div>

      <!-- Wide screens: the scoreboard sits over the pitch, like a broadcast overlay. -->
      <div class="min-[56rem]:grid min-[56rem]:justify-items-end min-[56rem]:text-right">
        <dl
          class="inline-flex animate-rise-later rounded-lg border border-night-line bg-white/4 backdrop-blur-[8px] motion-reduce:animate-none max-sm:hidden"
        >
          <div
            v-for="(stat, index) in stats"
            :key="index"
            class="grid gap-1 px-6 py-3 max-sm:px-5 max-sm:py-2"
            :class="{ 'border-l border-night-line': index > 0 }"
          >
            <dt class="text-xs font-bold tracking-[0.14em] text-night-muted uppercase">
              {{ stat.label }}
            </dt>
            <dd
              class="type-display text-[2.5rem] leading-none tabular-nums [text-shadow:0_0_24px_rgb(255_255_255/0.25)] max-sm:text-[2rem]"
            >
              <CountUp v-if="ready" :value="stat.value" />
              <template v-else>
                <span aria-hidden="true">––</span
                ><span class="sr-only">{{ t('hero.loading') }}</span>
              </template>
            </dd>
          </div>
        </dl>

        <!-- The text shadow keeps it legible over the pitch lines. -->
        <p
          v-if="store.isFreeTier && ready"
          class="mt-3 max-w-[22rem] text-sm text-night-muted [text-shadow:0_1px_6px_var(--color-night)] max-sm:mt-0 max-sm:text-xs"
        >
          {{ t('hero.freeTier', { count: store.leagues.length }) }}
        </p>
      </div>
    </div>
  </header>
</template>
