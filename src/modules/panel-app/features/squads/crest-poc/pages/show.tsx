import { useActionState, useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { SquadCrest } from '@/modules/panel-app/components/squad-crest'
import type { Crest } from '@/modules/panel-app/lib/squad-crest'
import { CrestEditor } from '../components/crest-editor'
import '../../squads/components/squad-page.css'
import './show.css'

/* Design POC of hypothesis H8, the squad crest. Local state only: no action, no store. Not meant to be committed. */

type SquadRow = { id: string; name: string; captain: string | null; project: string | null; free: number; status: 'active' | 'inactive'; crest: Crest }

const LOJA: Crest = { shape: 'shield', symbol: 'bolt', color: 3 }

const OTHERS: SquadRow[] = [
  { id: 'agenda', name: 'Agenda He4rt', captain: 'Daniel Reis', project: 'Lembretes', free: 1, status: 'active', crest: { shape: 'hexagon', symbol: 'compass', color: 1 } },
  { id: 'eventos', name: 'Portal de Eventos', captain: 'Marina Alves', project: 'Inscrições', free: 0, status: 'active', crest: { shape: 'banner', symbol: 'star', color: 3 } },
  { id: 'bot', name: 'Bot do Discord', captain: null, project: null, free: 0, status: 'inactive', crest: { shape: 'circle', symbol: 'terminal', color: 2 } },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Show() {
  const [tab, setTab] = useState('create')
  const [saved, setSaved] = useState<Crest>(LOJA)

  useDebugActions('POC: brasão do squad', [
    { label: 'Voltar ao brasão do seed', run: () => setSaved(LOJA) },
    { label: 'Mesma cor de outro squad', run: () => setSaved({ ...LOJA, color: 1 }) },
    { label: 'Ver a lista de squads', run: () => setTab('list') },
  ])

  const squads: SquadRow[] = [
    { id: 'loja', name: 'Loja Comunitária', captain: 'Rafael Costa', project: 'Checkout', free: 2, status: 'active', crest: saved },
    ...OTHERS,
  ]

  return (
    <div className="squad-page crest-poc">
      <PageHeader title="POC: brasão do squad" description="Forma, símbolo e cor nas cores de metrô da trajetória. Dados de exemplo; nada é gravado." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="segmented" aria-label="Tela">
          <TabsTrigger value="create">Staff</TabsTrigger>
          <TabsTrigger value="edit">Capitão</TabsTrigger>
          <TabsTrigger value="list">Squads</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="crest-poc__screen">
          <CreateScreen />
        </TabsContent>
        <TabsContent value="edit" className="crest-poc__screen">
          <EditScreen saved={saved} onSave={setSaved} />
        </TabsContent>
        <TabsContent value="list" className="crest-poc__screen">
          <ListScreen squads={squads} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CreateScreen() {
  const [name, setName] = useState('Loja Comunitária')
  const [crest, setCrest] = useState<Crest>(LOJA)
  const [message, create, pending] = useActionState(async () => {
    await wait(700)
    return `Squad ${name.trim()} criado. O capitão pode trocar o brasão depois.`
  }, '')
  return (
    <Card>
      <form action={create} className="crest-poc__form">
        <CardHeader>
          <h2>Novo squad</h2>
        </CardHeader>
        <div className="crest-poc__fields">
          <Field id="name" label="Nome">
            <Input id="name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="captain" label="Capitão" hint="Opcional. Sem capitão, o squad fica como vacancy.">
            <Input id="captain" defaultValue="Rafael Costa" />
          </Field>
        </div>
        <Field id="description" label="Descrição">
          <Textarea id="description" defaultValue="A loja da comunidade, do catálogo ao checkout." />
        </Field>
        <section className="crest-poc__section" aria-labelledby="crest-title">
          <h3 id="crest-title">Brasão</h3>
          <CrestEditor crest={crest} name={name.trim()} caption="Prévia" onChange={setCrest} />
        </section>
        <FormMessage tone="success">{message}</FormMessage>
        <div className="squad-page__actions">
          <Button type="submit" loading={pending} disabled={!name.trim()}>
            Criar squad
          </Button>
        </div>
      </form>
    </Card>
  )
}

function EditScreen({ saved, onSave }: { saved: Crest; onSave: (crest: Crest) => void }) {
  const [draft, setDraft] = useState(saved)
  const [message, save, pending] = useActionState(async () => {
    await wait(700)
    onSave(draft)
    return 'Brasão salvo. A troca entra no log do squad.'
  }, '')
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  return (
    <Card>
      <form action={save} className="crest-poc__form">
        <CardHeader>
          <h2>Identidade do squad</h2>
          <span className="squad-page__muted">Loja Comunitária</span>
        </CardHeader>
        <p className="squad-page__muted">Você pode trocar o brasão quando quiser. O histórico do squad continua o mesmo.</p>
        <CrestEditor crest={draft} name="Loja Comunitária" caption={changed ? 'Prévia, ainda não salvo' : 'Brasão atual'} onChange={setDraft} />
        <FormMessage tone="success">{changed ? '' : message}</FormMessage>
        <div className="squad-page__actions">
          <Button type="submit" loading={pending} disabled={!changed}>
            Salvar brasão
          </Button>
          <Button type="button" variant="ghost" disabled={!changed || pending} onClick={() => setDraft(saved)}>
            Desfazer
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ListScreen({ squads }: { squads: SquadRow[] }) {
  return (
    <ul className="crest-poc__grid">
      {squads.map((s) => (
        <li key={s.id}>
          <Card className="crest-poc__squad">
            <div className="crest-poc__squad-head">
              <SquadCrest crest={s.crest} size="md" />
              <div className="crest-poc__squad-title">
                <span className="squad-page__name" title={s.name}>
                  {s.name}
                </span>
                <span className="squad-page__muted">{s.project ? `Projeto ${s.project}` : 'Sem projeto ativo'}</span>
              </div>
            </div>
            <div className="squad-page__chips">
              {s.status === 'inactive' ? <Badge variant="neutral">Inativo</Badge> : <Badge variant="success">Ativo</Badge>}
              {!s.captain && <Badge variant="warning">Sem capitão</Badge>}
            </div>
            <p className="squad-page__muted">
              {s.captain ? `Capitão ${s.captain}. ` : ''}
              {s.status === 'active' ? (
                s.free === 0 ? (
                  'Sem lugar livre.'
                ) : (
                  <>
                    <span className="crest-poc__num">{s.free}</span> {s.free === 1 ? 'lugar livre' : 'lugares livres'}.
                  </>
                )
              ) : (
                'Log e histórico preservados.'
              )}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
