import { useTransition } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { logout } from '@/modules/panel-app/features/auth/actions'
import './app-layout.css'

/**
 * Signed-in area of /app. Without a session it sends to the login page and
 * comes back afterwards; an account without the dev profile goes to finish the sign-up.
 */
export function AppLayout() {
  const account = useAccount()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [loggingOut, startLogout] = useTransition()
  // Routes with `handle: { wide: true }` (the home) get the whole width for their columns.
  const wide = useMatches().some((match) => (match.handle as { wide?: boolean } | undefined)?.wide)

  if (!account) return <Navigate to={`/app/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  if (!account.onboardedAt) return <Navigate to="/app/onboarding" replace />

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <Link to="/app" className="app-layout__brand">
          He4rt Hub
        </Link>
        <nav className="app-layout__nav">
          <NavLink to="/app" end>
            Início
          </NavLink>
          <NavLink to="/app/discussions">Fórum</NavLink>
          <NavLink to="/app/settings/profile">Configurações</NavLink>
        </nav>
        <span className="app-layout__user" title={account.name}>
          {account.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          loading={loggingOut}
          onClick={() =>
            startLogout(async () => {
              await logout()
              navigate('/app/login')
            })
          }
        >
          Sair
        </Button>
      </header>
      <main className="app-layout__content" data-wide={wide || undefined}>
        <Outlet />
      </main>
    </div>
  )
}
