import { onScopeDispose, watch, type Ref } from 'vue'

// Marks the history entry pushed when a `pushed` field (the open league) was set.
const PUSHED_ENTRY = 'urlStatePushed'

const currentUrl = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`

// Mirrors filters and the open league into the query string (?q=epl&sport=Soccer&league=4328),
// so a filtered view or an open badge can be shared or survive a reload.
//
// Filters use replaceState: typing a search shouldn't fill the back button with history.
// Fields named in `pushed` get their own entry instead, so Back, or the back gesture on
// Android, closes the dialog rather than leaving the site.
export const useUrlState = (
  fields: Record<string, Ref<string | null>>,
  { pushed = [] as string[] } = {},
) => {
  const entries = Object.entries(fields)
  const defaults = new Map(entries.map(([name, field]) => [name, field.value]))

  const readUrl = () => {
    const params = new URLSearchParams(window.location.search)
    for (const [name, field] of entries) {
      field.value = params.get(name) || (defaults.get(name) ?? null)
    }
  }

  const urlFor = () => {
    const next = new URLSearchParams(window.location.search)
    for (const [name, field] of entries) {
      const value = field.value?.trim()
      if (value) next.set(name, value)
      else next.delete(name)
    }
    const search = next.toString()
    return `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  }

  readUrl()
  window.addEventListener('popstate', readUrl)
  onScopeDispose(() => window.removeEventListener('popstate', readUrl))

  watch(
    entries.map(([, field]) => field),
    (now, before) => {
      const url = urlFor()
      // Already there: the change came from Back or Forward.
      if (url === currentUrl()) return

      const isPushed = (i: number) => pushed.includes(entries[i]?.[0] ?? '')
      const opened = now.some((value, i) => isPushed(i) && value && !before[i])
      const closed = now.some((value, i) => isPushed(i) && !value && before[i])

      if (opened) {
        window.history.pushState({ ...window.history.state, [PUSHED_ENTRY]: true }, '', url)
      } else if (closed && window.history.state?.[PUSHED_ENTRY]) {
        // Step back over the entry the dialog added instead of leaving it behind, so Back
        // after closing goes where the user expects.
        window.history.back()
      } else {
        window.history.replaceState(window.history.state, '', url)
      }
    },
    { flush: 'post' },
  )
}
