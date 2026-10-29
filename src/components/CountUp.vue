<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

// A scoreboard number that counts up to its value. Screen readers get the final value only.
const props = withDefaults(defineProps<{ value: number; digits?: number }>(), { digits: 2 })

const shown = ref(0)
let frame = 0

const animate = (from: number, to: number) => {
  cancelAnimationFrame(frame)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (reduce || from === to) {
    shown.value = to
    return
  }
  const start = performance.now()
  const duration = 900
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    shown.value = Math.round(from + (to - from) * (1 - (1 - t) ** 3))
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (to) => animate(shown.value, to),
  { immediate: true },
)
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <span aria-hidden="true">{{ String(shown).padStart(digits, '0') }}</span>
  <span class="sr-only">{{ value }}</span>
</template>
