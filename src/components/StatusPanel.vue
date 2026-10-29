<script setup lang="ts">
import { computed } from 'vue'

// Empty, error and "no badge" states.
const props = withDefaults(
  defineProps<{
    title: string
    message?: string
    action?: string
    tone?: 'neutral' | 'error'
    illustration?: 'red-card' | 'goal' | 'crest'
    compact?: boolean
    /** On the dialog's always-dark stage. */
    night?: boolean
  }>(),
  {
    tone: 'neutral',
    compact: false,
    night: false,
    message: undefined,
    action: undefined,
    illustration: undefined,
  },
)
const emit = defineEmits<{ action: [] }>()

const SURFACES = {
  day: {
    neutral: 'border-dashed border-line-strong bg-surface',
    error: 'border-solid border-danger-line bg-danger-soft',
  },
  night: {
    neutral: 'border-dashed border-night-line bg-white/3 text-night-ink',
    error: 'border-solid border-[rgb(255_107_131/0.35)] bg-[rgb(228_0_43/0.08)] text-night-ink',
  },
}

const surface = computed(() => SURFACES[props.night ? 'night' : 'day'][props.tone])
</script>

<template>
  <div
    class="grid justify-items-center gap-2 rounded-lg border text-center"
    :class="[surface, compact ? 'px-3 py-6' : 'px-4 py-12']"
    :role="tone === 'error' ? 'alert' : undefined"
  >
    <svg
      v-if="illustration"
      class="mb-2 animate-art-in motion-reduce:animate-none"
      :class="compact ? 'size-15' : 'size-18'"
      viewBox="0 0 64 64"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="illustration === 'red-card'">
        <rect
          x="14"
          y="10"
          width="28"
          height="40"
          rx="4"
          class="origin-[28px_30px] -rotate-6"
          :class="night ? 'fill-white/12' : 'fill-line'"
        />
        <g transform="rotate(14 32 30)">
          <rect x="20" y="8" width="28" height="40" rx="4" class="fill-brand" />
          <path d="M25 13h8" class="stroke-white/55 stroke-[2.5]" />
        </g>
      </template>
      <template v-else-if="illustration === 'goal'">
        <path d="M6 50h52" class="stroke-line-strong stroke-2" />
        <path
          d="M14 22v28M22 22v28M30 22v28M38 22v28M46 22v28M10 30h44M10 38h44M10 46h44"
          class="stroke-ink-muted stroke-[1.25] opacity-45"
        />
        <path
          d="M8 50V18h48v32"
          class="stroke-[3.5]"
          :class="night ? 'stroke-night-ink' : 'stroke-ink'"
        />
      </template>
      <template v-else>
        <path
          d="M32 6l20 7v15c0 13-8.5 23-20 28C20.5 51 12 41 12 28V13z"
          class="stroke-current stroke-[2.5] opacity-60 [stroke-dasharray:5_4]"
        />
        <path
          d="M27.5 24a4.5 4.5 0 1 1 6.3 4.1c-1.1.5-1.8 1.5-1.8 2.7V32M32 37.5v.5"
          class="stroke-current stroke-[2.5] opacity-80"
        />
      </template>
    </svg>
    <p class="text-xl leading-[1.15] font-extrabold font-condensed">{{ title }}</p>
    <p v-if="message" class="max-w-[40ch]" :class="night ? 'text-night-muted' : 'text-ink-muted'">
      {{ message }}
    </p>
    <button
      v-if="action"
      type="button"
      class="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-fill px-5 font-bold text-on-accent shadow-[0_6px_18px_-6px_var(--color-accent-glow)] transition-[translate,filter] duration-150 ease-out hover:brightness-108 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-reduce:transition-none"
      @click="emit('action')"
    >
      {{ action }}
    </button>
  </div>
</template>
