import { Clock, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Field } from '@/components/field'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { SquadCrest } from '@/modules/panel-app/components/squad-crest'
import type { Crest } from '@/modules/panel-app/lib/squad-crest'
import { type Check, CriteriaFeedback, CriteriaReview } from '../components/criteria-review'
import '../../squads/components/squad-page.css'
import './show.css'

/*
 * Design POC of the admission by role (docs: "Squads: dores, hipóteses e POCs"). Local state only: no
 * action, no store. Not meant to be committed.
 */

type Role = 'Back-end' | 'Front-end'
type Stage = 'none' | 'pending' | 'waitlisted' | 'indicated' | 'offered' | 'joined' | 'declined'
type Other = 'pending' | 'closed' | 'withdrawn'
type State = { stage: Stage; other: Other; role: Role; second: Role | null; full: boolean; expired: boolean; checks: Check[] }

const initial: State = { stage: 'none', other: 'pending', role: 'Front-end', second: 'Back-end', full: false, expired: false, checks: [] }

const SEATS: { id: string; role: string; who: string | null }[] = [
  { id: 's1', role: 'Capitão', who: 'Rafael Costa' },
  { id: 's2', role: 'Back-end', who: 'Bruno Lima' },
  { id: 's3', role: 'Back-end', who: 'Carla Mendes' },
  { id: 's4', role: 'Front-end', who: null },
  { id: 's5', role: 'Front-end', who: null },
]

const CRITERIA: Record<Role, string[]> = {
  'Front-end': ['Monta telas em Livewire a partir do design', 'Escreve teste de componente', 'Explica as escolhas no PR'],
  'Back-end': ['Modela regra de negócio com teste em Pest', 'Revisa o PR de outra pessoa'],
}

const CHIP: Record<Stage, [family: 'success' | 'warning' | 'info' | 'neutral', label: string] | null> = {
  none: null,
  pending: ['warning', 'Pendente'],
  waitlisted: ['neutral', 'Na lista de espera'],
  indicated: ['neutral', 'Na lista de espera'],
  offered: ['info', 'Lugar reservado'],
  joined: ['success', 'No squad'],
  declined: ['neutral', 'Ainda não atende'],
}

const DEADLINE = '28/11'
const LOJA: Crest = { shape: 'shield', symbol: 'bolt', color: 3 }
const AGENDA: Crest = { shape: 'hexagon', symbol: 'compass', color: 1 }

export default function Show() {
  const [s, setS] = useState(initial)
  const [tab, setTab] = useState('project')
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }))

  useDebugActions('POC: admissão por função', [
    { label: 'Recomeçar', run: () => (setS(initial), setTab('project')) },
    { label: 'Lotar o Front-end', run: () => set({ full: true }) },
    { label: 'Abrir um lugar de Front-end', run: () => setS((p) => ({ ...p, full: false, stage: p.stage === 'waitlisted' ? 'indicated' : p.stage })) },
    { label: 'Candidatura enviada', run: () => (set({ stage: 'pending' }), setTab('captain')) },
    {
      label: 'Ainda não atende, com retorno por critério',
      run: () => (
        set({
          stage: 'declined',
          role: 'Front-end',
          checks: [
            { criterion: CRITERIA['Front-end'][0], verdict: 'meets', source: 'repository', note: '' },
            { criterion: CRITERIA['Front-end'][1], verdict: 'meets', source: 'answer', note: '' },
            { criterion: CRITERIA['Front-end'][2], verdict: 'not-yet', source: null, note: 'Descreva no PR por que escolheu cada componente e o que ficou de fora.' },
          ],
        }),
        setTab('member')
      ),
    },
    { label: 'Na lista de espera', run: () => (set({ stage: 'waitlisted', full: true }), setTab('member')) },
    { label: 'Lugar reservado (3 dias)', run: () => (set({ stage: 'offered', expired: false }), setTab('member')) },
    { label: 'Passar 3 dias sem confirmar', run: () => (set({ stage: 'waitlisted', expired: true }), setTab('member')) },
    { label: 'Confirmou a entrada', run: () => (setS((p) => ({ ...p, stage: 'joined', other: p.other === 'pending' ? 'closed' : p.other })), setTab('member')) },
  ])

  return (
    <div className="squad-page admission-poc">
      <PageHeader title="POC: admissão por função" description="Como ficariam as telas da candidatura. Dados de exemplo; nada é gravado." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="segmented" aria-label="Tela">
          <TabsTrigger value="project">Projeto</TabsTrigger>
          <TabsTrigger value="apply">Candidatura</TabsTrigger>
          <TabsTrigger value="captain">Capitão</TabsTrigger>
          <TabsTrigger value="member">Membro</TabsTrigger>
        </TabsList>
        <TabsContent value="project" className="admission-poc__screen">
          <ProjectScreen s={s} onApply={() => setTab('apply')} />
        </TabsContent>
        <TabsContent value="apply" className="admission-poc__screen">
          <ApplyScreen s={s} set={set} onSent={() => (set({ stage: 'pending' }), setTab('captain'))} />
        </TabsContent>
        <TabsContent value="captain" className="admission-poc__screen">
          <CaptainScreen s={s} set={set} />
        </TabsContent>
        <TabsContent value="member" className="admission-poc__screen">
          <MemberScreen s={s} set={set} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StageChip({ stage }: { stage: Stage }) {
  const chip = CHIP[stage]
  return chip ? <Badge variant={chip[0]}>{chip[1]}</Badge> : null
}

function ProjectScreen({ s, onApply }: { s: State; onApply: () => void }) {
  const freeFront = s.full ? 0 : 2
  return (
    <>
      <Card>
        <CardHeader>
          <span className="admission-poc__person">
            <SquadCrest crest={LOJA} size="md" />
            <h2>Loja Comunitária</h2>
          </span>
          <StageChip stage={s.stage} />
        </CardHeader>
        <p className="squad-page__muted">Projeto Checkout. Capitão Rafael Costa. Laravel, Livewire e Pest.</p>
        <h3 className="admission-poc__subtitle">Lugares do projeto</h3>
        <ul className="admission-poc__seats">
          {SEATS.map((seat) => {
            const free = !seat.who && !s.full
            return (
              <li key={seat.id} className="admission-poc__seat" data-free={free || undefined}>
                {seat.who ? <Avatar src={null} name={seat.who} size="sm" /> : <span className="admission-poc__seat-empty" aria-hidden />}
                <span className="admission-poc__seat-text">
                  <span className="squad-page__name">{seat.role}</span>
                  <span className="squad-page__muted">{seat.who ?? (s.full ? 'Ocupado' : 'Lugar livre')}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="squad-page__row">
          <p className="squad-page__muted">
            {freeFront ? (
              <>
                <span className="admission-poc__num">{freeFront}</span> lugares livres de Front-end.
              </>
            ) : (
              'Sem lugar livre agora. Quem atende aos critérios entra na lista de espera.'
            )}
          </p>
          <Button onClick={onApply} disabled={s.stage !== 'none'}>
            Candidatar-se
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <h2>Critérios por função</h2>
        </CardHeader>
        <p className="squad-page__muted">Publicados antes. O capitão avalia cada candidatura contra eles, nunca uma pessoa contra outra.</p>
        <div className="admission-poc__criteria">
          {(Object.keys(CRITERIA) as Role[]).map((role) => (
            <Card key={role} variant="inset">
              <span className="squad-page__name">{role}</span>
              <ul className="admission-poc__bullets">
                {CRITERIA[role].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Card>
    </>
  )
}

function ApplyScreen({ s, set, onSent }: { s: State; set: (p: Partial<State>) => void; onSent: () => void }) {
  const other: Role = s.role === 'Front-end' ? 'Back-end' : 'Front-end'
  const seatHint = (role: Role) => (role === 'Front-end' && !s.full ? '2 lugares livres' : 'Sem lugar agora: lista de espera')
  const roles = [s.role, s.second].filter((r): r is Role => r !== null)
  return (
    <>
      <Callout icon={<ShieldCheck size={16} aria-hidden />}>
        Você pode ter várias candidaturas enquanto está fora de squad. Ao confirmar a entrada num squad, as outras se encerram, sem contar
        como recusa.
      </Callout>
      <Card>
        <CardHeader>
          <h2>Candidatura ao Checkout</h2>
        </CardHeader>
        <Field id="role" label="Função principal">
          <RadioCards id="role" value={s.role} onValueChange={(v) => set({ role: v as Role, second: s.second === v ? null : s.second })}>
            <RadioCard value="Front-end" label="Front-end" description={seatHint('Front-end')} />
            <RadioCard value="Back-end" label="Back-end" description={seatHint('Back-end')} />
          </RadioCards>
        </Field>
        <Field id="second" label="Segunda opção" hint="Opcional. Se a principal não tiver lugar, você entra também nesta fila.">
          <RadioCards id="second" value={s.second ?? 'none'} onValueChange={(v) => set({ second: v === 'none' ? null : (v as Role) })}>
            <RadioCard value="none" label="Nenhuma" />
            <RadioCard value={other} label={other} description={seatHint(other)} />
          </RadioCards>
        </Field>
        {roles.map((role) => (
          <Card key={role} variant="inset">
            <span className="squad-page__name">Critérios de {role}</span>
            <ul className="admission-poc__bullets">
              {CRITERIA[role].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        ))}
        <Field id="q1" label="Conte uma tela que você montou e como testou">
          <Textarea id="q1" defaultValue="Montei o carrinho da loja da Basement em Livewire, com teste de componente para o cupom inválido." />
        </Field>
        <div className="squad-page__actions">
          <Button onClick={onSent} disabled={s.stage !== 'none'}>
            Enviar candidatura
          </Button>
          <span className="squad-page__muted">{s.stage !== 'none' ? 'Candidatura enviada.' : ''}</span>
        </div>
      </Card>
    </>
  )
}

function CaptainScreen({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const functionLine = `${s.role}${s.second ? `, segunda opção ${s.second}` : ''}`
  const waiting = s.stage === 'waitlisted' || s.stage === 'indicated'
  return (
    <>
      <Card>
        <CardHeader>
          <h2>Candidaturas do Checkout</h2>
          <span className="squad-page__muted">
            <span className="admission-poc__num">{s.full ? 0 : 2}</span> de 5 lugares livres
          </span>
        </CardHeader>
        {s.stage === 'none' ? (
          <p className="squad-page__muted">Nenhuma candidatura nova.</p>
        ) : (
          <ul className="squad-page__list">
            <li>
              <div className="squad-page__row">
                <span className="admission-poc__person">
                  <Avatar src={null} name="Ana Souza" size="sm" />
                  <span className="squad-page__name">Ana Souza</span>
                </span>
                <StageChip stage={s.stage} />
              </div>
              <span className="squad-page__muted">{functionLine}</span>
              {s.stage === 'pending' && (
                <>
                  <p className="squad-page__muted">
                    {s.full ? 'Sem lugar livre: Atende coloca a pessoa na lista de espera.' : 'Há lugar livre: Atende reserva o lugar por 3 dias.'}
                  </p>
                  <Card variant="inset">
                    <span className="squad-page__name">Resposta da candidatura</span>
                    <p>Montei o carrinho da loja da Basement em Livewire, com teste de componente para o cupom inválido.</p>
                  </Card>
                  <CriteriaReview
                    roles={[s.role, s.second].filter((r): r is Role => r !== null)}
                    criteria={CRITERIA}
                    onDecide={(role, verdict, checks) =>
                      set({ role: role as Role, checks, stage: verdict === 'not-yet' ? 'declined' : s.full ? 'waitlisted' : 'offered', expired: false })
                    }
                  />
                </>
              )}
              {s.stage === 'indicated' && (
                <>
                  <Callout icon={<Users size={16} aria-hidden />}>
                    Abriu um lugar de {s.role}. Ana Souza é a primeira da fila. Ela ainda atende aos critérios?
                  </Callout>
                  <div className="squad-page__actions">
                    <Button onClick={() => set({ stage: 'offered', expired: false })}>Ainda atende</Button>
                    <Button variant="danger" onClick={() => set({ stage: 'declined' })}>
                      Não atende mais
                    </Button>
                  </div>
                  <p className="squad-page__muted">Você não escolhe outra pessoa da fila. Não atende mais pede retorno, e o Hub indica a próxima.</p>
                </>
              )}
              {s.stage === 'waitlisted' && (
                <>
                  {s.expired && (
                    <Callout icon={<Clock size={16} aria-hidden />}>Ana Souza não confirmou a entrada no prazo. O lugar de Front-end está livre de novo.</Callout>
                  )}
                  <p className="squad-page__muted">Atende aos critérios. Quando um lugar de {s.role} abrir, o Hub indica a primeira da fila.</p>
                </>
              )}
              {s.stage === 'offered' && <p className="squad-page__muted">Lugar reservado até {DEADLINE}, esperando a confirmação.</p>}
              {s.stage === 'joined' && <p className="squad-page__muted">Confirmou a entrada. Convite do GitHub enviado.</p>}
              {s.stage === 'declined' && <p className="squad-page__muted">Retorno enviado, critério por critério.</p>}
            </li>
          </ul>
        )}
      </Card>
      {waiting && (
        <Card>
          <CardHeader>
            <h2>Lista de espera de Front-end</h2>
            <span className="squad-page__muted">Só você e a staff veem</span>
          </CardHeader>
          <ol className="admission-poc__queue">
            <li>Ana Souza</li>
            <li>Gustavo Reis</li>
          </ol>
        </Card>
      )}
    </>
  )
}

function MemberScreen({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <Card>
      <CardHeader>
        <h2>Minhas candidaturas</h2>
      </CardHeader>
      <ul className="squad-page__list">
        {s.stage !== 'none' && (
          <li>
            <div className="squad-page__row">
              <span className="admission-poc__person">
                <SquadCrest crest={LOJA} size="sm" />
                <span className="squad-page__name">Loja Comunitária, Checkout, como {s.role}</span>
              </span>
              <StageChip stage={s.stage} />
            </div>
            {s.stage === 'pending' && <p className="squad-page__muted">Esperando o capitão. O Hub não promete prazo.</p>}
            {(s.stage === 'waitlisted' || s.stage === 'indicated') &&
              (s.expired ? (
                <Callout icon={<Clock size={16} aria-hidden />}>
                  Você não confirmou a entrada no prazo. O lugar foi liberado, e sua candidatura voltou para a lista de espera.
                </Callout>
              ) : (
                <p className="squad-page__muted">Você atende aos critérios. Quando um lugar de {s.role} abrir, ele é oferecido pela ordem da fila.</p>
              ))}
            {s.stage === 'offered' && (
              <>
                <Callout icon={<Clock size={16} aria-hidden />}>Este lugar de {s.role} está reservado para você até {DEADLINE}. Confirme a entrada.</Callout>
                <div className="squad-page__actions">
                  <Button onClick={() => set({ stage: 'joined', other: s.other === 'pending' ? 'closed' : s.other })}>Confirmar entrada</Button>
                </div>
                <p className="squad-page__muted">Ao confirmar, você recebe o convite do GitHub e suas outras candidaturas se encerram.</p>
              </>
            )}
            {s.stage === 'joined' && <p className="squad-page__muted">Você ocupa um lugar de {s.role}. Aceite o convite do time no GitHub.</p>}
            {s.stage === 'declined' && (
              <>
                <p className="squad-page__muted">O capitão conferiu cada critério de {s.role}. Fortaleça os que faltaram; você pode se candidatar de novo.</p>
                <CriteriaFeedback checks={s.checks} />
              </>
            )}
          </li>
        )}
        <li>
          <div className="squad-page__row">
            <span className="admission-poc__person">
              <SquadCrest crest={AGENDA} size="sm" />
              <span className="squad-page__name">Agenda He4rt, Lembretes, como Back-end</span>
            </span>
            <Badge variant={s.other === 'pending' ? 'warning' : 'neutral'}>
              {s.other === 'pending' ? 'Pendente' : s.other === 'withdrawn' ? 'Retirada' : 'Encerrada'}
            </Badge>
          </div>
          <p className="squad-page__muted">
            {s.other === 'pending'
              ? 'Esperando o capitão.'
              : s.other === 'withdrawn'
                ? 'Você desistiu desta candidatura.'
                : 'Encerrada: você entrou no squad Loja Comunitária. Não é uma recusa.'}
          </p>
          {s.other === 'pending' && (
            <div className="squad-page__actions">
              <Button variant="ghost" size="sm" onClick={() => set({ other: 'withdrawn' })}>
                Desistir
              </Button>
            </div>
          )}
        </li>
      </ul>
    </Card>
  )
}
