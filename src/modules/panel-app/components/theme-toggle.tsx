import { Moon, Sun } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'

/** Switches between the light and the dark theme. Until the member picks one, the system's applies. */
export function ThemeToggle() {
  const theme = useTheme()
  const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'

  return (
    // Same native icon button as the other controls of the side navigation.
    <button
      type="button"
      className="sidebar-nav__icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
