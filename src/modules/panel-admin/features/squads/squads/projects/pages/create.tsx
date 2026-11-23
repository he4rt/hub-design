import { useActionState, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb, type StartingPoint } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { findSquadBySlug, LEVEL_LABELS } from '@/mocks/squads'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { GITHUB_ORG } from '@/lib/github'
import { canCreateProject, createProject } from '../../actions'
import { CaptainField } from '../../components/captain-field'
import './create.css'

type Acceptance = { rowId: string; text: string }
type Evaluation = { rowId: string; competency: string; description: string }

const row = () => crypto.randomUUID()

/** "Novo projeto": the same fields for every project, so the captain and the validator share one yardstick. */
export default function Create() {
  const { squad: slug } = useParams()
  const navigate = useNavigate()
  const admin = useAdmin()
  const squad = useDb((s) => findSquadBySlug(s, slug))
  const captain = useDb((s) => s.users.find((u) => u.id === squad?.captainId))
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [acceptance, setAcceptance] = useState<Acceptance[]>([{ rowId: row(), text: '' }])
  const [evaluation, setEvaluation] = useState<Evaluation[]>([{ rowId: row(), competency: '', description: '' }])
  const [stack, setStack] = useState('')
  const [levels, setLevels] = useState<StartingPoint[]>(['junior'])
  const [seats, setSeats] = useState('5')
  const [captainId, setCaptainId] = useState<string | null>(squad?.captainId ?? null)
  const [repositoryMode, setRepositoryMode] = useState<'create' | 'link'>('create')
  const [repository, setRepository] = useState(`${GITHUB_ORG}/`)
  const repositories = useDb((s) => s.githubSync.repositories)

  const [result, submit, pending] = useActionState(async () => {
    try {
      await createProject(admin?.id ?? '', squad?.id ?? '', {
        name,
        goal,
        acceptanceCriteria: acceptance.map((a) => a.text),
        evaluationCriteria: evaluation.map(({ competency, description }) => ({ competency, description })),
        stack,
        expectedLevel: levels,
        seats: Number(seats),
        captainId: squad?.captainId ?? captainId ?? '',
        repositoryMode,
        repository,
      })
      navigate(`/admin/squads/${squad?.slug}`)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  useDebugActions('Novo projeto', [
    {
      label: 'Preencher válido',
      run: () => {
        setName('Bot de avisos')
        setGoal('Bot que avisa no Discord quando sai validação, entrega ou projeto novo no Hub.')
        setAcceptance([{ rowId: row(), text: 'Aviso chega em até 1 minuto' }, { rowId: row(), text: 'Membro escolhe quais avisos recebe' }])
        setEvaluation([{ rowId: row(), competency: 'Integração com APIs', description: 'Trata falha e limite de requisições.' }])
        setStack('TypeScript, discord.js')
        setSeats('4')
        setCaptainId('u7')
        setRepositoryMode('create')
        setRepository(`${GITHUB_ORG}/hub-bot`)
      },
    },
    { label: 'Sem critério de aceite (erro esperado)', run: () => setAcceptance([{ rowId: row(), text: '' }]) },
    { label: 'Criar repositório que já existe (erro esperado)', run: () => { setRepositoryMode('create'); setRepository(repositories[0] ?? `${GITHUB_ORG}/agenda`) } },
  ])

  if (!squad) return <NotFound />
  if (!canCreateProject(squad.id)) {
    return (
      <div className="project-create">
        <PageHeader title="Novo projeto" description={squad.name} />
        <Card>
          <p className="project-create__muted">Este squad já tem um projeto ativo. Encerre-o antes de encaminhar outro.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="project-create">
      <PageHeader title="Novo projeto" description={`Para o squad ${squad.name}.`} />
      <form action={submit} className="project-create__form">
        <Card>
          <CardHeader>
            <h2>Objetivo</h2>
          </CardHeader>
          <Field id="name" label="Nome do projeto">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="goal" label="Objetivo final" hint="O que existe quando o projeto termina.">
            <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
        </Card>
        <Card>
          <CardHeader>
            <h2>Critérios de aceite</h2>
          </CardHeader>
          <p className="project-create__muted">O capitão aceita as entregas contra estes critérios.</p>
          {acceptance.map((a, i) => (
            <div key={a.rowId} className="project-create__acceptance">
              <Input
                aria-label={`Critério de aceite ${i + 1}`}
                value={a.text}
                onChange={(e) => setAcceptance(acceptance.map((x) => (x.rowId === a.rowId ? { ...x, text: e.target.value } : x)))}
              />
              {acceptance.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAcceptance(acceptance.filter((x) => x.rowId !== a.rowId))}>
                  Remover
                </Button>
              )}
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAcceptance([...acceptance, { rowId: row(), text: '' }])}>
              Adicionar critério
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <h2>Critérios de avaliação</h2>
          </CardHeader>
          <p className="project-create__muted">As competências que o validador avalia. O membro escolhe uma ao pedir validação.</p>
          {evaluation.map((c, i) => (
            <div key={c.rowId} className="project-create__evaluation">
              <Input
                aria-label={`Competência ${i + 1}`}
                placeholder="Competência"
                value={c.competency}
                onChange={(e) => setEvaluation(evaluation.map((x) => (x.rowId === c.rowId ? { ...x, competency: e.target.value } : x)))}
              />
              <Input
                aria-label={`Descrição da competência ${i + 1}`}
                placeholder="O que se espera ver"
                value={c.description}
                onChange={(e) => setEvaluation(evaluation.map((x) => (x.rowId === c.rowId ? { ...x, description: e.target.value } : x)))}
              />
              {evaluation.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEvaluation(evaluation.filter((x) => x.rowId !== c.rowId))}>
                  Remover
                </Button>
              )}
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEvaluation([...evaluation, { rowId: row(), competency: '', description: '' }])}
            >
              Adicionar competência
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <h2>Time</h2>
          </CardHeader>
          <Field id="stack" label="Stack" hint="Separe por vírgula.">
            <Input id="stack" value={stack} onChange={(e) => setStack(e.target.value)} />
          </Field>
          <Field id="levels" label="Nível esperado">
            <ToggleGroup id="levels" type="multiple" variant="chips" value={levels} onValueChange={(v) => setLevels(v as StartingPoint[])}>
              {(['beginner', 'junior', 'mid', 'senior'] as const).map((l) => (
                <ToggleGroupItem key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field id="seats" label="Lugares" hint="Contam todos os membros, o capitão incluído.">
            <Input id="seats" type="number" min={2} max={12} className="project-create__seats" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </Field>
          {squad.captainId ? (
            <p className="project-create__muted">Capitão: {captain?.name}. Para trocar, use a gestão do squad com motivo registrado.</p>
          ) : (
            <CaptainField value={captainId} onChange={setCaptainId} />
          )}
        </Card>
        <Card>
          <CardHeader>
            <h2>Repositório</h2>
          </CardHeader>
          <Callout>O GitHub App cria o repositório e o board, com o objetivo e os critérios no README.</Callout>
          <ToggleGroup type="single" value={repositoryMode} aria-label="Repositório" onValueChange={(v) => v && setRepositoryMode(v as 'create' | 'link')}>
            <ToggleGroupItem value="create">Criar do template</ToggleGroupItem>
            <ToggleGroupItem value="link">Vincular existente</ToggleGroupItem>
          </ToggleGroup>
          <Field
            id="repository"
            label="Repositório na organização"
            hint={repositoryMode === 'create' ? <>Criado a partir de <code>{GITHUB_ORG}/template-squad</code>.</> : 'Um repositório que a He4rt já tem.'}
          >
            <Input id="repository" className="project-create__repository" list="org-repositories" value={repository} onChange={(e) => setRepository(e.target.value)} />
          </Field>
          <datalist id="org-repositories">
            {repositories.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Card>
        <FormMessage tone="error">{result}</FormMessage>
        <div>
          <Button type="submit" loading={pending}>
            Criar projeto
          </Button>
        </div>
      </form>
    </div>
  )
}
