import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { detectLocale, setLocale, i18n } from '@/i18n'

describe('detectLocale', () => {
  it('uses the first supported browser language, ignoring the region', () => {
    expect(detectLocale(['fr-FR', 'es-AR', 'en'])).toBe('es')
    expect(detectLocale(['en-GB', 'es'])).toBe('en')
  })

  it('falls back to English', () => {
    expect(detectLocale(['de-DE', 'ja'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })

  it('prefers a saved choice over the browser, and ignores an unknown one', () => {
    localStorage.setItem('locale', 'es')
    expect(detectLocale(['en-US'])).toBe('es')
    localStorage.setItem('locale', 'xx')
    expect(detectLocale(['en-US'])).toBe('en')
  })
})

describe('setLocale', () => {
  it('switches the active locale, saves it and updates the document', async () => {
    setLocale('es')
    expect(i18n.global.locale.value).toBe('es')
    expect(localStorage.getItem('locale')).toBe('es')
    await nextTick()
    expect(document.documentElement.lang).toBe('es')
  })
})
