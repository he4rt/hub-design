import { useActionState, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Globe, Lock, MoreHorizontal, Plus, Users } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb, type MemberProfile, type Visibility } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { formatMonth, formatPeriod } from '@/lib/dates'
import { evidenceRef } from '@/lib/evidence'
import { formatDate } from '@/mocks/squads'
import { deleteTrajectoryRecord, saveTrajectoryRecord, setTrajectoryVisibility, type TrajectoryCollection, type TrajectoryFields } from '../trajectory/actions'
import './trajectory-settings.css'

const VISIBILITY = [
  { value: 'private', label: 'Privado' }, { value: 'community', label: 'Comunidade' }, { value: 'public', label: 'Público' },
]
type Field = { name: string; label: string; max?: number; type?: 'date' | 'url' | 'textarea'; optional?: boolean; options?: { value: string; label: string }[] }
const FIELDS: Record<TrajectoryCollection, { title: string; fields: Field[] }> = {
  knowledge: { title: 'Conhecimento declarado', fields: [
    { name: 'competency', label: 'Conhecimento', max: 100 },
    { name: 'level', label: 'Nível declarado', options: [{ value: 'basic', label: 'Básico' }, { value: 'intermediate', label: 'Intermediário' }, { value: 'advanced', label: 'Avançado' }] },
    { name: 'declaredAt', label: 'Data da declaração', type: 'date' },
  ] },
  learnings: { title: 'Aprendizagens', fields: [
    { name: 'title', label: 'Título', max: 160 }, { name: 'description', label: 'Descrição', type: 'textarea', max: 2000, optional: true },
    { name: 'completedAt', label: 'Data de conclusão', type: 'date' },
  ] },
  experiences: { title: 'Experiências', fields: [
    { name: 'role', label: 'Atuação', max: 120 }, { name: 'organization', label: 'Organização', max: 160 },
    { name: 'description', label: 'Descrição', type: 'textarea', max: 2000, optional: true },
    { name: 'startedAt', label: 'Início', type: 'date' }, { name: 'endedAt', label: 'Término', type: 'date', optional: true },
  ] },
  articles: { title: 'Artigos no dev.to', fields: [
    { name: 'title', label: 'Título', max: 160 }, { name: 'summary', label: 'Resumo', type: 'textarea', max: 2000, optional: true },
    { name: 'url', label: 'Link do artigo no dev.to', type: 'url', max: 1000 }, { name: 'publishedAt', label: 'Data de publicação', type: 'date' },
  ] },
  evidences: { title: 'Evidências técnicas', fields: [
    { name: 'kind', label: 'Tipo', options: [{ value: 'repository', label: 'Repositório' }, { value: 'pull-request', label: 'Pull request' }, { value: 'commit', label: 'Commit' }] },
    { name: 'repository', label: 'Repositório (organização/nome)', max: 200 },
    { name: 'ref', label: 'Hash do commit ou número do PR (vazio para repositório)', max: 40, optional: true },
    { name: 'title', label: 'Título', max: 160 }, { name: 'context', label: 'Problema, contribuição e resultado', type: 'textarea', max: 2000 },
    { name: 'url', label: 'Link correspondente no GitHub', type: 'url', max: 1000 }, { name: 'date', label: 'Data da contribuição', type: 'date' },
  ] },
}
type TrajectoryRecord = MemberProfile[TrajectoryCollection][number]
type Result = { ok: boolean; message: string } | null

/** One record of each collection, for the dialog title: "Nova experiência", "Editar experiência". */
const SINGULAR: Record<TrajectoryCollection, { noun: string; feminine: boolean }> = {
  knowledge: { noun: 'conhecimento', feminine: false },
  learnings: { noun: 'aprendizagem', feminine: true },
  experiences: { noun: 'experiência', feminine: true },
  articles: { noun: 'artigo', feminine: false },
  evidences: { noun: 'evidência', feminine: true },
}

const VISIBILITY_ICONS = { private: Lock, community: Users, public: Globe } as const
const LEVELS = { basic: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado' } as const

/** Records from the Basement or a squad keep their content; only who sees them changes here. */
function isSourceOwned(record: TrajectoryRecord) {
  return ('origin' in record && record.origin === 'basement') || ('projectId' in record && record.projectId !== null)
}

function titleOf(record: TrajectoryRecord) {
  return 'competency' in record ? record.competency : 'role' in record ? record.role : record.title
}

/** What tells one record from another at a glance: its level, organization, source or reference, and when. */
function detailsOf(collection: TrajectoryCollection, record: TrajectoryRecord): { text: string; mono?: boolean }[] {
  if ('competency' in record) return [{ text: LEVELS[record.level] }, { text: formatMonth(record.declaredAt) }]
  if ('role' in record) return [{ text: record.organization }, { text: formatPeriod(record.startedAt, record.endedAt) }]
  if ('completedAt' in record) return [{ text: record.origin === 'basement' ? 'Basement' : 'Estudo' }, { text: formatMonth(record.completedAt) }]
  if ('kind' in record) return [{ text: evidenceRef(record), mono: true }, { text: formatMonth(record.date) }]
  return collection === 'articles' && 'publishedAt' in record ? [{ text: 'dev.to' }, { text: formatMonth(record.publishedAt) }] : []
}

export function TrajectorySettings({ userId }: { userId: string }) {
  const profiles = useDb((state) => state.profiles)
  const posts = useDb((state) => state.feedPosts)
  const profile = profiles.find((item) => item.userId === userId)
  const [params, setParams] = useSearchParams()
  // "Novo registro" in the profile links here with ?novo=<collection>: that form opens.
  const [editing, setEditing] = useState<{ collection: TrajectoryCollection; record: TrajectoryRecord | null } | null>(() => {
    const requested = params.get('novo')
    return requested && requested in FIELDS ? { collection: requested as TrajectoryCollection, record: null } : null
  })
  const [removing, setRemoving] = useState<{ collection: TrajectoryCollection; record: TrajectoryRecord } | null>(null)
  useEffect(() => {
    if (!params.has('novo')) return
    setParams((current) => {
      current.delete('novo')
      return current
    }, { replace: true, preventScrollReset: true })
    // Only the link that opened the page asks for a form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [result, setResult] = useState<Result>(null)
  const firstKnowledge = profile?.knowledge[0]
  useDebugActions('Trajetória', [
    { label: 'Abrir novo conhecimento (vazio)', run: () => setEditing({ collection: 'knowledge', record: null }) },
    { label: 'Abrir nova experiência', run: () => setEditing({ collection: 'experiences', record: null }) },
    ...(firstKnowledge ? [{ label: 'Remover o primeiro conhecimento (confirmação)', run: () => setRemoving({ collection: 'knowledge' as const, record: firstKnowledge }) }] : []),
  ])
  const open = (collection: TrajectoryCollection, record: TrajectoryRecord | null) => {
    setResult(null)
    setEditing({ collection, record })
  }
  return (
    <section id="trajectory" className="trajectory-settings" aria-label="Editar trajetória">
      <div className="trajectory-settings__intro">
        <p className="trajectory-settings__hint">Todo registro novo começa privado. Você escolhe depois quem vê cada um.</p>
        <FormMessage tone={result?.ok === false ? 'error' : 'success'}>{result?.message}</FormMessage>
      </div>
      {(Object.keys(FIELDS) as TrajectoryCollection[]).map((collection) => (
        <Card key={collection} id={`trajectory-${collection}`} className="trajectory-settings__card">
          <header className="trajectory-settings__heading">
            <h2 className="profile-page__title">{FIELDS[collection].title}</h2>
            <Button size="sm" variant="secondary" onClick={() => open(collection, null)}>
              <Plus size={16} aria-hidden />
              Adicionar
            </Button>
          </header>
          {profile?.[collection].length ? (
            <ul className="trajectory-settings__list">
              {profile[collection].map((record) => {
                const sourceOwned = isSourceOwned(record)
                const linked = collection === 'learnings' && posts.some((post) => post.userId === userId && post.learningId === record.id)
                const title = titleOf(record)
                const VisibilityIcon = VISIBILITY_ICONS[record.visibility]
                return (
                  <li key={record.id} className="trajectory-settings__row">
                    <div className="trajectory-settings__record">
                      <span className="trajectory-settings__record-title" title={title}>{title}</span>
                      <span className="trajectory-settings__details">
                        {detailsOf(collection, record).map((detail) => (
                          <span key={detail.text} data-mono={detail.mono || undefined} title={detail.text}>{detail.text}</span>
                        ))}
                      </span>
                    </div>
                    <span className="trajectory-settings__visibility">
                      <VisibilityIcon size={14} aria-hidden />
                      {VISIBILITY.find((item) => item.value === record.visibility)?.label}
                    </span>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="trajectory-settings__menu" aria-label={`Ações de ${title}`}>
                          <MoreHorizontal size={16} aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => open(collection, record)}>{sourceOwned ? 'Mudar quem vê' : 'Editar'}</DropdownMenuItem>
                        {!sourceOwned && !linked && (
                          <DropdownMenuItem variant="danger" onSelect={() => { setResult(null); setRemoving({ collection, record }) }}>Remover</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="trajectory-settings__hint">Nenhum registro ainda.</p>
          )}
        </Card>
      ))}
      <Dialog open={editing !== null} onOpenChange={(next) => { if (!next) setEditing(null) }}>
        {editing && (
          <RecordForm
            key={`${editing.collection}-${editing.record?.id ?? 'new'}`}
            userId={userId}
            collection={editing.collection}
            record={editing.record}
            onClose={() => setEditing(null)}
            onSaved={() => { setResult({ ok: true, message: 'Registro salvo.' }); setEditing(null) }}
          />
        )}
      </Dialog>
      {removing && (
        <DeleteRecord userId={userId} collection={removing.collection} record={removing.record} onClose={() => setRemoving(null)} onResult={setResult} />
      )}
      <TrajectoryHistory userId={userId} />
    </section>
  )
}

function TrajectoryHistory({ userId }: { userId: string }) {
  const revisions = useDb((state) => state.profileRevisions)
  const mine = revisions.filter((revision) => revision.userId === userId).toReversed()
  return (
    <Card>
      <h2 className="profile-page__title">Histórico da trajetória</h2>
      <p className="trajectory-settings__hint">Quando você edita ou exclui um registro, a versão anterior fica guardada aqui. O histórico é privado e também pode ser consultado pela administração.</p>
      {mine.length === 0 ? <p className="trajectory-settings__hint">Nenhuma alteração anterior.</p> : (
        <Collapsible>
          <CollapsibleTrigger asChild><Button variant="secondary" size="sm">Ver versões anteriores</Button></CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="trajectory-settings__history">
              {mine.map((revision) => {
                const fields: Field[] = revision.collection === 'presentation' ? [{ name: 'readme', label: 'Sobre mim' }, { name: 'currentFocus', label: 'Aprendendo agora' }] : FIELDS[revision.collection].fields
                return (
                  <li key={revision.id}>
                    <p className="trajectory-settings__hint">{revision.operation === 'delete' ? 'Exclusão' : 'Edição'} em {formatDate(revision.at)}. Conteúdo anterior:</p>
                    <dl>{fields.filter((field) => revision.snapshot[field.name]).map((field) => <div key={field.name}><dt>{field.label}</dt><dd>{field.options?.find((option) => option.value === revision.snapshot[field.name])?.label ?? String(revision.snapshot[field.name])}</dd></div>)}</dl>
                  </li>
                )
              })}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  )
}

function RecordForm({ userId, collection, record, onClose, onSaved }: { userId: string; collection: TrajectoryCollection; record: TrajectoryRecord | null; onClose: () => void; onSaved: () => void }) {
  const id = useId()
  const fields = FIELDS[collection].fields
  const sourceOwned = record !== null && isSourceOwned(record)
  const [draft, setDraft] = useState<TrajectoryFields>(() => Object.fromEntries([
    ...fields.map((field) => {
      const value = record && field.name in record ? String(record[field.name as keyof typeof record] ?? '') : field.options?.[0].value ?? ''
      return [field.name, field.type === 'date' ? value.slice(0, 10) : value]
    }), ['visibility', record?.visibility ?? 'private'],
  ]))
  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      if (sourceOwned && record) await setTrajectoryVisibility(userId, collection, record.id, draft.visibility as Visibility)
      else await saveTrajectoryRecord(userId, collection, record?.id ?? null, draft)
      onSaved()
      return null
    } catch (error) { return { ok: false, message: errorMessage(error) } }
  }, null)
  function update(name: string, value: string) { setDraft((current) => ({ ...current, [name]: value })) }
  const { noun, feminine } = SINGULAR[collection]
  const title = sourceOwned && record ? titleOf(record) : record ? `Editar ${noun}` : `${feminine ? 'Nova' : 'Novo'} ${noun}`
  return (
    <DialogContent
      title={title}
      description={sourceOwned ? 'Este registro vem da origem. Aqui você muda só quem pode ver.' : undefined}
      footer={
        <div className="trajectory-settings__actions">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={`${id}-form`} loading={pending}>Salvar</Button>
        </div>
      }
    >
      <form id={`${id}-form`} action={submit} className="trajectory-settings__form">
        {!sourceOwned && fields.map((field) => (
          <div className="trajectory-settings__field" key={field.name}>
            <Label htmlFor={`${id}-${field.name}`} id={`${id}-${field.name}-label`}>{field.label}{field.optional ? ' (opcional)' : ''}</Label>
            {field.options ? (
              <ToggleGroup type="single" variant="chips" aria-labelledby={`${id}-${field.name}-label`} value={draft[field.name]} onValueChange={(value) => { if (value) update(field.name, value) }} disabled={pending}>
                {field.options.map((option) => <ToggleGroupItem key={option.value} value={option.value}>{option.label}</ToggleGroupItem>)}
              </ToggleGroup>
            ) : field.type === 'textarea' ? (
              <Textarea id={`${id}-${field.name}`} value={draft[field.name]} onChange={(event) => update(field.name, event.target.value)} rows={4} maxLength={field.max} required={!field.optional} disabled={pending} />
            ) : <Input id={`${id}-${field.name}`} type={field.type ?? 'text'} value={draft[field.name]} onChange={(event) => update(field.name, event.target.value)} maxLength={field.max} required={!field.optional} disabled={pending} />}
          </div>
        ))}
        <div className="trajectory-settings__field">
          <Label id={`${id}-visibility`}>Quem pode ver</Label>
          <ToggleGroup type="single" variant="chips" aria-labelledby={`${id}-visibility`} value={draft.visibility} onValueChange={(value) => { if (value) update('visibility', value) }} disabled={pending}>
            {VISIBILITY.map((item) => <ToggleGroupItem key={item.value} value={item.value}>{item.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <FormMessage tone="error">{result?.message}</FormMessage>
      </form>
    </DialogContent>
  )
}

function DeleteRecord({ userId, collection, record, onClose, onResult }: { userId: string; collection: TrajectoryCollection; record: TrajectoryRecord; onClose: () => void; onResult: (result: Result) => void }) {
  const [, submit, pending] = useActionState(async () => {
    try { await deleteTrajectoryRecord(userId, collection, record.id); onResult({ ok: true, message: 'Registro removido.' }); onClose() }
    catch (error) { onResult({ ok: false, message: errorMessage(error) }); onClose() }
    return null
  }, null)
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }}>
      <DialogContent title={`Remover "${titleOf(record)}"?`} description="O registro sai da sua trajetória. Para só deixar de mostrar, mude para Privado."
        footer={<form action={submit} className="trajectory-settings__actions">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="danger" loading={pending}>Remover</Button>
        </form>}
      />
    </Dialog>
  )
}
