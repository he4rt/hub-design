import { useActionState, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { errorMessage, MockError } from '@/mocks/mock-action'
import { applyBlocker, findSquadBySlug } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { applyToProject } from '../actions'
import '@/components/stack-page.css'

type Result = { ok: false; error: string; field?: string } | null

/** Application form: the captain's questions for this project. */
export default function Create() {
  const { squad: squadSlug, project: projectSlug } = useParams()
  const navigate = useNavigate()
  const account = useAccount()
  const state = useDb((s) => s)
  const squad = findSquadBySlug(state, squadSlug)
  const project = state.projects.find((p) => p.squadId === squad?.id && p.slug === projectSlug)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await applyToProject(
        account?.id ?? '',
        project?.id ?? '',
        Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      )
      navigate('/app/squads/applications')
      return null
    } catch (e) {
      return { ok: false, error: errorMessage(e), field: e instanceof MockError ? e.field : undefined }
    }
  }, null)

  useDebugActions('Candidatura', [
    {
      label: 'Preencher respostas válidas',
      run: () =>
        setAnswers({
          q1: 'Quero praticar testes automatizados e revisão de código num time de verdade.',
          q2: 'Escrevi testes com PHPUnit num projeto pessoal de controle de gastos.',
          q3: '10 horas',
        }),
    },
    { label: 'Responder curto (erro esperado)', run: () => setAnswers({ q1: 'Testes', q2: 'Não' }) },
    {
      label: 'Lotar os lugares (erro esperado)',
      run: () => db.set((s) => ({ ...s, projects: s.projects.map((p) => (p.id === project?.id ? { ...p, seats: 0 } : p)) })),
    },
    { label: 'Entrar como Letícia (teste aprovado)', run: () => db.set((s) => ({ ...s, session: { userId: 'u10' } })) },
    { label: 'Entrar como Gustavo (sem teste)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
  ])

  if (!squad || !project || !account) return <NotFound />

  const blocker = applyBlocker(state, account.id, project)

  return (
    <div className="stack-page">
      <PageHeader title={`Candidatura: ${project.name}`} description={`Squad ${squad.name}. O capitão responde a todas.`} />
      <Card>
        <ProjectSummary project={project} />
      </Card>
      <Card>
        {blocker && !pending ? (
          <div className="stack-page__row">
            <p>{blocker}</p>
            <Button asChild variant="secondary">
              <Link to={blocker.includes('teste') ? '/app/squads/entry-test' : '/app/squads/applications'}>
                {blocker.includes('teste') ? 'Ir para o teste de entrada' : 'Ver minhas candidaturas'}
              </Link>
            </Button>
          </div>
        ) : (
          <form action={submit} className="stack-page">
            {project.applicationQuestions.map((q) => (
              <Field key={q.id} id={q.id} label={q.text} hint={q.required ? undefined : 'Opcional'}>
                <Textarea
                  id={q.id}
                  required={q.required}
                  value={answers[q.id] ?? ''}
                  aria-invalid={result?.field === q.id || undefined}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              </Field>
            ))}
            <FormMessage tone="error">{result?.error}</FormMessage>
            <div className="stack-page__actions">
              <Button type="submit" loading={pending}>
                Enviar candidatura
              </Button>
              <Button asChild variant="ghost">
                <Link to={`/squads/${squad.slug}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
