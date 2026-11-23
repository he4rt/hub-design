import { useActionState, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { activeMemberships, reservedSeats } from '@/mocks/squads'
import { useSquadPage } from '../../hooks/use-squad-page'
import { endProject, updateProjectSettings } from '../actions'
import '../../components/squad-page.css'
import './edit.css'

type Row = { rowId: string; id: string; text: string; required: boolean }

/** Captain sets the application questions and seats, or ends the project. */
export default function Edit() {
  const { project: projectSlug } = useParams()
  const navigate = useNavigate()
  const { state, userId, squad, manager } = useSquadPage()
  const project = state.projects.find((p) => p.squadId === squad?.id && p.slug === projectSlug)
  const [seats, setSeats] = useState(String(project?.seats ?? 0))
  const [archiveRepository, setArchiveRepository] = useState(false)
  const [rows, setRows] = useState<Row[]>(() =>
    (project?.applicationQuestions ?? []).map((q) => ({ ...q, rowId: crypto.randomUUID() })),
  )
  const ending = useActionRunner()

  const [result, submit, pending] = useActionState(async () => {
    try {
      await updateProjectSettings(userId, project?.id ?? '', {
        seats: Number(seats),
        questions: rows.map(({ id, text, required }) => ({ id, text, required })),
      })
      return { tone: 'success' as const, text: 'Salvo.' }
    } catch (e) {
      return { tone: 'error' as const, text: errorMessage(e) }
    }
  }, null)

  useDebugActions('Perguntas e lugares', [
    { label: 'Lugares abaixo dos membros (erro esperado)', run: () => setSeats('1') },
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
  ])

  if (!squad || !project || !manager) return <NotFound />

  return (
    <div className="squad-page">
      <PageHeader title={`${project.name}: perguntas e lugares`} description={`Squad ${squad.name}.`} />
      <Card>
        <form action={submit} className="project-settings">
          <Field id="seats" label="Lugares" hint={`${activeMemberships(state, project.id).length} membros ativos, você incluído; ${project.reservedSeats ?? reservedSeats(state, project.id)} convites reservados.`}>
            <Input id="seats" type="number" min={1} max={12} value={seats} onChange={(e) => setSeats(e.target.value)} className="project-settings__seats" />
          </Field>
          <CardHeader>
            <h2>Perguntas da candidatura</h2>
          </CardHeader>
          {rows.map((row, i) => (
            <div key={row.rowId} className="project-settings__question">
              <Input
                aria-label={`Pergunta ${i + 1}`}
                value={row.text}
                className="project-settings__input"
                onChange={(e) => setRows(rows.map((r) => (r.rowId === row.rowId ? { ...r, text: e.target.value } : r)))}
              />
              <label className="project-settings__check">
                <Checkbox
                  checked={row.required}
                  onCheckedChange={(c) => setRows(rows.map((r) => (r.rowId === row.rowId ? { ...r, required: c === true } : r)))}
                />
                Obrigatória
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRows(rows.filter((r) => r.rowId !== row.rowId))}>
                Remover
              </Button>
            </div>
          ))}
          <div className="squad-page__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRows([...rows, { rowId: crypto.randomUUID(), id: '', text: '', required: false }])}
            >
              Adicionar pergunta
            </Button>
          </div>
          <FormMessage tone={result?.tone ?? 'success'}>{result?.text}</FormMessage>
          <div className="squad-page__actions">
            <Button type="submit" loading={pending} disabled={project.status !== 'active'}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>
      {project.status === 'active' && (
        <Card>
          <label className="project-settings__check">
            <Checkbox checked={archiveRepository} onCheckedChange={(value) => setArchiveRepository(value === true)} disabled={ending.pending} />
            Arquivar também o repositório no GitHub
          </label>
          <div className="squad-page__row">
            <p className="squad-page__muted">
              Encerrar o projeto deixa o squad inativo, fecha candidaturas e convites pendentes e remove os acessos gerenciados pela integração. O log fica.
            </p>
            <Button
              variant="danger"
              loading={ending.pending}
              onClick={() => ending.run(() => endProject(userId, project.id, { archiveRepository }), () => navigate(`/app/squads/${squad.slug}`))}
            >
              Encerrar projeto
            </Button>
          </div>
          <FormMessage tone="error">{ending.error}</FormMessage>
        </Card>
      )}
    </div>
  )
}
