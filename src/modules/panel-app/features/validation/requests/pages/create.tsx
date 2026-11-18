import { useActionState, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { MEMBER_OPEN_REQUESTS } from '@/mocks/validation'
import { openRequests, requestValidation, validatableDeliveries } from '../actions'
import './create.css'
import '@/components/stack-page.css'

/** "Pedir validação": accepted deliveries of one project and one competency from its evaluation criteria. */
export default function Create() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const state = useDb((s) => s)
  const memberId = state.session?.userId ?? ''
  const squad = state.squadTeams.find((s) => s.slug === params.get('squad'))
  const deliveries = validatableDeliveries(state, memberId).filter(
    (d) => !squad || state.teamProjects.find((p) => p.id === d.projectId)?.squadId === squad.id,
  )
  const [selected, setSelected] = useState<string[]>([])
  const [criterionId, setCriterionId] = useState('')
  const project = state.teamProjects.find((p) => p.id === deliveries.find((d) => selected.includes(d.id))?.projectId)
  const blocked = openRequests(state, memberId).length >= MEMBER_OPEN_REQUESTS

  const [result, submit, pending] = useActionState(async () => {
    try {
      await requestValidation(memberId, { deliveryIds: selected, criterionId })
      navigate('/app/validation')
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  useDebugActions('Pedir validação', [
    {
      label: 'Preencher pedido válido',
      run: () => {
        setSelected(deliveries.slice(0, 1).map((d) => d.id))
        setCriterionId(state.teamProjects.find((p) => p.id === deliveries[0]?.projectId)?.evaluationCriteria[0]?.id ?? '')
      },
    },
    { label: 'Entrar como Ana (entrega aceita)', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
    { label: 'Entrar como Gustavo (sem entregas)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader
        title="Pedir validação"
        description="Uma pessoa de fora do squad, já no mercado, registra o que viu no seu trabalho. Não há prazo prometido."
      />
      <Card>
        {deliveries.length === 0 ? (
          <p className="stack-page__muted">Você ainda não tem entregas aceitas. Elas aparecem aqui quando o capitão aceita.</p>
        ) : blocked ? (
          <div className="stack-page__row">
            <p>Você já tem {MEMBER_OPEN_REQUESTS} pedidos abertos. Espere um ser registrado para pedir outro.</p>
            <Button asChild variant="secondary">
              <Link to="/app/validation">Minhas validações</Link>
            </Button>
          </div>
        ) : (
          <form action={submit} className="stack-page">
            <fieldset className="validation-request__group">
              <legend>Entregas</legend>
              {deliveries.map((d) => {
                const otherProject = project && d.projectId !== project.id
                return (
                  <label key={d.id} className="validation-request__option" data-disabled={otherProject || undefined}>
                    <Checkbox
                      checked={selected.includes(d.id)}
                      disabled={otherProject}
                      onCheckedChange={(c) => {
                        const next = c === true ? [...selected, d.id] : selected.filter((id) => id !== d.id)
                        setSelected(next)
                        if (next.length === 0) setCriterionId('')
                      }}
                    />
                    <span>
                      {d.title}
                      <span className="stack-page__muted"> · {state.teamProjects.find((p) => p.id === d.projectId)?.name}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            <fieldset className="validation-request__group">
              <legend>Competência</legend>
              {project ? (
                <RadioCards value={criterionId} onValueChange={setCriterionId} aria-label="Competência">
                  {project.evaluationCriteria.map((c) => (
                    <RadioCard key={c.id} value={c.id} label={c.competency} description={c.description} />
                  ))}
                </RadioCards>
              ) : (
                <p className="stack-page__muted">Escolha uma entrega para ver as competências do projeto.</p>
              )}
            </fieldset>
            <FormMessage tone="error">{result}</FormMessage>
            <div className="stack-page__actions">
              <Button type="submit" loading={pending} disabled={selected.length === 0 || !criterionId}>
                Entrar na fila
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
