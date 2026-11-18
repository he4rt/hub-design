import { useTransition } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { logout } from '@/modules/panel-admin/features/auth/actions'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import './admin-layout.css'

/** Signed-in area of /admin; without an admin session it sends to the admin login. */
export function AdminLayout() {
  const admin = useAdmin()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [loggingOut, startLogout] = useTransition()

  if (!admin) return <Navigate to={`/admin/login?redirect=${encodeURIComponent(pathname + search)}`} replace />

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <Link to="/admin" className="admin-layout__brand">
          He4rt <span>Admin</span>
        </Link>
        <nav className="admin-layout__nav">
          <NavLink to="/admin" end>
            Visão geral
          </NavLink>
          <NavLink to="/admin/users">Usuários</NavLink>
          <NavLink to="/admin/squads" end>
            Squads
          </NavLink>
          <NavLink to="/admin/squads/entry-tests">Testes de entrada</NavLink>
          <NavLink to="/admin/system/github">Integração GitHub</NavLink>
        </nav>
        <div className="admin-layout__account">
          <span className="admin-layout__user" title={admin.email}>
            {admin.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={loggingOut}
            onClick={() =>
              startLogout(async () => {
                await logout()
                navigate('/admin/login')
              })
            }
          >
            Sair
          </Button>
        </div>
      </aside>
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
