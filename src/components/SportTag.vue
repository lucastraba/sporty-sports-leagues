<script setup lang="ts">
import { computed } from 'vue'
import { sportHue } from '@/domain/sportColor'
import { useLabels } from '@/composables/useLabels'
import SportIcon from './SportIcon.vue'

// `night` is for the always-dark surfaces (the dialog's header).
const props = withDefaults(defineProps<{ sport: string; night?: boolean }>(), { night: false })
const { sportName } = useLabels()
const hue = computed(() => sportHue(props.sport))
</script>

<!-- The hue is computed per sport at runtime, so it is passed in as a custom property;
     every declaration that uses it is a utility class. -->
<template>
  <span
    class="inline-flex items-center gap-[0.4em] rounded-full py-[0.25em] pr-[0.7em] pl-[0.55em] text-xs font-bold tracking-[0.06em] whitespace-nowrap uppercase"
    :class="
      night
        ? 'bg-[hsl(var(--hue)_70%_50%/0.18)] text-[hsl(var(--hue)_80%_78%)] shadow-[inset_0_0_0_1px_hsl(var(--hue)_70%_70%/0.25)]'
        : 'bg-[hsl(var(--hue)_70%_var(--sport-soft-lightness)/var(--sport-soft-alpha))] text-[hsl(var(--hue)_70%_var(--sport-text-lightness))]'
    "
    :style="{ '--hue': hue }"
  >
    <SportIcon class="text-[1.15em]" :sport="sport" />
    {{ sportName(sport) }}
  </span>
</template>
