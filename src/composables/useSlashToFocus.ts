import { onBeforeUnmount, onMounted, type Ref } from 'vue'

// "/" focuses the search box, as on GitHub or YouTube. Ignored while typing elsewhere.
export const useSlashToFocus = (target: Ref<HTMLInputElement | null>) => {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    const active = document.activeElement
    const typing =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    if (typing || document.querySelector('dialog[open]')) return
    event.preventDefault()
    target.value?.focus()
    target.value?.select()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
