import { useActionState, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { evaluationCriterion, needsReview } from '@/mocks/validation'
import { declareConflict, newPoint, recordValidation, saveValidationDraft, type PointRow, type ValidationDraft } from '../actions'
import { PointsEditor } from '../components/points-editor'
import './show.css'
import '@/components/stack-page.css'

type Result = { tone: 'error' | 'success'; text: string } | null

/** Record a validation with the project's goal, criteria and the evidence beside the form. */
export default function Show() {
  const { request: requestId } = useParams()
  const navigate = useNavigate()
  const state = useDb((s) => s)
  const userId = state.session?.userId ?? ''
  const request = state.validationRequests.find((r) => r.id === requestId && r.validatorId === userId && r.status === 'assigned')
  const draft = state.validations.find((v) => v.requestId === requestId && v.status !== 'recorded')
  const toRows = (points: { text: string; evidenceRef: string; suggestion?: string }[] | undefined) =>
    points?.length ? points.map((p) => ({ rowId: crypto.randomUUID(), suggestion: '', ...p })) : [newPoint()]

  const [context, setContext] = useState(draft?.context ?? '')
  const [contribution, setContribution] = useState(draft?.contribution ?? '')
  const [strengths, setStrengths] = useState<PointRow[]>(() => toRows(draft?.strengths))
  const [improvements, setImprovements] = useState<PointRow[]>(() => toRows(draft?.improvements))
  const [conflictDeclared, setConflictDeclared] = useState(draft?.conflictOfInterest.declared ?? false)
  const [conflictDescription, setConflictDescription] = useState(draft?.conflictOfInterest.description ?? '')
  const [insufficientEvidence, setInsufficientEvidence] = useState(draft?.insufficientEvidence ?? false)
  const [blockingConflict, setBlockingConflict] = useState('')

  const current = (): ValidationDraft => ({
    context,
    contribution,
    strengths: strengths.map(({ text, evidenceRef }) => ({ text: text.trim(), evidenceRef: evidenceRef.trim() })),
    improvements: improvements.map(({ text, evidenceRef, suggestion }) => ({ text: text.trim(), evidenceRef: evidenceRef.trim(), suggestion: suggestion.trim() })),
    conflictDeclared,
    conflictDescription,
    insufficientEvidence,
  })

  const [result, submit, pending] = useActionState(async (_: Result, form: FormData): Promise<Result> => {
    try {
      const intent = form.get('intent')
      if (intent === 'draft') {
        await saveValidationDraft(userId, requestId ?? '', current())
        return { tone: 'success', text: 'Rascunho salvo.' }
      }
      if (intent === 'conflict') {
        await declareConflict(userId, requestId ?? '', blockingConflict)
        navigate('/app/validation/queue')
        return null
      }
      const { status } = await recordValidation(userId, requestId ?? '', current())
      if (status === 'recorded') navigate('/app/validation/queue')
      return { tone: 'success', text: 'Enviada para revisão da staff. Ela ainda ocupa um lugar da sua janela.' }
    } catch (e) {
      return { tone: 'error', text: errorMessage(e) }
    }
  }, null)

  useDebugActions('Registrar validação', [
    {
      label: 'Preencher válida',
      run: () => {
        setContext('Entrega do cálculo de frete no projeto Checkout, feita em dupla com o capitão.')
        setContribution('Escreveu o cálculo, o tratamento de CEP inválido e todos os testes do PR.')
        setStrengths([{ ...newPoint(), text: 'Testes cobrem os casos que mais quebram em produção.', evidenceRef: 'loja-checkout#34' }])
        setImprovements([{ ...newPoint(), text: 'Montagem do carrinho repetida em cada teste.', evidenceRef: 'loja-checkout#34', suggestion: 'Usar datasets do Pest.' }])
      },
    },
    {
      label: 'Ponto de melhoria sem evidência (erro esperado)',
      run: () => setImprovements([{ ...newPoint(), text: 'Poderia testar mais.', suggestion: 'Testar a borda.' }]),
    },
    { label: 'Texto ofensivo (moderação)', run: () => setStrengths([{ ...newPoint(), text: 'Não é preguiçoso.', evidenceRef: 'loja-checkout#34' }]) },
  ])

  if (!request) return <NotFound />

  const project = state.projects.find((p) => p.id === request.projectId)
  const deliveries = state.deliveries.filter((d) => request.deliveryIds.includes(d.id))
  const member = state.users.find((u) => u.id === request.memberId)
  const evidence = deliveries.flatMap((d) => d.evidence.map((e) => e.ref))
  const inReview = draft?.status === 'in-review'
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="stack-page">
      <PageHeader
        title={`${member?.name}: ${evaluationCriterion(state, request)?.competency}`}
        description={needsReview(state, userId) ? 'Suas primeiras validações passam por revisão da staff antes do registro.' : undefined}
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/validation/queue">Fila</Link>
          </Button>
        }
      />
      <div className="validation-record-page">
        <div className="stack-page">
          {project && (
            <Card>
              <h2>Projeto {project.name}</h2>
              <ProjectSummary project={project} />
            </Card>
          )}
          <Card>
            <h2>Entregas e contexto do capitão</h2>
            <ul className="stack-page__list">
              {deliveries.map((d) => (
                <li key={d.id}>
                  <span className="stack-page__title">{d.title}</span>
                  <ul className="stack-page__muted">
                    {d.credits.map((c) => (
                      <li key={c.userId}>
                        {name(c.userId)}: {c.part}
                      </li>
                    ))}
                  </ul>
                  <p className="stack-page__quote">{d.context}</p>
                  <p className="stack-page__muted">
                    {d.evidence.map((e, i) => (
                      <span key={e.ref}>
                        {i > 0 && ' · '}
                        <a href={e.url} target="_blank" rel="noreferrer">
                          {e.ref}
                        </a>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          {inReview && <Badge variant="soft">Em revisão da staff</Badge>}
          {draft?.review?.decision === 'returned' && <p className="stack-page__quote">Devolvida pela revisão: {draft.review.note}</p>}
          <form action={submit} className="stack-page">
            <datalist id="validation-evidence">
              {evidence.map((ref) => (
                <option key={ref} value={ref} />
              ))}
            </datalist>
            <fieldset disabled={inReview} className="validation-record-page__fields">
              <Field id="context" label="Contexto">
                <Textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} />
              </Field>
              <Field id="contribution" label="Contribuição observada" hint="O que foi desta pessoa, separado do que foi do time.">
                <Textarea id="contribution" value={contribution} onChange={(e) => setContribution(e.target.value)} />
              </Field>
              <PointsEditor legend="Pontos fortes" rows={strengths} onChange={setStrengths} evidence={evidence} />
              <PointsEditor legend="Pontos de melhoria" rows={improvements} onChange={setImprovements} evidence={evidence} withSuggestion />
              <label className="stack-page__actions">
                <Checkbox checked={insufficientEvidence} onCheckedChange={(c) => setInsufficientEvidence(c === true)} />
                Evidência insuficiente: registre o que faltou como ponto de melhoria
              </label>
              <label className="stack-page__actions">
                <Checkbox checked={conflictDeclared} onCheckedChange={(c) => setConflictDeclared(c === true)} />
                Tenho um conflito que não impede a validação
              </label>
              {conflictDeclared && (
                <Field id="conflict" label="Conflito declarado" hint="Aparece junto da validação.">
                  <Textarea id="conflict" value={conflictDescription} onChange={(e) => setConflictDescription(e.target.value)} />
                </Field>
              )}
            </fieldset>
            <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
            {!inReview && (
              <div className="stack-page__actions">
                <Button type="submit" name="intent" value="record" loading={pending}>
                  Registrar validação
                </Button>
                <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
                  Salvar rascunho
                </Button>
              </div>
            )}
            {!inReview && (
              <details className="validation-record-page__conflict">
                <summary>Tenho um conflito que impede esta validação</summary>
                <Field id="blocking-conflict" label="Descreva o conflito" hint="Só a staff lê. O pedido volta para a frente da fila e não chega mais a você.">
                  <Textarea id="blocking-conflict" value={blockingConflict} onChange={(e) => setBlockingConflict(e.target.value)} />
                </Field>
                <Button type="submit" name="intent" value="conflict" variant="danger" size="sm" disabled={pending || blockingConflict.trim().length < 10}>
                  Devolver por conflito
                </Button>
              </details>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
