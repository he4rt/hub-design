import { useTransition } from 'react'
import {
  BadgeCheck,
  GitPullRequest,
  House,
  ListChecks,
  LogOut,
  MessageSquareWarning,
  ScanSearch,
  ShieldAlert,
  Settings2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BrandMark } from '@/components/brand-mark'
import { SidebarFooter, SidebarGroup, SidebarGroups, SidebarNav, SidebarTop } from '@/components/sidebar-nav'
import { Avatar } from '@/components/ui/avatar'
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
      <SidebarNav aria-label="Navegação da administração">
        <SidebarTop>
          <BrandMark to="/admin" tone="ink" tagline="Administração" />
        </SidebarTop>
        <SidebarGroups>
          <SidebarGroup>
            <NavLink to="/admin" end className="sidebar-nav__item">
              <House size={18} aria-hidden />
              <span>Visão geral</span>
            </NavLink>
            <NavLink to="/admin/users" className="sidebar-nav__item">
              <UserRound size={18} aria-hidden />
              <span>Usuários</span>
            </NavLink>
          </SidebarGroup>
          <SidebarGroup label="Squads">
            <NavLink to="/admin/squads" end className="sidebar-nav__item">
              <UsersRound size={18} aria-hidden />
              <span>Squads</span>
            </NavLink>
            <NavLink to="/admin/squads/entry-tests" className="sidebar-nav__item">
              <GitPullRequest size={18} aria-hidden />
              <span>Testes de entrada</span>
            </NavLink>
          </SidebarGroup>
          <SidebarGroup label="Validação">
            <NavLink to="/admin/validation/validators" className="sidebar-nav__item">
              <BadgeCheck size={18} aria-hidden />
              <span>Validadores</span>
            </NavLink>
            <NavLink to="/admin/validation/queue" className="sidebar-nav__item">
              <ListChecks size={18} aria-hidden />
              <span>Fila de validação</span>
            </NavLink>
            <NavLink to="/admin/validation/reviews" className="sidebar-nav__item">
              <ScanSearch size={18} aria-hidden />
              <span>Revisões</span>
            </NavLink>
            <NavLink to="/admin/validation/contestations" className="sidebar-nav__item">
              <MessageSquareWarning size={18} aria-hidden />
              <span>Contestações</span>
            </NavLink>
          </SidebarGroup>
          <SidebarGroup label="Comunidade">
            <NavLink to="/admin/community/moderation" className="sidebar-nav__item">
              <ShieldAlert size={18} aria-hidden />
              <span>Moderação</span>
            </NavLink>
          </SidebarGroup>
          <SidebarGroup label="Sistema">
            <NavLink to="/admin/system/github" className="sidebar-nav__item">
              <Settings2 size={18} aria-hidden />
              <span>Integração GitHub</span>
            </NavLink>
          </SidebarGroup>
        </SidebarGroups>
        <SidebarFooter>
          <Avatar src={admin.photoUrl} name={admin.name} size="md" tone="ink" />
          <span className="admin-layout__who sidebar-nav__hide-mobile" title={admin.email}>
            {admin.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={loggingOut}
            aria-label="Sair"
            onClick={() =>
              startLogout(async () => {
                await logout()
                navigate('/admin/login')
              })
            }
          >
            <LogOut size={16} aria-hidden />
            <span>Sair</span>
          </Button>
        </SidebarFooter>
      </SidebarNav>
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
