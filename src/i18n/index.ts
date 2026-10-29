import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import es from './locales/es'

export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

// Each language written in itself, so anyone can find theirs whatever the current locale.
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' }

const STORAGE_KEY = 'locale'

const isLocale = (value: unknown): value is Locale => SUPPORTED_LOCALES.includes(value as Locale)

const readStoredLocale = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// A saved choice wins, then the browser's languages in order ("es-AR" counts as "es"),
// then English.
export const detectLocale = (
  languages: readonly string[] = navigator.languages ?? [navigator.language],
): Locale => {
  const stored = readStoredLocale()
  if (isLocale(stored)) return stored
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, es },
})

// Only an explicit choice is saved, so a user who never picks one keeps following the browser.
export const setLocale = (locale: Locale) => {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private mode: the choice lasts for this page load only.
  }
}

// <html lang> drives screen reader pronunciation and hyphenation; the title shows in the tab.
watch(
  i18n.global.locale,
  (locale) => {
    document.documentElement.lang = locale
    document.title = i18n.global.t('app.documentTitle')
  },
  { immediate: true },
)
