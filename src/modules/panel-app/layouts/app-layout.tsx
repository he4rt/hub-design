import { useTransition } from 'react'
import { AppTabBar } from '@/modules/panel-app/components/app-tab-bar'
import { currentItem, type NavGroup } from '@/modules/panel-app/lib/nav'
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
import { cn } from '@/lib/cn'
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
/** `fullWidth` leaves width and padding to a page with its own frame, such as the public profile. */
export function AppLayout({ fullWidth = false }: { fullWidth?: boolean }) {
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

  // One list feeds the sidebar and, on a phone, the bottom bar and its "Mais" sheet.
  const groups: NavGroup[] = [
    {
      label: 'Trajetória',
      items: [
        // Salvos is part of the Feed, so Início stays active there.
        { key: 'home', to: '/app', end: true, label: 'Início', icon: House, alsoActive: pathname === '/app/saved' },
        { key: 'profile', to: `/members/${account?.username}`, end: true, label: 'Meu perfil', icon: UserRound },
        { key: 'trajectory', to: `/members/${account?.username}?aba=trajetoria`, label: 'Trajetória', icon: GitCommitVertical },
        { key: 'forum', to: '/app/discussions', label: 'Fórum', icon: MessagesSquare },
      ],
    },
    {
      label: 'Desenvolvimento',
      items: [
        { key: 'squads', to: '/app/squads', end: true, label: 'Squads', icon: UsersRound },
        ...(mySquad ? [{ key: 'my-squad', to: `/app/squads/${mySquad.slug}`, end: true, label: 'Meu squad', icon: Flag }] : []),
        { key: 'validations', to: '/app/validation', end: true, label: 'Minhas validações', icon: BadgeCheck },
      ],
    },
    // The captain's tasks, apart from the member's: the group says what it is for, not the title.
    ...(captainOf.length > 0
      ? [{
          label: 'Gestão do squad',
          items: captainOf.flatMap((squad) => {
            // The squad's name only for whoever leads more than one.
            const of = captainOf.length > 1 ? `, ${squad.name}` : ''
            return [
              { key: `applications-${squad.id}`, to: `/app/squads/${squad.slug}/applications`, label: `Candidaturas recebidas${of}`, icon: Inbox, count: pendingApplications(squad.id) },
              { key: `deliveries-${squad.id}`, to: `/app/squads/${squad.slug}/deliveries`, label: `Entregas para revisar${of}`, icon: PackageCheck, count: pendingDeliveries(squad.id) },
            ]
          }),
        }]
      : []),
    ...(validator
      ? [{ label: 'Validador', items: [{ key: 'queue', to: '/app/validation/queue', label: 'Fila de validação', icon: ListChecks }] }]
      : []),
  ]

  const current = currentItem(groups.flatMap((group) => group.items), pathname, search)
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
          {groups.map((group) => (
            <SidebarGroup key={group.label} label={group.label}>
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={() => cn('sidebar-nav__item', current?.key === item.key && 'active')}
                >
                  <item.icon size={18} aria-hidden />
                  <span>{item.label}</span>
                  {!!item.count && <Badge variant="count">{item.count}</Badge>}
                </NavLink>
              ))}
            </SidebarGroup>
          ))}
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
      <main className="app-layout__content" data-full-width={fullWidth || undefined}>
        <Outlet />
      </main>
      <AppTabBar groups={groups} />
    </div>
  )
}

