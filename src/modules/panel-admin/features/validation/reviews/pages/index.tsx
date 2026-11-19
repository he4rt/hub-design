import { useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ValidationRecord } from '@/components/validation/validation-record'
import { useActionRunner } from '@/hooks/use-action-runner'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { REVIEWED_VALIDATIONS } from '@/mocks/validation'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { decideReview } from '../../actions'
import './index.css'

/** The first validations of a new validator, reviewed before they are recorded and become immutable. */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const { run, pending, error, success } = useActionRunner()
  const [note, setNote] = useState('')
  const inReview = state.validations.filter((v) => v.status === 'in-review')

  useDebugActions('Revisões', [{ label: 'Preencher nota de devolução', run: () => setNote('O ponto de melhoria fala da pessoa; reescreva citando o PR.') }])

  return (
    <div className="admin-reviews">
      <div className="admin-reviews__head">
        <PageHeader
          title="Revisões"
          description={`As ${REVIEWED_VALIDATIONS} primeiras validações de cada validador passam por aqui. Quem revisa não é o validador nem o membro.`}
        />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      {inReview.length === 0 ? (
        <Card>
          <p className="admin-reviews__muted">Nenhuma validação esperando revisão.</p>
        </Card>
      ) : (
        <>
          <Callout variant="warning">Registrada, a validação fica imutável no perfil do membro. Só uma contestação gera um novo registro.</Callout>
          <Field id="review-note" label="Nota para o validador" required hint="Obrigatória para devolver.">
            <Input id="review-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {inReview.map((v) => (
            <Card key={v.id}>
              <p className="admin-reviews__muted">Para {state.users.find((u) => u.id === v.memberId)?.name}</p>
              <ValidationRecord validation={v} projectName={state.projects.find((p) => p.id === v.projectId)?.name} />
              <div className="admin-reviews__actions">
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => decideReview(admin?.id ?? '', v.id, 'approved', note), 'Registrada.')}>
                  Registrar validação
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending || note.trim().length < 10}
                  onClick={() => run(() => decideReview(admin?.id ?? '', v.id, 'returned', note), 'Devolvida ao validador.')}
                >
                  Devolver ao validador
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
