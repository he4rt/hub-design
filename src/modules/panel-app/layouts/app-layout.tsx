import { useTransition } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { logout } from '@/modules/panel-app/features/auth/actions'
import './app-layout.css'

/** Signed-in area of /app; redirects to the login page without a session. */
export function AppLayout() {
  const account = useAccount()
  const navigate = useNavigate()
  const [loggingOut, startLogout] = useTransition()

  if (!account) return <Navigate to="/app/login" replace />

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <Link to="/app" className="app-layout__brand">
          He4rt Hub
        </Link>
        <nav className="app-layout__nav">
          <NavLink to="/app" end>
            Dashboard
          </NavLink>
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
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
