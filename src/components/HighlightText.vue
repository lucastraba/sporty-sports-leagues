<script setup lang="ts">
import { computed } from 'vue'
import { highlight } from '@/domain/search'

const props = defineProps<{ text: string; tokens: string[] }>()
const segments = computed(() => highlight(props.text, props.tokens))
</script>

<template>
  <template v-for="(segment, index) in segments" :key="index">
    <mark
      v-if="segment.hit"
      class="rounded-[2px] bg-highlight text-inherit ring-1 ring-highlight"
      >{{ segment.text }}</mark
    >
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
