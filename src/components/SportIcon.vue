<script setup lang="ts">
import { computed } from 'vue'

// Line icons on a 24px grid. Sports without their own icon get the trophy, so a new sport
// from the API still looks deliberate. Always decorative: the sport's name is next to it.
const props = defineProps<{ sport: string }>()

const OVAL_BALL = 'oval'
const ICONS: Record<string, string> = {
  Soccer: 'soccer',
  Basketball: 'basketball',
  Motorsport: 'motorsport',
  'American Football': OVAL_BALL,
  Rugby: OVAL_BALL,
  'Australian Football': OVAL_BALL,
  'Ice Hockey': 'hockey',
  Tennis: 'tennis',
}

const icon = computed(() => (props.sport === '' ? 'all' : (ICONS[props.sport] ?? 'trophy')))
</script>

<template>
  <svg
    class="size-[1em] flex-none"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="icon === 'soccer'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4.76 3.45-1.76 5.55H9l-1.76-5.55z" />
      <path d="M12 7V3m3 13 2.5 3m-.74-8.55 3.74-1.45M9.06 16.05 6.5 19m.74-8.55L3.5 9" />
    </template>
    <template v-else-if="icon === 'basketball'">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.65 5.65l12.7 12.7M5.65 18.35l12.7-12.7M12 3a9 9 0 0 0 9 9M3 12a9 9 0 0 1 9 9" />
    </template>
    <template v-else-if="icon === 'motorsport'">
      <path d="M5 21V4h14v10H5" />
      <g fill="currentColor" stroke="none">
        <rect x="5" y="4" width="3.5" height="3.33" />
        <rect x="12" y="4" width="3.5" height="3.33" />
        <rect x="8.5" y="7.33" width="3.5" height="3.33" />
        <rect x="15.5" y="7.33" width="3.5" height="3.33" />
        <rect x="5" y="10.67" width="3.5" height="3.33" />
        <rect x="12" y="10.67" width="3.5" height="3.33" />
      </g>
    </template>
    <template v-else-if="icon === 'oval'">
      <path d="M15 9l-6 6M10 12l2 2M12 10l2 2M8 21a5 5 0 0 0-5-5M16 3a5 5 0 0 0 5 5" />
      <path d="M16 3C8.82 3 3 8.82 3 16a5 5 0 0 0 5 5c7.18 0 13-5.82 13-13a5 5 0 0 0-5-5z" />
    </template>
    <template v-else-if="icon === 'hockey'">
      <path d="M6 3l6 13.5h6.5a1.5 1.5 0 0 1 0 3h-7.6a2 2 0 0 1-1.83-1.2L3 4.2" />
      <ellipse cx="18.5" cy="9" rx="2.5" ry="1.25" />
    </template>
    <template v-else-if="icon === 'tennis'">
      <circle cx="12" cy="12" r="9" />
      <path d="M6 5.3a9 9 0 0 1 0 13.4M18 5.3a9 9 0 0 0 0 13.4" />
    </template>
    <template v-else-if="icon === 'all'">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </template>
    <template v-else>
      <path d="M8 21h8M12 17v4M7 4h10M17 4v8a5 5 0 0 1-10 0V4" />
      <circle cx="5" cy="9" r="2" />
      <circle cx="19" cy="9" r="2" />
    </template>
  </svg>
</template>
