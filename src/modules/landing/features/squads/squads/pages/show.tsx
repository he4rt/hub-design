import { Link, useNavigate, useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { MemberList } from '@/components/squads/member-list'
import { ProjectSummary } from '@/components/squads/project-summary'
import { SquadLog } from '@/components/squads/squad-log'
import { StateChip } from '@/components/state-chip'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { activeMemberships, activeProject, findSquadBySlug, formatDate } from '@/mocks/squads'
import { ApplyCall } from '../components/apply-call'
import './show.css'

/** Public page of a squad: the current project, captain, members and the permanent log. */
export default function Show() {
  const { squad: slug } = useParams()
  const navigate = useNavigate()
  const state = useDb((s) => s)
  const squad = findSquadBySlug(state, slug)

  useDebugActions('Detalhe do squad', [
    { label: 'Abrir squad inativo', run: () => navigate('/squads/agenda-he4rt') },
    { label: 'Abrir vacancy', run: () => navigate('/squads/bot-do-discord') },
    { label: 'Ver como visitante', run: () => db.set((s) => ({ ...s, session: null })) },
    { label: 'Entrar como Letícia (teste aprovado)', run: () => db.set((s) => ({ ...s, session: { userId: 'u10' } })) },
    { label: 'Entrar como Gustavo (teste aberto)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
  ])

  if (!squad) return <NotFound />

  const project = activeProject(state, squad.id)
  const captain = state.users.find((u) => u.id === squad.captainId)
  const pastProjects = state.projects
    .filter((p) => p.squadId === squad.id && p.status === 'ended')
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  return (
    <main className="squad-show">
      <header className="squad-show__header">
        <Link to="/squads" className="squad-show__back">
          Squads
        </Link>
        <div className="squad-show__title">
          <h1 title={squad.name}>{squad.name}</h1>
          <StateChip entity="squad" state={squad.status} />
        </div>
        <p>{squad.description}</p>
        <p className="squad-show__muted">{captain ? `Capitão: ${captain.name}` : 'Vacancy: este squad está sem capitão.'}</p>
      </header>

      {project ? (
        <>
          <Card>
            <h2>
              Projeto atual: <Link to={`/squads/${squad.slug}/projects/${project.slug}`}>{project.name}</Link>
            </h2>
            <ProjectSummary project={project} />
          </Card>
          <ApplyCall squad={squad} project={project} />
          <Card>
            <h2>Membros</h2>
            <MemberList
              memberships={activeMemberships(state, project.id)}
              users={state.users}
              captainId={squad.captainId}
            />
          </Card>
        </>
      ) : (
        <Card>
          <p className="squad-show__muted">
            Este squad está inativo: não há projeto encaminhado agora. O log e o histórico dos membros continuam aqui.
          </p>
        </Card>
      )}

      {pastProjects.length > 0 && (
        <Card>
          <h2>Projetos anteriores</h2>
          <ul className="squad-show__projects">
            {pastProjects.map((p) => (
              <li key={p.id}>
                <Link to={`/squads/${squad.slug}/projects/${p.slug}`}>{p.name}</Link>
                <span className="squad-show__muted">
                  {formatDate(p.startedAt)} a {formatDate(p.endedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2>Log do squad</h2>
        <SquadLog
          entries={state.squadLog.filter((e) => e.squadId === squad.id)}
          projects={state.projects}
          users={state.users}
        />
      </Card>
    </main>
  )
}
