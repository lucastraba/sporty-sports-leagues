<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { badgeThumbnail } from '@/domain/badges'

const props = defineProps<{ src: string; alt: string }>()
const { t } = useI18n()
const state = ref<'loading' | 'loaded' | 'error'>('loading')

// Reset when switching seasons, so the old image never sits under the new caption.
watch(
  () => props.src,
  () => (state.value = 'loading'),
)
</script>

<template>
  <div
    class="relative mx-auto grid aspect-square w-[min(100%,13rem)] place-items-center"
    :class="{
      'after:absolute after:inset-[18%] after:animate-pulse after:rounded-full after:bg-[radial-gradient(closest-side,rgb(255_255_255/0.12),transparent)] motion-reduce:after:animate-none':
        state === 'loading',
    }"
    :aria-busy="state === 'loading'"
  >
    <img
      v-if="state !== 'error'"
      :key="src"
      class="size-full object-contain drop-shadow-[calc(var(--tilt-x,0)*-0.6px)_18px_18px_rgb(0_0_0/0.55)]"
      :class="state === 'loaded' ? 'animate-flip-in motion-reduce:animate-none' : 'opacity-0'"
      :src="badgeThumbnail(src)"
      :alt="alt"
      width="256"
      height="256"
      decoding="async"
      @load="state = 'loaded'"
      @error="state = 'error'"
    />
    <p v-else class="p-4 text-center text-night-muted">{{ t('dialog.badgeFailed') }}</p>
  </div>
</template>
