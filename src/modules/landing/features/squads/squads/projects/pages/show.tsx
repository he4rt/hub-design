import { Link, useNavigate, useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { MemberList } from '@/components/squads/member-list'
import { ProjectSummary } from '@/components/squads/project-summary'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { findSquadBySlug, formatDate } from '@/mocks/squads'
import '../../pages/show.css'

const COLLABORATION = { individual: 'individual', pair: 'em dupla', group: 'em grupo' } as const

/** Public page of a project: what the squad did and what each member did, kept for good. */
export default function Show() {
  const { squad: squadSlug, project: projectSlug } = useParams()
  const navigate = useNavigate()
  const state = useDb((s) => s)
  const squad = findSquadBySlug(state, squadSlug)
  const project = state.projects.find((p) => p.squadId === squad?.id && p.slug === projectSlug)

  useDebugActions('Projeto', [
    { label: 'Abrir projeto encerrado', run: () => navigate('/squads/loja-comunitaria/projects/catalogo') },
    { label: 'Abrir projeto atual', run: () => navigate('/squads/loja-comunitaria/projects/checkout') },
  ])

  if (!squad || !project) return <NotFound />

  const memberships = state.memberships.filter((m) => m.projectId === project.id)
  const deliveries = state.deliveries.filter((d) => d.projectId === project.id && d.status === 'accepted')
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? 'Membro removido'

  return (
    <main className="squad-show">
      <header className="squad-show__header">
        <Link to={`/squads/${squad.slug}`} className="squad-show__back">
          {squad.name}
        </Link>
        <div className="squad-show__title">
          <h1 title={project.name}>{project.name}</h1>
          <Badge variant={project.status === 'active' ? 'success' : 'outline'}>
            {project.status === 'ended' ? 'Encerrado' : project.status === 'active' ? 'Em andamento' : 'Criando'}
          </Badge>
        </div>
        <p className="squad-show__muted">
          {formatDate(project.startedAt)} a {project.endedAt ? formatDate(project.endedAt) : 'hoje'}
        </p>
      </header>

      <Card>
        <ProjectSummary project={project} />
      </Card>

      <Card>
        <h2>Quem fez</h2>
        <MemberList memberships={memberships} users={state.users} captainId={squad.captainId} />
      </Card>

      <Card>
        <h2>Entregas aceitas</h2>
        {deliveries.length === 0 ? (
          <p className="squad-show__muted">Nenhuma entrega aceita ainda.</p>
        ) : (
          <ul className="squad-show__deliveries">
            {deliveries.map((d) => (
              <li key={d.id}>
                <p>
                  <strong>{d.title}</strong>{' '}
                  <span className="squad-show__muted">
                    · {COLLABORATION[d.collaboration]} · {formatDate(d.decidedAt)}
                  </span>
                </p>
                <ul>
                  {d.credits.map((c) => (
                    <li key={c.userId} className="squad-show__muted">
                      {name(c.userId)}: {c.part}
                    </li>
                  ))}
                </ul>
                <p className="squad-show__muted">
                  {d.evidence.map((e, i) => (
                    <span key={e.ref}>
                      {i > 0 && ' · '}
                      <a href={e.url} target="_blank" rel="noreferrer">
                        {e.ref}
                      </a>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
