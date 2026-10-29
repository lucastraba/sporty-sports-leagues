import { beforeEach } from 'vitest'

// Each test starts from a clean URL and storage.
beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
})
