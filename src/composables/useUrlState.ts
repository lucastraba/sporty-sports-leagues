import { watch, type Ref } from 'vue'

// Mirrors filters and the open league into the query string (?q=epl&sport=Soccer&league=4328),
// so a filtered view or an open badge can be shared or survive a reload.
// replaceState, not pushState: typing a search shouldn't fill the back button with history.
export const useUrlState = (fields: Record<string, Ref<string | null>>) => {
  const params = new URLSearchParams(window.location.search)
  for (const [name, field] of Object.entries(fields)) {
    const value = params.get(name)
    if (value) field.value = value
  }

  watch(
    Object.values(fields),
    () => {
      const next = new URLSearchParams(window.location.search)
      for (const [name, field] of Object.entries(fields)) {
        const value = field.value?.trim()
        if (value) next.set(name, value)
        else next.delete(name)
      }
      const search = next.toString()
      const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
      window.history.replaceState(window.history.state, '', url)
    },
    { flush: 'post' },
  )
}
