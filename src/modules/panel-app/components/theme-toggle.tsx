import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { setTheme, useTheme } from '@/lib/theme'
import './theme-toggle.css'

/** Switches between the light and the dark theme. Until the member picks one, the system's applies. */
export function ThemeToggle() {
  const theme = useTheme()
  const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'

  function toggle() {
    const flip = () => setTheme(theme === 'dark' ? 'light' : 'dark')
    // A short cross-fade where the browser has view transitions; those who ask for less motion get none.
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return flip()
    document.startViewTransition(() => flushSync(flip))
  }

  return (
    // Same native icon button as the other controls of the side navigation.
    <button type="button" className="sidebar-nav__icon" aria-label={label} title={label} onClick={toggle}>
      {/* The key remounts the icon, so it turns in on every switch. */}
      {theme === 'dark' ? (
        <Sun key="sun" className="theme-toggle__icon" size={18} aria-hidden />
      ) : (
        <Moon key="moon" className="theme-toggle__icon" size={18} aria-hidden />
      )}
    </button>
  )
}
