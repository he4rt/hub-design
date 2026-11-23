import { Link } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { db, newId, useDb } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { distribute, evaluationCriterion, isActiveValidator, VALIDATOR_WINDOW } from '@/mocks/validation'
import '@/components/validation/validation-page.css'
import './index.css'

const DAY = 86_400_000

/** The validator's window: at most three open at once, handed out automatically. */
export default function Index() {
  const state = useDb((s) => s)
  const now = useNow()
  const userId = state.session?.userId ?? ''
  const mine = state.validationRequests.filter((r) => r.validatorId === userId && r.status === 'assigned')
  const queued = state.validationQueueSize ?? state.validationRequests.filter((r) => r.status === 'queued').length

  useDebugActions('Fila do validador', [
    {
      label: 'Membros pedem 4 validações',
      description: 'Enche a janela; o que sobra fica na fila única.',
      run: () => {
        db.set((s) => ({
          ...s,
          validationRequests: [
            ...s.validationRequests,
            ...Array.from({ length: 4 }, (_, i) => ({
              id: newId(),
              memberId: i % 2 ? 'u7' : 'u2',
              projectId: 'p1',
              deliveryIds: ['d1'],
              criterionId: ['ec1', 'ec2', 'ec3'][i % 3],
              status: 'queued' as const,
              validatorId: null,
              assignedAt: null,
              conflicts: [],
              createdAt: new Date(Date.now() - (4 - i) * 60_000).toISOString(),
            })),
          ],
        }))
        distribute()
      },
    },
    { label: 'Entrar como Diego (validador)', run: () => db.set((s) => ({ ...s, session: { userId: 'u9' } })) },
    { label: 'Entrar como Ana (não validadora)', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
  ])

  if (!isActiveValidator(state, userId)) return <NotFound />

  return (
    <div className="validation-page">
      <PageHeader
        title="Fila do validador"
        description={`Até ${VALIDATOR_WINDOW} validações abertas por vez. Quando você registra uma, a próxima da fila chega sozinha.`}
      />
      <div className="validator-queue">
        <Card className="validator-queue__occupancy">
          <span className="validation-page__muted">Sua janela</span>
          <span className="validator-queue__stat">
            {mine.length} de {VALIDATOR_WINDOW} abertas
          </span>
          <Progress value={(mine.length / VALIDATOR_WINDOW) * 100} aria-label="Ocupação da sua janela" />
          <span className="validation-page__muted">
            {queued === 0 ? 'Ninguém esperando na fila única.' : `${queued} ${queued === 1 ? 'pedido espera' : 'pedidos esperam'} na fila única.`}
          </span>
        </Card>

        <Card>
          <CardHeader>
            <h2>Com você ({mine.length})</h2>
          </CardHeader>
          {mine.length === 0 ? (
            <p className="validation-page__muted">Nada com você agora. Pedidos chegam aqui quando entram na fila.</p>
          ) : (
            <ul className="validation-page__list">
              {mine.map((r) => {
                const draft = state.validations.find((v) => v.requestId === r.id)
                const days = Math.floor((now - new Date(r.assignedAt ?? r.createdAt).getTime()) / DAY)
                const memberName = state.users.find((u) => u.id === r.memberId)?.name
                return (
                  <li key={r.id}>
                    <div className="validation-page__row">
                      <span className="validation-page__name" title={memberName}>
                        {memberName}
                      </span>
                      <span className="validation-page__chips">
                        <Badge variant="comp">{evaluationCriterion(state, r)?.competency}</Badge>
                        {draft && <StateChip entity="validation" state={draft.status} />}
                      </span>
                    </div>
                    <div className="validation-page__row">
                      <span className="validation-page__muted validation-page__num">
                        Com você desde {formatDate(r.assignedAt)}, há {days} {days === 1 ? 'dia' : 'dias'}.
                      </span>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/app/validation/queue/${r.id}`}>{draft ? 'Continuar' : 'Abrir'}</Link>
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
