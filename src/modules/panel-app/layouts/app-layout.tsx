import { useTransition } from 'react'
import {
  BadgeCheck,
  Flag,
  GitCommitVertical,
  House,
  Inbox,
  ListChecks,
  LogOut,
  MessagesSquare,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BrandMark } from '@/components/brand-mark'
import { SidebarFooter, SidebarGroup, SidebarGroups, SidebarNav, SidebarTop } from '@/components/sidebar-nav'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createStore, useStore } from '@/lib/store'
import { useDb } from '@/mocks/db'
import { activeSquadIds, githubHandle } from '@/mocks/squads'
import { isActiveValidator } from '@/mocks/validation'
import { ThemeToggle } from '@/modules/panel-app/components/theme-toggle'
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
  const state = useDb((s) => s)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [loggingOut, startLogout] = useTransition()
  const collapsed = useStore(sidebar, (s) => s.collapsed)

  const userId = account?.id ?? ''
  const activeIds = activeSquadIds(state, userId)
  const mySquad = state.squads.find((squad) => activeIds.includes(squad.id))
  const captainOf = state.squads.filter((squad) => squad.captainId === userId && squad.status === 'active')
  const github = githubHandle(account)
  const squadProjects = (squadId: string) => state.projects.filter((p) => p.squadId === squadId).map((p) => p.id)
  const pendingApplications = (squadId: string) =>
    state.applications.filter((a) => a.status === 'pending' && squadProjects(squadId).includes(a.projectId)).length
  const pendingDeliveries = (squadId: string) =>
    state.deliveries.filter((d) => d.status === 'pending' && squadProjects(squadId).includes(d.projectId)).length

  if (!account) return <Navigate to={`/app/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  if (needsOnboarding(account)) return <Navigate to="/app/onboarding" replace />

  return (
    <div className="app-layout" data-collapsed={collapsed || undefined}>
      <SidebarNav collapsed={collapsed} aria-label="Navegação">
        <SidebarTop>
          <BrandMark to="/app" tone="ink" tagline="da comunidade para a comunidade" />
          <button
            type="button"
            className="sidebar-nav__icon sidebar-nav__hide-mobile"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={() => sidebar.set((s) => ({ collapsed: !s.collapsed }))}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </SidebarTop>
        <SidebarGroups>
          <SidebarGroup label="Trajetória">
            <NavLink to="/app" end title="Início" className="sidebar-nav__item">
              <House size={18} aria-hidden />
              <span>Início</span>
            </NavLink>
            <NavLink to={`/members/${account.username}`} end title="Meu perfil" className="sidebar-nav__item">
              <UserRound size={18} aria-hidden />
              <span>Meu perfil</span>
            </NavLink>
            <NavLink to={`/members/${account.username}?aba=trajetoria`} title="Trajetória" className="sidebar-nav__item">
              <GitCommitVertical size={18} aria-hidden />
              <span>Trajetória</span>
            </NavLink>
            <NavLink to="/app/discussions" title="Fórum" className="sidebar-nav__item">
              <MessagesSquare size={18} aria-hidden />
              <span>Fórum</span>
            </NavLink>
          </SidebarGroup>
          <SidebarGroup label="Desenvolvimento">
            <NavLink to="/app/squads" end title="Squads" className="sidebar-nav__item">
              <UsersRound size={18} aria-hidden />
              <span>Squads</span>
            </NavLink>
            {mySquad && (
              <NavLink to={`/app/squads/${mySquad.slug}`} end title="Meu squad" className="sidebar-nav__item">
                <Flag size={18} aria-hidden />
                <span>Meu squad</span>
              </NavLink>
            )}
            <NavLink to="/app/validation" end title="Minhas validações" className="sidebar-nav__item">
              <BadgeCheck size={18} aria-hidden />
              <span>Minhas validações</span>
            </NavLink>
          </SidebarGroup>
          {captainOf.map((squad) => (
            <SidebarGroup key={squad.id} label={`Capitão de ${squad.name}`}>
              <NavLink to={`/app/squads/${squad.slug}/applications`} title="Candidaturas" className="sidebar-nav__item">
                <Inbox size={18} aria-hidden />
                <span>Candidaturas</span>
                {pendingApplications(squad.id) > 0 && <Badge variant="count">{pendingApplications(squad.id)}</Badge>}
              </NavLink>
              <NavLink to={`/app/squads/${squad.slug}/deliveries`} title="Entregas" className="sidebar-nav__item">
                <PackageCheck size={18} aria-hidden />
                <span>Entregas</span>
                {pendingDeliveries(squad.id) > 0 && <Badge variant="count">{pendingDeliveries(squad.id)}</Badge>}
              </NavLink>
            </SidebarGroup>
          ))}
          {validator && (
            <SidebarGroup label="Validador">
              <NavLink to="/app/validation/queue" title="Fila de validação" className="sidebar-nav__item">
                <ListChecks size={18} aria-hidden />
                <span>Fila de validação</span>
              </NavLink>
            </SidebarGroup>
          )}
        </SidebarGroups>
        {/* One card above the account: finishing the profile comes before inviting to validate. */}
        {account.completeness.percent < 100 ? (
          <Link
            to="/app/settings/profile"
            className="app-layout__invite sidebar-nav__hide-collapsed sidebar-nav__hide-mobile"
          >
            <span className="app-layout__invite-title">Completar perfil</span>
            <span className="app-layout__invite-text">Perfil {account.completeness.percent}% preenchido.</span>
          </Link>
        ) : (
          !validator && (
          <Link
            to="/app/validation/validator-application"
            className="app-layout__invite sidebar-nav__hide-collapsed sidebar-nav__hide-mobile"
          >
            <span className="app-layout__invite-title">Quero validar</span>
            <span className="app-layout__invite-text">Valide o trabalho de squads com a sua experiência.</span>
          </Link>
          )
        )}
        <SidebarFooter>
          <Avatar src={account.photoUrl} name={account.name} size="md" tone="ink" />
          <span className="app-layout__who sidebar-nav__hide-collapsed sidebar-nav__hide-mobile">
            <span className="app-layout__user" title={account.name}>
              {account.name}
            </span>
            {github && <span className="app-layout__handle">@{github}</span>}
          </span>
          <ThemeToggle />
          <NavLink
            to="/app/settings/profile"
            className="sidebar-nav__icon"
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
        </SidebarFooter>
      </SidebarNav>
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  )
}

