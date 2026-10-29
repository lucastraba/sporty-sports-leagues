// Every mounted component gets the app's i18n instance.
import { beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import { i18n } from '@/i18n'
config.global.plugins = [i18n]

// Each test starts from a clean URL and storage, in English.
beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  i18n.global.locale.value = 'en'
})
