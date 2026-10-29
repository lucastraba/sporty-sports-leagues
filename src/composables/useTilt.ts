import { computed, ref } from 'vue'

// Tilts an element toward the pointer. Mouse or trackpad only, never with reduced motion.
export const useTilt = (maxDegrees = 14) => {
  const x = ref(0)
  const y = ref(0)

  const enabled = () =>
    window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches === true &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches !== true

  const onPointerMove = (event: PointerEvent) => {
    if (!enabled()) return
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    x.value = ((event.clientX - box.left) / box.width - 0.5) * 2
    y.value = ((event.clientY - box.top) / box.height - 0.5) * 2
  }

  const onPointerLeave = () => {
    x.value = 0
    y.value = 0
  }

  // Unitless, so CSS can turn them into degrees for the rotation and pixels for the shadow.
  const style = computed(() => ({
    '--tilt-x': (x.value * maxDegrees).toFixed(2),
    '--tilt-y': (-y.value * maxDegrees).toFixed(2),
  }))

  return { style, onPointerMove, onPointerLeave }
}
