import { useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useNow } from '@/hooks/use-now'
import { db, newId, useDb } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { byQueueOrder, distribute, evaluationCriterion, isEligible, STALLED_DAYS, VALIDATOR_WINDOW } from '@/mocks/validation'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { reassignValidationRequest } from '../../actions'
import '@/components/stack-page.css'

const DAY = 86_400_000

/** Single queue, occupancy and stalled requests. Nothing here is promised to the member as a deadline. */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const now = useNow()
  const { run, pending, error, success } = useActionRunner()
  const [targets, setTargets] = useState<Record<string, string>>({})
  const name = (id: string | null) => state.users.find((u) => u.id === id)?.name ?? '?'
  const queued = state.validationRequests.filter((r) => r.status === 'queued').sort(byQueueOrder)
  const assigned = state.validationRequests.filter((r) => r.status === 'assigned')
  const capacity = state.validators.filter((v) => !v.suspension).length * VALIDATOR_WINDOW
  const occupancy = capacity ? Math.round((assigned.length / capacity) * 100) : 0
  const stalled = assigned.filter((r) => now - new Date(r.assignedAt ?? r.createdAt).getTime() > STALLED_DAYS * DAY)

  useDebugActions('Fila de validação', [
    {
      label: 'Gerar 50 pedidos',
      run: () => {
        db.set((s) => ({
          ...s,
          validationRequests: [
            ...s.validationRequests,
            ...Array.from({ length: 50 }, (_, i) => ({
              id: newId(), memberId: i % 2 ? 'u7' : 'u2', projectId: 'p1', deliveryIds: ['d1'], criterionId: 'ec1',
              status: 'queued' as const, validatorId: null, assignedAt: null, conflicts: [],
              createdAt: new Date(Date.now() - (50 - i) * 60_000).toISOString(),
            })),
          ],
        }))
        distribute()
      },
    },
    {
      label: 'Pedido parado há 30 dias',
      run: () =>
        db.set((s) => {
          const r = s.validationRequests.find((x) => x.status === 'assigned')
          return r
            ? { ...s, validationRequests: s.validationRequests.map((x) => (x.id === r.id ? { ...x, assignedAt: new Date(Date.now() - 30 * DAY).toISOString() } : x)) }
            : s
        }),
    },
  ])

  return (
    <div className="stack-page">
      <PageHeader title="Fila de validação" description="Fila única, distribuída automaticamente a quem tem espaço na janela de 3." />
      <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      <Card>
        <div className="stack-page__row">
          <span>Ocupação</span>
          <span className="stack-page__actions stack-page__num">
            {assigned.length}/{capacity} ({occupancy}%)
            {occupancy > 80 && <Badge variant="warning">Habilite mais validadores</Badge>}
          </span>
        </div>
        <div className="stack-page__row">
          <span>Na fila</span>
          <span className="stack-page__actions stack-page__num">
            {queued.length}
            {capacity > 0 && queued.length > capacity * 2 && <Badge variant="danger">Acima de 2× a capacidade</Badge>}
          </span>
        </div>
      </Card>
      <Card>
        <h2>
          Parados há mais de {STALLED_DAYS} dias <span className="stack-page__num">{stalled.length}</span>
        </h2>
        {stalled.length === 0 ? (
          <p className="stack-page__muted">Nenhum pedido parado.</p>
        ) : (
          <ul className="stack-page__list">
            {stalled.map((r) => {
              const options = state.validators
                .filter((v) => v.userId !== r.validatorId && isEligible(state, v.userId, r))
                .map((v) => ({ value: v.userId, label: name(v.userId) }))
              return (
                <li key={r.id}>
                  <span className="stack-page__title">
                    {name(r.memberId)} · {evaluationCriterion(state, r)?.competency}
                  </span>
                  <span className="stack-page__muted">
                    Com {name(r.validatorId)} desde {formatDate(r.assignedAt)}
                  </span>
                  <div className="stack-page__row">
                    <Combobox
                      aria-label="Novo validador"
                      className="stack-page__grow"
                      options={options}
                      value={targets[r.id] ?? null}
                      onValueChange={(v) => setTargets((t) => ({ ...t, [r.id]: v ?? '' }))}
                      emptyText="Nenhum validador elegível com espaço."
                    />
                    <Button
                      size="sm"
                      disabled={pending || !targets[r.id]}
                      onClick={() => run(() => reassignValidationRequest(admin?.id ?? '', r.id, targets[r.id]), 'Redistribuído.')}
                    >
                      Redistribuir
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Card>
        <h2>Fila</h2>
        {queued.length === 0 ? (
          <p className="stack-page__muted">Fila vazia.</p>
        ) : (
          <ul className="stack-page__list">
            {queued.slice(0, 20).map((r, i) => (
              <li key={r.id} className="stack-page__row">
                <span className="stack-page__title">
                  <span className="stack-page__num">{i + 1}.</span> {name(r.memberId)} · {evaluationCriterion(state, r)?.competency}
                </span>
                <span className="stack-page__muted">
                  {r.requeuedAt ? 'devolvido à frente' : `desde ${formatDate(r.createdAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
