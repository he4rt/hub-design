import { Link, Navigate, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { SquadLog } from '@/components/squads/squad-log'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, type BoardStatus } from '@/mocks/db'
import { boardItemMoved, sweep } from '@/mocks/github'
import { formatDate } from '@/mocks/squads'
import { SquadTabs } from '../components/squad-tabs'
import { useSquadPage } from '../hooks/use-squad-page'
import { canLeave, leaveSquad } from '../members/actions'
import './show.css'
import '@/components/stack-page.css'

const COLUMNS: { status: BoardStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'ready', label: 'Pronto' },
  { status: 'in-progress', label: 'Em andamento' },
  { status: 'in-review', label: 'Em revisão' },
  { status: 'done', label: 'Feito' },
]

const DELIVERY = {
  pending: { label: 'Esperando o capitão', tone: 'warning' },
  accepted: { label: 'Aceita', tone: 'success' },
  returned: { label: 'Devolvida', tone: 'danger' },
} as const

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
  const myDeliveries = state.deliveries.filter((d) => d.credits.some((c) => c.userId === userId))
  const myLog = state.squadLog.filter((e) => e.squadId === squad.id && e.subjectId === userId)
  const teamLog = state.squadLog.filter((e) => e.squadId === squad.id)
  const activeHere = state.memberships.some((m) => m.squadId === squad.id && m.userId === userId && m.leftAt === null)
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="stack-page">
      <PageHeader
        title={squad.name}
        description={project ? `Projeto atual: ${project.name}` : 'Sem projeto ativo: o squad está inativo.'}
        actions={
          <Button asChild variant="secondary">
            <Link to={`/squads/${squad.slug}`}>Página pública</Link>
          </Button>
        }
      />
      <SquadTabs squad={squad} manager={manager} counts={counts} />
      <FormMessage tone="error">{error}</FormMessage>

      {project && (
        <Card>
          <div className="stack-page__row">
            <h2>Board</h2>
            {project.board && (
              <Button asChild variant="secondary" size="sm">
                <a href={project.board.url} target="_blank" rel="noreferrer">
                  Abrir no GitHub
                </a>
              </Button>
            )}
          </div>
          <p className="stack-page__muted">
            Cópia só de leitura: o board é editado no GitHub. Atualizado em {formatDate(state.githubSync.lastWebhookAt)}.
          </p>
          <div className="my-squad__board">
            {COLUMNS.map((col) => {
              const items = board.filter((i) => i.status === col.status)
              return (
                <section key={col.status} className="my-squad__column">
                  <h3>
                    {col.label} <span className="stack-page__num">{items.length}</span>
                  </h3>
                  {items.map((item) => (
                    <a key={item.id} href={item.issue.url} target="_blank" rel="noreferrer" className="my-squad__card" title={item.issue.title}>
                      <span className="my-squad__card-title">
                        #{item.issue.number} {item.issue.title}
                      </span>
                      <span className="stack-page__muted">
                        {item.assigneeIds.map(name).join(', ') || 'Sem responsável'}
                        {item.kind === 'non-technical' && ' · não técnica'}
                      </span>
                    </a>
                  ))}
                </section>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="stack-page__row">
          <h2>Minhas entregas</h2>
          {myDeliveries.some((d) => d.status === 'accepted') && (
            <Button asChild size="sm">
              <Link to={`/app/validation/requests/create?squad=${squad.slug}`}>Pedir validação</Link>
            </Button>
          )}
        </div>
        {myDeliveries.length === 0 ? (
          <p className="stack-page__muted">
            Quando um item seu chega em Feito no board, ele aparece aqui para o capitão aceitar.
          </p>
        ) : (
          <ul className="stack-page__list">
            {myDeliveries.map((d) => (
              <li key={d.id}>
                <div className="stack-page__row">
                  <span className="stack-page__title">{d.title}</span>
                  <Badge tone={DELIVERY[d.status].tone}>{DELIVERY[d.status].label}</Badge>
                </div>
                {d.status === 'accepted' && (
                  <p className="stack-page__muted">Sua parte: {d.credits.find((c) => c.userId === userId)?.part}</p>
                )}
                {d.status === 'returned' && <p className="stack-page__quote">Motivo: {d.returnedReason}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {project && (
        <Card>
          <h2>Objetivo e critérios</h2>
          <ProjectSummary project={project} />
        </Card>
      )}

      <div className="my-squad__history">
        <Card>
          <h2>O que foi meu</h2>
          <SquadLog entries={myLog} projects={state.projects} users={state.users} />
        </Card>
        <Card>
          <h2>O que foi do time</h2>
          <SquadLog entries={teamLog} projects={state.projects} users={state.users} />
        </Card>
      </div>

      {activeHere && canLeave(squad.captainId, userId) && (
        <Card>
          <div className="stack-page__row">
            <p className="stack-page__muted">Sair do squad tira seu acesso ao repositório. O que você fez continua no log.</p>
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
    </div>
  )
}
