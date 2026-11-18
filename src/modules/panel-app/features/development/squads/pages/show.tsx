import { Link, useNavigate, useParams } from 'react-router'
import { FolderGit2, MessagesSquare, Plus } from 'lucide-react'
import { NotFound } from '@/components/not-found'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { DiscussionList } from '@/modules/panel-app/components/discussion-list'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { formatPeriod } from '@/modules/panel-app/lib/dates'
import { lastActivity } from '@/modules/panel-app/lib/discussions'
import './show.css'

/**
 * A squad and its log: every project it ran, newest first, kept for good. A squad is never
 * closed, only inactive, so its history and its members' credit stay here.
 */
export default function SquadShow() {
  const { squadSlug } = useParams()
  const navigate = useNavigate()
  const squad = useDb((state) => state.squads.find((candidate) => candidate.slug === squadSlug))
  const allProjects = useDb((state) => state.projects)
  const discussions = useDb((state) => state.discussions)
  const users = useDb((state) => state.users)

  useDebugActions('Squad', [
    { label: 'Abrir squad ativo', run: () => navigate('/app/squads/loja-comunitaria') },
    { label: 'Abrir squad inativo', run: () => navigate('/app/squads/agenda-he4rt') },
    { label: 'Abrir squad inexistente', run: () => navigate('/app/squads/nao-existe') },
  ])

  if (!squad) return <NotFound />

  const projects = allProjects
    .filter((project) => project.squadId === squad.id)
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))
  const projectIds = new Set(projects.map((project) => project.id))
  const related = discussions
    .filter(
      (discussion) =>
        (discussion.context?.type === 'squad' && discussion.context.id === squad.id) ||
        (discussion.context?.type === 'project' && projectIds.has(discussion.context.id)),
    )
    .toSorted((a, b) => lastActivity(b).localeCompare(lastActivity(a)))

  return (
    <div className="squad-show">
      <header className="squad-show__header">
        <p className="squad-show__overline">Squad</p>
        <div className="squad-show__title">
          <h1>{squad.name}</h1>
          <Badge variant={squad.status === 'active' ? 'soft' : 'outline'}>
            {squad.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <p className="squad-show__description">{squad.description}</p>
        <MemberLink userId={squad.captainId} caption="Capitão" />
      </header>

      {squad.status === 'inactive' && (
        <p className="squad-show__notice" role="note">
          Este squad está inativo: não tem projeto encaminhado agora. O log e o histórico de quem participou continuam
          aqui.
        </p>
      )}

      <div className="squad-show__grid">
        <section className="squad-show__log" aria-labelledby="squad-log-title">
          <h2 id="squad-log-title">Log do squad</h2>
          <ol>
            {projects.map((project) => (
              <li key={project.id}>
                <Card className="squad-show__project">
                  <div className="squad-show__project-head">
                    <h3>
                      <Link to={`/app/squads/${squad.slug}/projects/${project.slug}`}>{project.name}</Link>
                    </h3>
                    <Badge variant={project.endedAt ? 'outline' : 'soft'}>
                      {project.endedAt ? 'Concluído' : 'Em andamento'}
                    </Badge>
                  </div>
                  <p className="squad-show__project-meta">
                    <span>{formatPeriod(project.startedAt, project.endedAt)}</span>
                    <span>
                      <FolderGit2 size={12} aria-hidden />
                      {project.repository}
                    </span>
                  </p>
                  <p>{project.description}</p>
                  <ul className="squad-show__people" aria-label="Participantes">
                    {project.participants.map((participant) => {
                      const user = users.find((candidate) => candidate.id === participant.userId)
                      return user ? (
                        <li key={participant.userId} title={`${user.name} · ${participant.role}`}>
                          <Avatar src={user.photoUrl} name={user.name} size="sm" />
                          <span className="squad-show__sr">
                            {user.name}, {participant.role}
                          </span>
                        </li>
                      ) : null
                    })}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <Card className="squad-show__discussions" aria-labelledby="squad-discussions-title">
          <h2 id="squad-discussions-title">
            <MessagesSquare size={16} aria-hidden />
            Discussões
          </h2>
          <DiscussionList discussions={related} emptyText="Nenhuma discussão sobre este squad." />
          <Button asChild variant="secondary" size="sm" className="squad-show__new">
            <Link to={`/app/discussions/new?squad=${squad.id}`}>
              <Plus size={14} aria-hidden />
              Abrir discussão sobre o squad
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
