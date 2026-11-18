import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, CalendarRange, ExternalLink, FolderGit2, MessagesSquare, Plus } from 'lucide-react'
import { NotFound } from '@/components/not-found'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb, type Delivery, type ProjectEvidence, type SquadProject } from '@/mocks/db'
import { DiscussionList } from '@/modules/panel-app/components/discussion-list'
import { MemberLink } from '@/modules/panel-app/components/member-link'
import { formatMonth, formatPeriod } from '@/modules/panel-app/lib/dates'
import { lastActivity } from '@/modules/panel-app/lib/discussions'
import { evidenceIcons, evidenceRef } from '@/modules/panel-app/lib/evidence'
import './show.css'

const deliveryStatus: Record<Delivery['status'], string> = { accepted: 'Entrega aceita', 'in-review': 'Em revisão' }

function EvidenceRef({ evidence, project }: { evidence: ProjectEvidence; project: SquadProject }) {
  const Icon = evidenceIcons[evidence.kind]
  const ref = evidenceRef({ ...evidence, repository: project.repository })
  return (
    <a href={evidence.url} target="_blank" rel="noreferrer" className="project-show__ref" title={evidence.title}>
      <Icon size={12} aria-hidden />
      <code>{ref}</code>
      <span className="project-show__sr"> (abre no GitHub)</span>
    </a>
  )
}

/**
 * A squad project: what it is, who took part and in which role, what was delivered and by whom,
 * the repository history, and the discussions about it. Opened from a profile (`?member=`),
 * it starts with what that member did, apart from what the team did.
 */
export default function ProjectShow() {
  const { squadSlug, projectSlug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const squad = useDb((state) => state.squads.find((candidate) => candidate.slug === squadSlug))
  const project = useDb((state) =>
    state.projects.find((candidate) => candidate.squadId === squad?.id && candidate.slug === projectSlug),
  )
  const discussions = useDb((state) => state.discussions)
  const users = useDb((state) => state.users)
  const sessionUserId = useDb((state) => state.session?.userId ?? null)
  const memberUserId = useDb(
    (state) => state.profiles.find((profile) => profile.handle === params.get('member'))?.userId ?? null,
  )

  useDebugActions('Projeto do squad', [
    {
      label: 'Ver o que a Ana fez neste projeto',
      run: () => navigate('/app/squads/loja-comunitaria/projects/checkout?member=ana-souza'),
    },
    { label: 'Ver o projeto sem destaque', run: () => navigate('/app/squads/loja-comunitaria/projects/checkout') },
    { label: 'Abrir projeto concluído', run: () => navigate('/app/squads/loja-comunitaria/projects/catalogo') },
    { label: 'Abrir projeto de squad inativo', run: () => navigate('/app/squads/agenda-he4rt/projects/calendario') },
    { label: 'Abrir projeto inexistente', run: () => navigate('/app/squads/loja-comunitaria/projects/nao-existe') },
  ])

  if (!squad || !project) return <NotFound />

  // The member the page opened for, or the signed-in member when they took part.
  const focus =
    project.participants.find((participant) => participant.userId === memberUserId) ??
    project.participants.find((participant) => participant.userId === sessionUserId)
  const focusName = users.find((user) => user.id === focus?.userId)?.name.split(' ')[0]
  const isSelf = focus?.userId === sessionUserId
  const evidenceById = (id: string) => project.evidences.find((evidence) => evidence.id === id)
  const focusDeliveries = project.deliveries.filter((delivery) => focus && delivery.memberIds.includes(focus.userId))
  const focusEvidences = project.evidences.filter((evidence) => evidence.authorId === focus?.userId)
  const related = discussions
    .filter((discussion) => discussion.context?.type === 'project' && discussion.context.id === project.id)
    .toSorted((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
  const participants = project.participants.toSorted((a, b) =>
    a.userId === squad.captainId ? -1 : b.userId === squad.captainId ? 1 : a.joinedAt.localeCompare(b.joinedAt),
  )

  return (
    <div className="project-show">
      <Link to={`/app/squads/${squad.slug}`} className="project-show__back">
        <ArrowLeft size={14} aria-hidden />
        Squad {squad.name}
      </Link>

      <header className="project-show__header">
        <h1>{project.name}</h1>
        <p className="project-show__meta">
          <Badge variant={project.endedAt ? 'outline' : 'soft'}>{project.endedAt ? 'Concluído' : 'Em andamento'}</Badge>
          <span className="project-show__period">
            <CalendarRange size={14} aria-hidden />
            {formatPeriod(project.startedAt, project.endedAt)}
          </span>
          <a href={`https://github.com/${project.repository}`} target="_blank" rel="noreferrer">
            <FolderGit2 size={14} aria-hidden />
            <code>{project.repository}</code>
            <ExternalLink size={12} aria-hidden />
          </a>
        </p>
        <p className="project-show__description">{project.description}</p>
      </header>

      <div className="project-show__grid">
        <div className="project-show__main">
          {focus && (
            <Card className="project-show__focus" aria-labelledby="project-focus-title">
              <h2 id="project-focus-title">{isSelf ? 'Seu papel neste projeto' : `O que ${focusName} fez neste projeto`}</h2>
              <MemberLink userId={focus.userId} caption={`${focus.role} · desde ${formatMonth(focus.joinedAt)}`} />
              <p>{focus.responsibilities}</p>
              {focusDeliveries.length > 0 && (
                <div className="project-show__focus-group">
                  <h3>Entregas</h3>
                  <ul>
                    {focusDeliveries.map((delivery) => (
                      <li key={delivery.id}>
                        <span>{delivery.title}</span>
                        <Badge variant={delivery.status === 'accepted' ? 'soft' : 'outline'}>
                          {deliveryStatus[delivery.status]}
                        </Badge>
                        {delivery.memberIds.length > 1 && (
                          <span className="project-show__muted">
                            {delivery.memberIds.length === 2 ? 'em dupla' : 'em grupo'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {focusEvidences.length > 0 && (
                <div className="project-show__focus-group">
                  <h3>Commits e pull requests</h3>
                  <ul className="project-show__refs">
                    {focusEvidences.map((evidence) => (
                      <li key={evidence.id}>
                        <EvidenceRef evidence={evidence} project={project} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card aria-labelledby="project-deliveries-title">
            <h2 id="project-deliveries-title">Entregas do time</h2>
            {project.deliveries.length === 0 ? (
              <p className="project-show__muted">Nenhuma entrega registrada ainda.</p>
            ) : (
              <ol className="project-show__deliveries">
                {project.deliveries
                  .toSorted((a, b) => b.date.localeCompare(a.date))
                  .map((delivery) => (
                    <li
                      key={delivery.id}
                      className="project-show__delivery"
                      data-focus={(focus && delivery.memberIds.includes(focus.userId)) || undefined}
                    >
                      <div className="project-show__delivery-head">
                        <h3>{delivery.title}</h3>
                        <Badge variant={delivery.status === 'accepted' ? 'soft' : 'outline'}>
                          {deliveryStatus[delivery.status]}
                        </Badge>
                        <time dateTime={delivery.date}>{formatMonth(delivery.date)}</time>
                      </div>
                      <p>{delivery.description}</p>
                      <div className="project-show__delivery-foot">
                        <span className="project-show__muted">Feita por</span>
                        {delivery.memberIds.map((userId) => (
                          <MemberLink key={userId} userId={userId} />
                        ))}
                        <ul className="project-show__refs">
                          {delivery.evidenceIds.map((id) => {
                            const evidence = evidenceById(id)
                            return evidence ? (
                              <li key={id}>
                                <EvidenceRef evidence={evidence} project={project} />
                              </li>
                            ) : null
                          })}
                        </ul>
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </Card>

          <Card aria-labelledby="project-log-title">
            <h2 id="project-log-title">
              <code>git log</code> do projeto
            </h2>
            <ol className="project-show__log">
              {project.evidences
                .toSorted((a, b) => b.date.localeCompare(a.date))
                .map((evidence) => {
                  const Icon = evidenceIcons[evidence.kind]
                  const author = users.find((user) => user.id === evidence.authorId)
                  return (
                    <li key={evidence.id} data-focus={evidence.authorId === focus?.userId || undefined}>
                      <time dateTime={evidence.date}>{formatMonth(evidence.date)}</time>
                      <a href={evidence.url} target="_blank" rel="noreferrer" title={evidence.title}>
                        <Icon size={14} aria-hidden />
                        <code>{evidence.kind === 'commit' ? evidence.ref : `#${evidence.ref}`}</code>
                        <span className="project-show__log-title">{evidence.title}</span>
                      </a>
                      <span className="project-show__log-author" title={author?.name}>
                        {author?.name}
                      </span>
                    </li>
                  )
                })}
            </ol>
          </Card>
        </div>

        <aside className="project-show__side" aria-label="Participantes e discussões">
          <Card aria-labelledby="project-people-title">
            <h2 id="project-people-title">Participantes</h2>
            <ul className="project-show__people">
              {participants.map((participant) => (
                <li key={participant.userId} data-focus={participant.userId === focus?.userId || undefined}>
                  <MemberLink userId={participant.userId} caption={participant.role} />
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="project-discussions-title">
            <h2 id="project-discussions-title">
              <MessagesSquare size={16} aria-hidden />
              Discussões
            </h2>
            <DiscussionList discussions={related} showContext={false} emptyText="Nenhuma discussão sobre este projeto." />
            <Button asChild variant="secondary" size="sm" className="project-show__new">
              <Link to={`/app/discussions/new?project=${project.id}`}>
                <Plus size={14} aria-hidden />
                Abrir discussão sobre o projeto
              </Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
