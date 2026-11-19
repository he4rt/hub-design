import { useActionState, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ValidationRecord } from '@/components/validation/validation-record'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { formatDate } from '@/mocks/squads'
import { contestValidation, hasOpenContestation } from '../actions'
import '@/components/stack-page.css'

const OUTCOME = { open: 'Em andamento', upheld: 'Mantida', corrected: 'Corrigida por um novo registro' } as const

/** One validation whole, the records it corrected, and its contestations. */
export default function Show() {
  const { validation: id } = useParams()
  const state = useDb((s) => s)
  const memberId = state.session?.userId
  const validation = state.validations.find((v) => v.id === id && v.memberId === memberId && v.status === 'recorded')
  const [reason, setReason] = useState('')

  const [result, submit, pending] = useActionState(async () => {
    try {
      await contestValidation(memberId ?? '', id ?? '', reason)
      setReason('')
      return { tone: 'success' as const, text: 'Contestação aberta. Alguém de fora do caso decide.' }
    } catch (e) {
      return { tone: 'error' as const, text: errorMessage(e) }
    }
  }, null)

  useDebugActions('Validação', [
    { label: 'Preencher motivo de contestação', run: () => setReason('A entrega citada no ponto de melhoria não é minha, é da Júlia.') },
  ])

  if (!validation) return <NotFound />

  const previous = state.validations.find((v) => v.id === validation.supersedesId)
  const contestations = state.contestations.filter((c) => c.validationId === validation.id)
  const project = state.projects.find((p) => p.id === validation.projectId)

  return (
    <div className="stack-page">
      <PageHeader
        title={validation.competency}
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/validation">Minhas validações</Link>
          </Button>
        }
      />
      <Card>
        <ValidationRecord validation={validation} projectName={project?.name} />
      </Card>
      {previous && (
        <Card>
          <h2>Registro anterior</h2>
          <p className="stack-page__muted">Esta validação corrige a anterior, que continua visível.</p>
          <ValidationRecord validation={previous} projectName={project?.name} />
        </Card>
      )}
      <Card>
        <h2>Contestação</h2>
        {contestations.map((c) => (
          <p key={c.id} className="stack-page__quote">
            {formatDate(c.createdAt)}: {c.reason} · <strong>{OUTCOME[c.status]}</strong>
            {c.decision && ` · ${c.decision.note}`}
          </p>
        ))}
        {hasOpenContestation(state.contestations, validation.id) ? (
          <p className="stack-page__muted">Enquanto a contestação está aberta, a validação publicada mostra "revisão em andamento".</p>
        ) : (
          <form action={submit} className="stack-page">
            <Field id="reason" label="Motivo" hint="Quem decide é alguém de fora do caso, nunca o validador.">
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
            <div className="stack-page__actions">
              <Button type="submit" variant="secondary" loading={pending}>
                Contestar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
