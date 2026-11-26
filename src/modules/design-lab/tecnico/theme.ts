import { useSearchParams } from 'react-router'
import { createStore } from '@/lib/store'

/** The exploration's own theme choice, kept in the browser; it never touches the app's theme. */
export const malhaStore = createStore<{ theme: 'light' | 'dark' }>({ theme: 'light' }, { persist: 'he4rt:design-lab-malha' })

/** The families the exploration uses, loaded only on its routes. */
export const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5..125,400..700&family=JetBrains+Mono:wght@400;500&family=Geist:wght@400..700&family=Geist+Mono:wght@400;500&display=swap'

/** The journey's stages in order, to find the index of a member's stage. */
export const STAGE_ORDER = ['member', 'prepared', 'practicing', 'delivered', 'validated']

/**
 * The lab's search params. Every change (view, tab, filter, month, page of a list) runs inside a
 * view transition, so the screen fades into its new state instead of jumping. See motion.css.
 */
export function useLabParams() {
  const [params, setParams] = useSearchParams()
  const set: typeof setParams = (next, options) => setParams(next, { viewTransition: true, ...options })
  return [params, set] as const
}
