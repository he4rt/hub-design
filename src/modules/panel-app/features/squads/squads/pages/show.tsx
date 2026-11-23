import { Link, Navigate, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { DeliveryHistory } from '@/components/squads/delivery-history'
import { SquadLog } from '@/components/squads/squad-log'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, type BoardStatus } from '@/mocks/db'
import { boardItemMoved, sweep } from '@/mocks/github'
import { formatDate } from '@/mocks/squads'
import { SquadTabs } from '../components/squad-tabs'
import { useSquadPage } from '../hooks/use-squad-page'
import { canLeave, leaveSquad } from '../members/actions'
import '../components/squad-page.css'
import './show.css'

const COLUMNS: { status: BoardStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'ready', label: 'Pronto' },
  { status: 'in-progress', label: 'Em andamento' },
  { status: 'in-review', label: 'Em revisão' },
  { status: 'done', label: 'Feito' },
]

/** "Meu squad": the board mirrored from GitHub, my deliveries and my history next to the team's. */
export default function Show() {
  const navigate = useNavigate()
  const { state, userId, squad, project, manager, member, counts } = useSquadPage()
  const { run, pending, error } = useActionRunner()

  useDebugActions('Meu squad', [
    {
      label: 'Item "Testes do cupom" vai para Feito (sem PR, nada acontece)',
      run: () => run(() => boardItemMoved('b3', 'done')),
    },
    { label: 'Item "Documentar o fluxo" vai para Feito', run: () => run(() => boardItemMoved('b4', 'done')) },
    {
      label: 'Webhook perdido: varredura periódica',
      description: 'Move um item sem webhook e roda a varredura.',
      run: () => {
        db.set((s) => ({ ...s, boardItems: s.boardItems.map((i) => (i.id === 'b4' ? { ...i, status: 'done' as const } : i)) }))
        run(() => sweep())
      },
    },
    { label: 'Entrar como Ana (membro)', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
  ])

  if (!squad) return <NotFound />
  // Who is not in the squad reads its public page.
  if (!member && !manager) return <Navigate to={`/squads/${squad.slug}`} replace />

  const board = state.boardItems.filter((i) => i.projectId === project?.id)
  const projectIds = new Set(state.projects.filter((p) => p.squadId === squad.id).map((p) => p.id))
  const myDeliveries = state.deliveries.filter((d) => projectIds.has(d.projectId) && d.credits.some((c) => c.userId === userId))
  const myLog = state.squadLog.filter((e) => e.squadId === squad.id && e.subjectId === userId)
  const teamLog = state.squadLog.filter((e) => e.squadId === squad.id)
  const activeHere = state.memberships.some((m) => m.squadId === squad.id && m.userId === userId && m.leftAt === null)
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="squad-page">
      <div className="squad-page__head">
        <PageHeader
          title={squad.name}
          description={project ? `Projeto atual: ${project.name}.` : 'Sem projeto ativo: o squad está inativo.'}
          actions={
            <Button asChild variant="secondary">
              <Link to={`/squads/${squad.slug}`}>Página pública</Link>
            </Button>
          }
        />
        <SquadTabs squad={squad} manager={manager} counts={counts} />
      </div>

      {project && (
        <Card>
          <CardHeader>
            <h2>Board</h2>
            {project.board && (
              <Button asChild variant="ghost" size="sm">
                <a href={project.board.url} target="_blank" rel="noreferrer">
                  Abrir no GitHub
                </a>
              </Button>
            )}
          </CardHeader>
          <p className="squad-page__muted">
            Cópia só de leitura: o board é editado no GitHub. Atualizado em {formatDate(state.githubSync.lastWebhookAt)}.
          </p>
          <div className="my-squad__board">
            {COLUMNS.map((col) => {
              const items = board.filter((i) => i.status === col.status)
              return (
                <section key={col.status} className="my-squad__column" aria-label={col.label}>
                  <h3>
                    {col.label} ({items.length})
                  </h3>
                  {items.length === 0 && <p className="my-squad__empty">Nada aqui.</p>}
                  {items.map((item) => {
                    const who = item.assigneeIds.map(name).join(', ') || 'Sem responsável'
                    return (
                      <a key={item.id} href={item.issue.url} target="_blank" rel="noreferrer" className="my-squad__item" title={item.issue.title}>
                        <span className="my-squad__item-ref">#{item.issue.number}</span>
                        <span className="my-squad__item-title">{item.issue.title}</span>
                        <span className="my-squad__item-who" title={who}>
                          {who}
                        </span>
                        <Badge variant={item.kind === 'technical' ? 'comp' : 'neutral'}>
                          {item.kind === 'technical' ? 'Técnica' : 'Não técnica'}
                        </Badge>
                      </a>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2>Minhas entregas</h2>
          {myDeliveries.some((d) => d.status === 'accepted') && (
            <Button asChild size="sm">
              <Link to={`/app/validation/requests/create?squad=${squad.slug}`}>Pedir validação</Link>
            </Button>
          )}
        </CardHeader>
        {myDeliveries.length === 0 ? (
          <p className="squad-page__muted">
            Quando um item seu chega em Feito no board, ele aparece aqui para o capitão aceitar.
          </p>
        ) : (
          <ul className="squad-page__list">
            {myDeliveries.map((d) => (
              <li key={d.id}>
                <div className="squad-page__row">
                  <span className="squad-page__name" title={d.title}>
                    {d.title}
                  </span>
                  <StateChip entity="delivery" state={d.status} />
                </div>
                {d.status === 'accepted' && (
                  <p className="squad-page__muted">Sua parte: {d.credits.find((c) => c.userId === userId)?.part}</p>
                )}
                {d.status === 'returned' && <p className="squad-page__text">Motivo da devolução: {d.returnedReason}</p>}
                <DeliveryHistory delivery={d} users={state.users} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {project && (
        <Card>
          <CardHeader>
            <h2>Objetivo e critérios</h2>
          </CardHeader>
          <ProjectSummary project={project} />
        </Card>
      )}

      <div className="my-squad__history">
        <Card>
          <CardHeader>
            <h2>O que foi meu</h2>
          </CardHeader>
          <SquadLog entries={myLog} projects={state.projects} users={state.users} />
        </Card>
        <Card>
          <CardHeader>
            <h2>O que foi do time</h2>
          </CardHeader>
          <SquadLog entries={teamLog} projects={state.projects} users={state.users} />
        </Card>
      </div>

      {activeHere && canLeave(squad.captainId, userId) && (
        <Card>
          <div className="squad-page__row">
            <p className="squad-page__muted">Sair do squad tira seu acesso ao repositório. O que você fez continua no log.</p>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => run(() => leaveSquad(userId, squad.id), () => navigate('/app/squads'))}
            >
              Sair do squad
            </Button>
          </div>
        </Card>
      )}
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
