<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALE_NAMES, setLocale, SUPPORTED_LOCALES, type Locale } from '@/i18n'

const { t, locale } = useI18n()

const onChange = (event: Event) => setLocale((event.target as HTMLSelectElement).value as Locale)
</script>

<!-- Sits in the hero's dark bar; `custom-select` and `night-select` in main.css draw it. -->
<template>
  <div class="relative flex items-center">
    <label for="locale-select" class="sr-only">{{ t('app.language') }}</label>
    <select
      id="locale-select"
      class="custom-select night-select min-h-10 cursor-pointer rounded-full border border-night-line bg-white/8 pr-8 pl-3.5 text-sm font-semibold text-night-ink transition-colors duration-150 hover:border-white/20 hover:bg-white/14 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :value="locale"
      @change="onChange"
    >
      <option v-for="code in SUPPORTED_LOCALES" :key="code" :value="code" :lang="code">
        {{ LOCALE_NAMES[code] }}
      </option>
    </select>
    <svg
      class="pointer-events-none absolute right-3 size-3 text-night-muted"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  </div>
</template>
