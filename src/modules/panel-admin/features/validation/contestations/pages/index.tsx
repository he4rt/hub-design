import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ValidationRecord } from '@/components/validation/validation-record'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate, isSuperAdmin } from '@/mocks/squads'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { decideContestation, openContestation } from '../../actions'
import './index.css'

/** Contestations opened by the member or the staff, decided by a super admin from outside the case. */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const { run, pending, error, success } = useActionRunner()
  const [note, setNote] = useState('')
  const [validationId, setValidationId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const available = state.validations.filter((v) => v.status === 'recorded' && !state.contestations.some((c) => c.validationId === v.id && c.status === 'open'))
  const [result, submit, opening] = useActionState(async () => {
    try {
      await openContestation(admin?.id ?? '', validationId ?? '', reason)
      setValidationId(null)
      setReason('')
      return { tone: 'success' as const, text: 'Contestação aberta.' }
    } catch (e) {
      return { tone: 'error' as const, text: errorMessage(e) }
    }
  }, null)
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
    <div className="admin-contestations">
      <div className="admin-contestations__head">
        <PageHeader title="Contestações" description="Corrigir cria um novo registro; o anterior continua visível." />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      <Card>
        <CardHeader><h2>Abrir contestação</h2></CardHeader>
        <form action={submit} className="admin-contestations__form">
          <Field id="contested-validation" label="Validação" required>
            <Combobox
              id="contested-validation"
              options={available.map((v) => ({ value: v.id, label: `${state.users.find((u) => u.id === v.memberId)?.name ?? 'Membro'}: ${v.competency}, ${formatDate(v.recordedAt)} (${v.id})` }))}
              value={validationId}
              onValueChange={setValidationId}
              disabled={opening || pending}
              emptyText="Nenhuma validação registrada sem contestação aberta."
            />
          </Field>
          <Field id="contestation-reason" label="Motivo" required hint="Explique em ao menos 20 caracteres. Não altera o registro nem sua publicação.">
            <Textarea id="contestation-reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={opening || pending} />
          </Field>
          <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
          <div className="admin-contestations__actions">
            <Button type="submit" loading={opening} disabled={pending || !available.some((v) => v.id === validationId) || reason.trim().length < 20}>Abrir contestação</Button>
          </div>
        </form>
      </Card>
      {sorted.length === 0 ? (
        <Card>
          <p className="admin-contestations__muted">Nenhuma contestação.</p>
        </Card>
      ) : (
        <>
          {superAdmin && (
            <Field id="decision-note" label="Nota da decisão" required hint="O membro e o validador leem esta nota.">
              <Input id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
          {sorted.map((c) => {
            const v = state.validations.find((x) => x.id === c.validationId)
            const outside = admin?.id !== v?.validatorId && admin?.id !== v?.memberId
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="admin-contestations__who">
                    <h2 className="admin-contestations__title">Contestação de {state.users.find((u) => u.id === c.openedBy)?.name}</h2>
                    <span className="admin-contestations__caption">Aberta em {formatDate(c.createdAt)}.</span>
                  </div>
                  <StateChip entity="contestation" state={c.status} />
                </CardHeader>
                <p className="admin-contestations__quote">{c.reason}</p>
                {c.decision && <p className="admin-contestations__muted">Decisão: {c.decision.note}</p>}
                {v && <ValidationRecord validation={v} />}
                {c.status === 'open' && superAdmin && outside && (
                  <div className="admin-contestations__actions">
                    <Button size="sm" variant="secondary" disabled={pending || note.trim().length < 10} onClick={() => run(() => decideContestation(admin!.id, c.id, 'upheld', note), 'Mantida.')}>
                      Manter
                    </Button>
                    <Button size="sm" variant="secondary" disabled={pending || note.trim().length < 10} onClick={() => run(() => decideContestation(admin!.id, c.id, 'corrected', note), 'Novo pedido na fila para a correção.')}>
                      Corrigir por novo registro
                    </Button>
                  </div>
                )}
                {c.status === 'open' && !superAdmin && <p className="admin-contestations__muted">Quem decide é um super admin de fora do caso.</p>}
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
