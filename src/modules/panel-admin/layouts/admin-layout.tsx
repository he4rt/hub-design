import { Link, NavLink, Outlet } from 'react-router'
import './admin-layout.css'

export function AdminLayout() {
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
        </nav>
      </aside>
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
