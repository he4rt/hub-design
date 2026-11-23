import { useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useNow } from '@/hooks/use-now'
import { db, newId, useDb } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { byQueueOrder, distribute, evaluationCriterion, isEligible, STALLED_DAYS, VALIDATOR_WINDOW } from '@/mocks/validation'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { reassignValidationRequest } from '../../actions'
import './index.css'

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
    <div className="admin-queue">
      <div className="admin-queue__head">
        <PageHeader title="Fila de validação" description="Fila única, distribuída automaticamente a quem tem espaço na janela de 3." />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      <Card>
        <CardHeader>
          <h2>Capacidade</h2>
        </CardHeader>
        <ul className="admin-queue__list">
          <li className="admin-queue__line">
            <span>
              {assigned.length} de {capacity} lugares ocupados nas janelas dos validadores ({occupancy}%).
            </span>
            {occupancy > 80 && <Badge variant="warning">Habilite mais validadores</Badge>}
          </li>
          <li className="admin-queue__line">
            <span>
              {queued.length === 0
                ? 'Nenhum pedido esperando na fila.'
                : `${queued.length} ${queued.length === 1 ? 'pedido esperando' : 'pedidos esperando'} na fila.`}
            </span>
            {capacity > 0 && queued.length > capacity * 2 && <Badge variant="warning">Acima de 2× a capacidade</Badge>}
          </li>
        </ul>
      </Card>
      <Card>
        <CardHeader>
          <h2>
            Parados há mais de {STALLED_DAYS} dias ({stalled.length})
          </h2>
        </CardHeader>
        {stalled.length === 0 ? (
          <p className="admin-queue__muted">Nenhum pedido parado.</p>
        ) : (
          <ul className="admin-queue__list">
            {stalled.map((r) => {
              const options = state.validators
                .filter((v) => v.userId !== r.validatorId && isEligible(state, v.userId, r))
                .map((v) => ({ value: v.userId, label: name(v.userId) }))
              return (
                <li key={r.id} className="admin-queue__stalled">
                  <div className="admin-queue__who">
                    <span className="admin-queue__name">
                      {name(r.memberId)} <Badge variant="comp">{evaluationCriterion(state, r)?.competency}</Badge>
                    </span>
                    <span className="admin-queue__caption">
                      Com {name(r.validatorId)} desde {formatDate(r.assignedAt)}.
                    </span>
                  </div>
                  <div className="admin-queue__reassign">
                    <Combobox
                      aria-label="Novo validador"
                      options={options}
                      value={targets[r.id] ?? null}
                      onValueChange={(v) => setTargets((t) => ({ ...t, [r.id]: v ?? '' }))}
                      emptyText="Nenhum validador elegível com espaço."
                    />
                    <Button
                      size="sm"
                      variant="secondary"
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
        <CardHeader>
          <h2>Fila ({queued.length})</h2>
        </CardHeader>
        {queued.length === 0 ? (
          <p className="admin-queue__muted">Fila vazia.</p>
        ) : (
          <ol className="admin-queue__list">
            {queued.map((r, i) => (
              <li key={r.id} className="admin-queue__line">
                <span className="admin-queue__name">
                  <span className="admin-queue__pos">{i + 1}.</span> {name(r.memberId)}{' '}
                  <Badge variant="comp">{evaluationCriterion(state, r)?.competency}</Badge>
                </span>
                <span className="admin-queue__caption">
                  {r.requeuedAt ? 'Devolvido à frente da fila.' : `Na fila desde ${formatDate(r.createdAt)}.`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
