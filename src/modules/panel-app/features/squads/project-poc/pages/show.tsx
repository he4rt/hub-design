import { Lock, Plus, X } from 'lucide-react'
import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { SquadCrest } from '@/modules/panel-app/components/squad-crest'
import '../../squads/components/squad-page.css'
import './show.css'

/*
 * Design POC: the captain creates the squad's next project (H4, H5, H7). Local state only: no action, no
 * store. Not meant to be committed.
 */

const ROLES = ['Back-end', 'Front-end', 'Full-stack', 'Mobile'] as const
type Role = (typeof ROLES)[number]
type Seat = { rowId: string; role: Role; who: string | null }
type Text = { rowId: string; text: string }

const row = () => crypto.randomUUID()

const MODELS: { id: string; label: string; description: string; roles: Role[] }[] = [
  { id: 'previous', label: 'Igual ao Checkout', description: 'Os lugares do projeto anterior. Quem continua no squad fica no mesmo lugar.', roles: ['Back-end', 'Back-end', 'Front-end', 'Front-end'] },
  { id: 'pair', label: 'Dupla', description: 'Você e mais uma pessoa. Uma correção, uma lib pequena ou um estudo em par.', roles: ['Full-stack'] },
  { id: 'trio', label: 'Trio', description: 'Uma feature de ponta a ponta.', roles: ['Back-end', 'Front-end'] },
  { id: 'quintet', label: 'Quinteto', description: 'Um produto pequeno.', roles: ['Back-end', 'Back-end', 'Front-end', 'Front-end'] },
  { id: 'large', label: 'Grande', description: 'Frentes em paralelo. Exige mais de você para acompanhar todo mundo.', roles: ['Back-end', 'Back-end', 'Back-end', 'Front-end', 'Front-end', 'Full-stack'] },
]

/** Bruno and Carla stay in the squad: they keep a Back-end seat in the next project. */
const STAYING = ['Bruno Lima', 'Carla Mendes']

function seatsOf(modelId: string): Seat[] {
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0]
  const staying = [...STAYING]
  return model.roles.map((role) => ({ rowId: row(), role, who: role === 'Back-end' ? (staying.shift() ?? null) : null }))
}

const CRITERIA: Record<Role, string> = {
  'Back-end': 'Modela regra de negócio com teste em Pest',
  'Front-end': 'Monta telas em Livewire a partir do design',
  'Full-stack': 'Entrega uma feature da API à tela, com teste nas duas pontas',
  Mobile: 'Testa as telas em Android e iOS',
}

export default function Show() {
  const [name, setName] = useState('Catálogo')
  const [goal, setGoal] = useState('Catálogo da loja com busca, filtros e página de produto.')
  const [acceptance, setAcceptance] = useState<Text[]>([
    { rowId: row(), text: 'Busca devolve resultado em até 300 ms com 5 mil produtos' },
    { rowId: row(), text: 'Filtros por categoria e preço ficam na URL' },
  ])
  const [evaluation, setEvaluation] = useState<Text[]>([{ rowId: row(), text: 'Testes automatizados' }])
  const [model, setModel] = useState('previous')
  const [seats, setSeats] = useState<Seat[]>(() => seatsOf('previous'))
  const [roleCriteria, setRoleCriteria] = useState<Record<Role, Text[]>>(() => Object.fromEntries(ROLES.map((r) => [r, [{ rowId: row(), text: '' }]])) as Record<Role, Text[]>)
  const [repository, setRepository] = useState<'create' | 'link'>('create')

  const roles = [...new Set(seats.map((s) => s.role))]
  const free = seats.filter((s) => !s.who)
  const missing = [
    !name.trim() && 'o nome',
    !goal.trim() && 'o objetivo',
    !acceptance.some((a) => a.text.trim()) && 'um critério de aceite',
    !evaluation.some((e) => e.text.trim()) && 'um critério de avaliação',
    free.length === 0 && 'um lugar livre',
    ...[...new Set(free.map((s) => s.role))].filter((r) => !roleCriteria[r].some((c) => c.text.trim())).map((r) => `um critério de ${r}`),
  ].filter(Boolean) as string[]

  const [result, create, pending] = useActionState(async (): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    return `Projeto ${name.trim()} criado. O GitHub App está criando he4rt/loja-${slug(name)}, e as candidaturas abrem quando o repositório estiver pronto.`
  }, '')

  const pickModel = (id: string) => {
    setModel(id)
    setSeats(seatsOf(id))
  }

  useDebugActions('POC: capitão cria o projeto', [
    { label: 'Começar do zero (Trio)', run: () => pickModel('trio') },
    { label: 'Projeto grande', run: () => pickModel('large') },
    { label: 'Sem critério de avaliação (erro esperado)', run: () => setEvaluation([]) },
    { label: 'Nome longo', run: () => setName('Catálogo com busca, filtros, comparação de produtos e recomendações da comunidade') },
  ])

  return (
    <div className="squad-page project-poc">
      <PageHeader
        title="Novo projeto"
        description="Você cria e organiza o projeto do seu squad. O Hub só pede objetivo, um critério de aceite e um de avaliação."
        parent={{ to: '/app/squads', label: 'Loja Comunitária' }}
      />
      <Callout icon={<SquadCrest crest={{ shape: 'shield', symbol: 'bolt', color: 3 }} size="sm" />}>
        O Checkout foi encerrado. Um squad tem um projeto ativo por vez, então este é o próximo da Loja Comunitária.
      </Callout>

      <form action={create} className="project-poc__form">
        <Card>
          <CardHeader>
            <h2>O projeto</h2>
          </CardHeader>
          <Field id="name" label="Nome">
            <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="goal" label="Objetivo final" required>
            <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <Field id="stack" label="Stack">
            <Input id="stack" defaultValue="Laravel, Livewire, Pest" />
          </Field>
        </Card>

        <Card>
          <CardHeader>
            <h2>Critérios</h2>
          </CardHeader>
          <p className="squad-page__muted">Você aceita as entregas pelos critérios de aceite. Os de avaliação viram as competências que o validador avalia.</p>
          <TextList id="acceptance" label="Critérios de aceite" add="Adicionar critério de aceite" placeholder="Ex.: o carrinho mantém os itens depois do login" items={acceptance} onChange={setAcceptance} />
          <TextList id="evaluation" label="Critérios de avaliação" add="Adicionar competência" placeholder="Ex.: Modelagem de dados" items={evaluation} onChange={setEvaluation} />
        </Card>

        <Card>
          <CardHeader>
            <h2>Lugares</h2>
            <span className="squad-page__muted">
              <span className="project-poc__num">{seats.length + 1}</span> lugares, <span className="project-poc__num">{free.length}</span> livres
            </span>
          </CardHeader>
          <Field id="model" label="Comece de um modelo" hint="O modelo só preenche os lugares. Depois você troca as funções e a quantidade como quiser.">
            <RadioCards id="model" value={model} onValueChange={pickModel} className="project-poc__models">
              {MODELS.map((m) => (
                <RadioCard key={m.id} value={m.id} label={`${m.label}, ${m.roles.length + 1} lugares`} description={m.description} />
              ))}
            </RadioCards>
          </Field>

          <ul className="project-poc__seats" aria-label="Lugares do projeto">
            <li className="project-poc__seat">
              <span className="project-poc__who">
                <Avatar src={null} name="Rafael Costa" size="sm" />
                <span className="project-poc__who-text">
                  <span className="squad-page__name">Capitão</span>
                  <span className="squad-page__muted">Rafael Costa, você</span>
                </span>
              </span>
              <span className="squad-page__muted project-poc__fixed">
                <Lock size={14} aria-hidden /> Fixo
              </span>
            </li>
            {seats.map((seat, i) => (
              <li key={seat.rowId} className="project-poc__seat" data-free={!seat.who || undefined}>
                <span className="project-poc__who">
                  {seat.who ? <Avatar src={null} name={seat.who} size="sm" /> : <span className="project-poc__empty" aria-hidden />}
                  <span className="project-poc__who-text">
                    <span className="squad-page__name">Lugar {i + 2}</span>
                    <span className="squad-page__muted">{seat.who ? `${seat.who} continua` : 'Livre para candidaturas'}</span>
                  </span>
                </span>
                <ToggleGroup
                  type="single"
                  aria-label={`Função do lugar ${i + 2}`}
                  value={seat.role}
                  disabled={!!seat.who}
                  onValueChange={(v) => v && setSeats((prev) => prev.map((s) => (s.rowId === seat.rowId ? { ...s, role: v as Role } : s)))}
                >
                  {ROLES.map((r) => (
                    <ToggleGroupItem key={r} value={r}>
                      {r}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover o lugar ${i + 2}`}
                  title={seat.who ? 'Quem continua no squad não perde o lugar' : 'Remover o lugar'}
                  disabled={!!seat.who}
                  onClick={() => setSeats((prev) => prev.filter((s) => s.rowId !== seat.rowId))}
                >
                  <X size={16} aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="squad-page__actions">
            <Button type="button" variant="secondary" size="sm" disabled={seats.length >= 11} onClick={() => setSeats((prev) => [...prev, { rowId: row(), role: 'Back-end', who: null }])}>
              <Plus size={16} aria-hidden /> Adicionar lugar
            </Button>
            <span className="squad-page__muted">Funções da v1: só desenvolvimento.</span>
          </div>

          <div className="project-poc__criteria">
            <h3>Critérios de cada função</h3>
            <p className="squad-page__muted">Um critério por linha, que dê para conferir num PR ou numa resposta. Você confere cada um na candidatura, nunca uma pessoa contra outra.</p>
            {roles.map((r) => (
              <TextList
                key={r}
                id={`criteria-${r}`}
                label={r}
                add={`Adicionar critério de ${r}`}
                placeholder={`Ex.: ${CRITERIA[r]}`}
                items={roleCriteria[r]}
                onChange={(items) => setRoleCriteria((prev) => ({ ...prev, [r]: items }))}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h2>Perguntas da candidatura</h2>
          </CardHeader>
          <p className="squad-page__muted">Todo mundo que se candidata à mesma função responde às mesmas perguntas.</p>
          <Field id="q1" label="Pergunta 1">
            <Input id="q1" placeholder="Ex.: Conte uma tela ou API que você montou e como testou." />
          </Field>
          <Field id="q2" label="Pergunta 2" hint="Opcional">
            <Input id="q2" placeholder="Ex.: Quantas horas por semana você tem para o squad?" />
          </Field>
        </Card>

        <Card>
          <CardHeader>
            <h2>Repositório</h2>
          </CardHeader>
          <RadioCards value={repository} onValueChange={(v) => setRepository(v as 'create' | 'link')} aria-label="Repositório">
            <RadioCard value="create" label="Criar a partir do template" description={<span className="project-poc__mono">he4rt/loja-{slug(name) || 'projeto'}</span>} />
            <RadioCard value="link" label="Vincular um repositório da He4rt" description="Para continuar um código que já existe na organização." />
          </RadioCards>
        </Card>

        <div className="project-poc__submit">
          <FormMessage tone={result ? 'success' : 'error'}>{result || (missing.length ? `Falta ${list(missing)}.` : '')}</FormMessage>
          <div className="squad-page__actions">
            <Button type="submit" loading={pending} disabled={missing.length > 0 || !!result}>
              Criar projeto
            </Button>
            <Badge variant="neutral">Entra direto, sem conferência da staff</Badge>
          </div>
        </div>
      </form>
    </div>
  )
}

function TextList({
  id,
  label,
  add,
  placeholder,
  items,
  onChange,
}: {
  id: string
  label: string
  add: string
  placeholder: string
  items: Text[]
  onChange: (items: Text[]) => void
}) {
  return (
    <fieldset className="project-poc__list">
      <legend>{label}</legend>
      {items.map((item, i) => (
        <div key={item.rowId} className="project-poc__list-row">
          <Input
            id={`${id}-${i}`}
            aria-label={`${label} ${i + 1}`}
            placeholder={placeholder}
            value={item.text}
            onChange={(e) => onChange(items.map((x) => (x.rowId === item.rowId ? { ...x, text: e.target.value } : x)))}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((x) => x.rowId !== item.rowId))}>
            <X size={16} aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...items, { rowId: row(), text: '' }])}>
          <Plus size={16} aria-hidden /> {add}
        </Button>
      </div>
    </fieldset>
  )
}

function slug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function list(items: string[]) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items[0]
}
