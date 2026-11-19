import { Link, useNavigate, useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { MemberList } from '@/components/squads/member-list'
import { ProjectSummary } from '@/components/squads/project-summary'
import { StateChip } from '@/components/state-chip'
import { Card, CardHeader } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { findSquadBySlug, formatDate } from '@/mocks/squads'
import '../../pages/show.css'

const COLLABORATION = { individual: 'individualmente', pair: 'em dupla', group: 'em grupo' } as const

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
          <StateChip entity="project" state={project.status} />
        </div>
        <p className="squad-show__muted">
          De {formatDate(project.startedAt)} a {project.endedAt ? formatDate(project.endedAt) : 'hoje'}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h2>Objetivo e critérios</h2>
        </CardHeader>
        <ProjectSummary project={project} />
      </Card>

      <Card>
        <CardHeader>
          <h2>Quem fez</h2>
        </CardHeader>
        <MemberList memberships={memberships} users={state.users} captainId={squad.captainId} />
      </Card>

      <Card>
        <CardHeader>
          <h2>Entregas aceitas ({deliveries.length})</h2>
        </CardHeader>
        {deliveries.length === 0 ? (
          <p className="squad-show__muted">Nenhuma entrega aceita ainda.</p>
        ) : (
          <ul className="squad-show__deliveries">
            {deliveries.map((d) => (
              <li key={d.id}>
                <p className="squad-show__delivery-title">{d.title}</p>
                <p className="squad-show__muted">
                  Feita {COLLABORATION[d.collaboration]}, aceita em {formatDate(d.decidedAt)}.
                </p>
                <ul className="squad-show__credits">
                  {d.credits.map((c) => (
                    <li key={c.userId}>
                      <strong>{name(c.userId)}:</strong> {c.part}
                    </li>
                  ))}
                </ul>
                {d.evidence.length > 0 && (
                  <Card variant="inset">
                    <ul className="squad-show__evidence" aria-label="Evidência no GitHub">
                      {d.evidence.map((e) => (
                        <li key={e.ref}>
                          <a href={e.url} target="_blank" rel="noreferrer" title={e.ref}>
                            {e.ref}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
