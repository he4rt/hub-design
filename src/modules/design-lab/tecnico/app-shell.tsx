import { useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  Flag,
  GitBranch,
  House,
  Inbox,
  ListChecks,
  MessagesSquare,
  Moon,
  Settings,
  PackageCheck,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { useStore } from '@/lib/store'
import { useDb, type MockDb, type User } from '@/mocks/db'
import { activeSquadIds, githubHandle } from '@/mocks/squads'
import { isActiveValidator } from '@/mocks/validation'
import { MarcaHe4rt } from './marca'
import { Button, Count, Node } from './parts'
import { FONTS, malhaStore } from './theme'
import './malha.css'
import './feed.css'
import './motion.css'

/** Which lab screen is open, to mark its item in the navigation. */
export type ShellScreen = 'feed' | 'profile' | 'trajectory' | 'events'

type NavItem = { label: string; to: string; icon: LucideIcon; current?: boolean; count?: number }

function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

/** The same groups and links as the /app side navigation, read from the same state; lab screens link to each other. */
function navGroups(state: MockDb, account: User, screen: ShellScreen): { label: string; items: NavItem[] }[] {
  const mySquad = state.squads.find((s) => activeSquadIds(state, account.id).includes(s.id))
  const projectsOf = (squadId: string) => state.projects.filter((p) => p.squadId === squadId).map((p) => p.id)
  const pending = <T extends { status: string; projectId: string }>(rows: T[], squadId: string) =>
    rows.filter((r) => r.status === 'pending' && projectsOf(squadId).includes(r.projectId)).length
  return [
    {
      label: 'Trajetória',
      items: [
        { label: 'Início', to: '/design-lab/feed', icon: House, current: screen === 'feed' },
        { label: 'Meu perfil', to: '/design-lab/perfil', icon: UserRound, current: screen === 'profile' },
        { label: 'Trajetória', to: '/design-lab/trajetoria', icon: GitBranch, current: screen === 'trajectory' },
        { label: 'Fórum', to: '/app/discussions', icon: MessagesSquare },
        { label: 'Eventos', to: '/design-lab/eventos', icon: CalendarDays, current: screen === 'events' },
      ],
    },
    {
      label: 'Desenvolvimento',
      items: [
        { label: 'Squads', to: '/app/squads', icon: UsersRound },
        ...(mySquad ? [{ label: 'Meu squad', to: `/app/squads/${mySquad.slug}`, icon: Flag }] : []),
        { label: 'Minhas validações', to: '/app/validation', icon: BadgeCheck },
      ],
    },
    ...state.squads
      .filter((s) => s.captainId === account.id && s.status === 'active')
      .map((squad) => ({
        label: `Capitão de ${squad.name}`,
        items: [
          {
            label: 'Candidaturas',
            to: `/app/squads/${squad.slug}/applications`,
            icon: Inbox,
            count: pending(state.applications, squad.id),
          },
          {
            label: 'Entregas',
            to: `/app/squads/${squad.slug}/deliveries`,
            icon: PackageCheck,
            count: pending(state.deliveries, squad.id),
          },
        ],
      })),
    ...(isActiveValidator(state, account.id)
      ? [{ label: 'Validador', items: [{ label: 'Fila de validação', to: '/app/validation/queue', icon: ListChecks }] }]
      : []),
  ]
}

/** Switches the theme with a short cross-fade, where the browser has view transitions and motion is welcome. */
function toggleTheme() {
  const flip = () => malhaStore.set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }))
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return flip()
  document.startViewTransition({ update: () => flushSync(flip), types: ['theme'] })
}

/** A person: their photo, or their initials on lilac. Always a circle. */
export function PersonMark({ user, size = 'md' }: { user: User | undefined; size?: 'sm' | 'md' | 'xl' }) {
  const name = user?.name ?? 'Membro'
  if (user?.photoUrl) return <img className="txf-person" data-size={size} src={user.photoUrl} alt="" />
  return (
    <span className="txf-person" data-size={size} aria-hidden>
      {initials(name)}
    </span>
  )
}

/**
 * The /app frame in "Técnico × Traçado": the side navigation of whoever is signed in to /app, the
 * theme switch and the lab fonts. Without a session it asks to sign in and returns to `path`.
 */
export function AppShell({
  screen,
  path,
  children,
}: {
  screen: ShellScreen
  /** Where the sign-in returns to. */
  path: string
  children: (account: User, root: HTMLDivElement | null) => ReactNode
}) {
  const theme = useStore(malhaStore, (s) => s.theme)
  const state = useDb((s) => s)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const account = state.users.find((u) => u.id === state.session?.userId) ?? null
  const github = account && githubHandle(account)

  return (
    <div ref={setRoot} className="tx txf" data-theme={theme} data-variant="tecnico">
      <link rel="stylesheet" href={FONTS} precedence="design-lab" />
      {!account ? (
        <div className="txf-signin">
          <MarcaHe4rt tamanho={32} />
          <h1>Entre no Hub para ver esta tela</h1>
          <p className="tx-meta">Esta tela lê os dados de quem está logado no /app.</p>
          <Button variant="primary" asChild>
            <Link viewTransition to={`/app/login?redirect=${encodeURIComponent(path)}`}>Entrar</Link>
          </Button>
        </div>
      ) : (
        <div className="txf-app">
          <aside className="tx-side txf-side" aria-label="Navegação">
            <Link viewTransition to="/design-lab/tecnico" className="tx-side__brand" title="Voltar ao design system">
              <MarcaHe4rt tamanho={28} />
              He4rt Hub
            </Link>
            <nav className="txf-side__groups">
              {navGroups(state, account, screen).map((group) => (
                <div key={group.label} className="tx-side__group" role="group" aria-label={group.label}>
                  <span className="tx-side__label tx-label">{group.label}</span>
                  <div className="tx-side__line">
                    {group.items.map((item) => (
                      <Link viewTransition
                        key={item.label}
                        to={item.to}
                        className="tx-side__item"
                        aria-current={item.current ? 'page' : undefined}
                        title={item.label}
                      >
                        <Node kind={item.current ? 'current' : 'future'} />
                        <item.icon strokeWidth={1.75} aria-hidden />
                        <span>{item.label}</span>
                        {item.count ? <Count value={item.count} label={`${item.count} pendentes`} /> : <span />}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="txf-side__bottom">
              {account.completeness.percent < 100 && (
                <Link viewTransition to="/app/settings/profile" className="txf-invite">
                  <b>Completar perfil</b>
                  <span className="tx-meta">Perfil {account.completeness.percent}% preenchido.</span>
                </Link>
              )}
              <div className="tx-side__foot">
                <PersonMark user={account} size="sm" />
                <span className="txf-who">
                  <b title={account.name}>{account.name}</b>
                  {github && <span className="tx-mono">@{github}</span>}
                </span>
                <span className="txf-tools">
                  <Link viewTransition to="/app/settings/profile" className="txf-tool" aria-label="Configurações" title="Configurações">
                    <Settings strokeWidth={1.75} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className="txf-tool"
                    aria-label={theme === 'dark' ? 'Usar o tema claro' : 'Usar o tema escuro'}
                    title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                    onClick={toggleTheme}
                  >
                    {/* The key remounts the icon so it turns in on every switch. */}
                    {theme === 'dark' ? (
                      <Sun key="sun" className="txf-tool__theme" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Moon key="moon" className="txf-tool__theme" strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                </span>
              </div>
            </div>
          </aside>
          {children(account, root)}
        </div>
      )}
    </div>
  )
}
