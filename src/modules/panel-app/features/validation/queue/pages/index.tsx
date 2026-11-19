import { Link } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { db, newId, useDb } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { distribute, evaluationCriterion, isActiveValidator, VALIDATOR_WINDOW } from '@/mocks/validation'
import '@/components/stack-page.css'

const DAY = 86_400_000

/** The validator's window: at most three open at once, handed out automatically. */
export default function Index() {
  const state = useDb((s) => s)
  const now = useNow()
  const userId = state.session?.userId ?? ''
  const mine = state.validationRequests.filter((r) => r.validatorId === userId && r.status === 'assigned')
  const queued = state.validationRequests.filter((r) => r.status === 'queued').length

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
    <div className="stack-page">
      <PageHeader
        title="Fila do validador"
        description={`Até ${VALIDATOR_WINDOW} validações abertas por vez. Quando você registra uma, a próxima da fila chega sozinha.`}
      />
      <Card>
        <div className="stack-page__row">
          <h2>
            Abertas <span className="stack-page__num">{mine.length}/{VALIDATOR_WINDOW}</span>
          </h2>
          <span className="stack-page__muted">
            <span className="stack-page__num">{queued}</span> na fila única
          </span>
        </div>
        {mine.length === 0 ? (
          <p className="stack-page__muted">Nada com você agora. Pedidos chegam aqui quando entram na fila.</p>
        ) : (
          <ul className="stack-page__list">
            {mine.map((r) => {
              const draft = state.validations.find((v) => v.requestId === r.id)
              const days = Math.floor((now - new Date(r.assignedAt ?? r.createdAt).getTime()) / DAY)
              return (
                <li key={r.id}>
                  <div className="stack-page__row">
                    <span className="stack-page__title">
                      {state.users.find((u) => u.id === r.memberId)?.name} · {evaluationCriterion(state, r)?.competency}
                    </span>
                    {draft && <StateChip entity="validation" state={draft.status} />}
                  </div>
                  <div className="stack-page__row">
                    <span className="stack-page__muted">
                      Com você desde {formatDate(r.assignedAt)} (<span className="stack-page__num">{days}</span> dias)
                    </span>
                    <Button asChild size="sm">
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
  )
}
