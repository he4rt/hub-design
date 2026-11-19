import { useTransition } from 'react'
import {
  BadgeCheck,
  House,
  ListChecks,
  LogOut,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { createStore, useStore } from '@/lib/store'
import { useDb } from '@/mocks/db'
import { isActiveValidator } from '@/mocks/validation'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { logout, needsOnboarding } from '@/modules/panel-app/features/auth/actions'
import './app-layout.css'

/** Whether the side navigation is collapsed to icons. A browser preference, kept across reloads. */
const sidebar = createStore({ collapsed: false }, { persist: 'he4rt:app-sidebar' })

/**
 * Signed-in area of /app. Without a session it sends to the login page and
 * comes back afterwards; an account without the dev profile goes to finish the sign-up.
 */
export function AppLayout() {
  const account = useAccount()
  const validator = useDb((s) => isActiveValidator(s, s.session?.userId))
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [loggingOut, startLogout] = useTransition()
  const collapsed = useStore(sidebar, (s) => s.collapsed)
  // Routes with `handle: { wide: true }` (the home) get the whole width for their columns.
  const wide = useMatches().some((match) => (match.handle as { wide?: boolean } | undefined)?.wide)

  if (!account) return <Navigate to={`/app/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  if (needsOnboarding(account)) return <Navigate to="/app/onboarding" replace />

  return (
    <div className="app-layout" data-collapsed={collapsed || undefined}>
      <aside className="app-layout__sidebar" aria-label="Navegação">
        <div className="app-layout__top">
          <Link to="/app" className="app-layout__brand" title="He4rt Hub">
            {collapsed ? 'H4' : 'He4rt Hub'}
          </Link>
          <button
            type="button"
            className="app-layout__icon app-layout__collapse"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={() => sidebar.set((s) => ({ collapsed: !s.collapsed }))}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>
        <nav className="app-layout__nav">
          <NavLink to="/app" end title="Início">
            <House size={18} aria-hidden />
            <span>Início</span>
          </NavLink>
          <NavLink to="/app/discussions" title="Fórum">
            <MessagesSquare size={18} aria-hidden />
            <span>Fórum</span>
          </NavLink>
          <NavLink to="/app/squads" title="Squads">
            <UsersRound size={18} aria-hidden />
            <span>Squads</span>
          </NavLink>
          <NavLink to="/app/validation" end title="Validações">
            <BadgeCheck size={18} aria-hidden />
            <span>Validações</span>
          </NavLink>
          {validator && (
            <NavLink to="/app/validation/queue" title="Fila">
              <ListChecks size={18} aria-hidden />
              <span>Fila</span>
            </NavLink>
          )}
          <NavLink to={`/members/${account.username}`} title="Meu perfil">
            <UserRound size={18} aria-hidden />
            <span>Meu perfil</span>
          </NavLink>
        </nav>
        <div className="app-layout__account">
          <span className="app-layout__user" title={account.name}>
            {account.name}
          </span>
          <NavLink
            to="/app/settings/profile"
            className="app-layout__icon"
            aria-label="Configurações"
            title="Configurações"
          >
            <Settings size={18} aria-hidden />
          </NavLink>
          <Button
            variant="ghost"
            size="sm"
            className="app-layout__logout"
            loading={loggingOut}
            aria-label="Sair"
            title="Sair"
            onClick={() =>
              startLogout(async () => {
                await logout()
                navigate('/app/login')
              })
            }
          >
            <LogOut size={16} aria-hidden />
            <span>Sair</span>
          </Button>
        </div>
      </aside>
      <main className="app-layout__content" data-wide={wide || undefined}>
        <Outlet />
      </main>
    </div>
  )
}
