// jsdom has no <dialog> methods. A minimal stand-in: open/close plus the close event,
// which is all the app relies on. The real behaviour is covered by the Playwright tests.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// Every mounted component gets the app's i18n instance, as in main.ts.
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
