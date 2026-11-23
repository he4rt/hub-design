import { useSyncExternalStore } from 'react'
import { createStore, useStore } from '@/lib/store'

export type Theme = 'light' | 'dark'

/** The member's choice, kept in the browser. `null` follows the system setting. */
const themeStore = createStore<{ theme: Theme | null }>({ theme: null }, { persist: 'he4rt:theme' })

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function apply() {
  const { theme } = themeStore.get()
  if (theme) document.documentElement.dataset.theme = theme
  else delete document.documentElement.dataset.theme
}

/** Puts the saved choice on <html>, where the tokens read it, and keeps it there. Call once before rendering. */
export function startTheme() {
  apply()
  themeStore.subscribe(apply)
}

export function setTheme(theme: Theme) {
  themeStore.set(() => ({ theme }))
}

/** The theme on screen: the member's choice, or the system's while they have not chosen. */
export function useTheme(): Theme {
  const chosen = useStore(themeStore, (s) => s.theme)
  const systemDark = useSyncExternalStore(
    (onChange) => {
      darkQuery.addEventListener('change', onChange)
      return () => darkQuery.removeEventListener('change', onChange)
    },
    () => darkQuery.matches,
  )
  return chosen ?? (systemDark ? 'dark' : 'light')
}
