import { useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ValidationRecord } from '@/components/validation/validation-record'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useDb } from '@/mocks/db'
import { formatDate, isSuperAdmin } from '@/mocks/squads'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { decideContestation, openContestation } from '../../actions'
import '@/components/stack-page.css'

const OUTCOME = { open: 'Aberta', upheld: 'Mantida', corrected: 'Corrigida' } as const

/** Contestations opened by the member or the staff, decided by a super admin from outside the case. */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const { run, pending, error, success } = useActionRunner()
  const [note, setNote] = useState('')
  const superAdmin = isSuperAdmin(admin)
  const sorted = [...state.contestations].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || b.createdAt.localeCompare(a.createdAt))

  useDebugActions('Contestações', [
    {
      label: 'Staff contesta a validação da Ana',
      run: () => run(() => openContestation(admin?.id ?? '', 'v1', 'O ponto de melhoria cita um PR que não é da Ana.')),
    },
    { label: 'Preencher nota da decisão', run: () => setNote('Conferido no PR: a evidência citada é de outra pessoa.') },
  ])

  return (
    <div className="stack-page">
      <PageHeader title="Contestações" description="Corrigir cria um novo registro; o anterior continua visível." />
      <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      {sorted.length === 0 ? (
        <Card>
          <p className="stack-page__muted">Nenhuma contestação.</p>
        </Card>
      ) : (
        <>
          {superAdmin && (
            <Field id="decision-note" label="Nota da decisão">
              <Input id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
          {sorted.map((c) => {
            const v = state.validations.find((x) => x.id === c.validationId)
            const outside = admin?.id !== v?.validatorId && admin?.id !== v?.memberId
            return (
              <Card key={c.id}>
                <div className="stack-page__row">
                  <span className="stack-page__title">
                    {state.users.find((u) => u.id === c.openedBy)?.name} · {formatDate(c.createdAt)}
                  </span>
                  <Badge variant={c.status === 'open' ? 'warning' : 'outline'}>{OUTCOME[c.status]}</Badge>
                </div>
                <p className="stack-page__quote">{c.reason}</p>
                {c.decision && <p className="stack-page__muted">Decisão: {c.decision.note}</p>}
                {v && <ValidationRecord validation={v} />}
                {c.status === 'open' && superAdmin && outside && (
                  <div className="stack-page__actions">
                    <Button size="sm" variant="secondary" disabled={pending || note.trim().length < 10} onClick={() => run(() => decideContestation(admin!.id, c.id, 'upheld', note), 'Mantida.')}>
                      Manter
                    </Button>
                    <Button size="sm" disabled={pending || note.trim().length < 10} onClick={() => run(() => decideContestation(admin!.id, c.id, 'corrected', note), 'Novo pedido na fila para a correção.')}>
                      Corrigir por novo registro
                    </Button>
                  </div>
                )}
                {c.status === 'open' && !superAdmin && <p className="stack-page__muted">Quem decide é um super admin de fora do caso.</p>}
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
