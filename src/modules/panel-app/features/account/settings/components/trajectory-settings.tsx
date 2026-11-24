import { useActionState, useId, useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb, type MemberProfile, type Visibility } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
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
    { name: 'startedAt', label: 'Início', type: 'date' }, { name: 'endedAt', label: 'Término (vazio se atual)', type: 'date', optional: true },
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

export function TrajectorySettings({ userId }: { userId: string }) {
  const profiles = useDb((state) => state.profiles)
  const posts = useDb((state) => state.feedPosts)
  const profile = profiles.find((item) => item.userId === userId)
  const [editing, setEditing] = useState<{ collection: TrajectoryCollection; record: TrajectoryRecord | null } | null>(null)
  const [result, setResult] = useState<Result>(null)
  useDebugActions('Trajetória', [
    { label: 'Abrir novo conhecimento (vazio)', run: () => setEditing({ collection: 'knowledge', record: null }) },
    { label: 'Abrir nova experiência', run: () => setEditing({ collection: 'experiences', record: null }) },
  ])
  return (
    <section id="trajectory" className="trajectory-settings" aria-label="Editar trajetória">
      <p className="trajectory-settings__hint">Registros novos começam privados. Declarações e links não são validações de competência. Cursos da Basement e evidências de projetos mantêm o conteúdo da origem.</p>
      <FormMessage tone={result?.ok === false ? 'error' : 'success'}>{result?.message}</FormMessage>
      {(Object.keys(FIELDS) as TrajectoryCollection[]).map((collection) => (
        <Card key={collection}>
          <div className="trajectory-settings__heading">
            <h2 className="profile-page__title">{FIELDS[collection].title}</h2>
            <Button size="sm" variant="secondary" disabled={editing !== null} onClick={() => { setResult(null); setEditing({ collection, record: null }) }}>Adicionar</Button>
          </div>
          {!(profile?.[collection].length) && <p className="trajectory-settings__hint">Nenhum registro ainda.</p>}
          <ul className="trajectory-settings__list">
            {profile?.[collection].map((record) => {
              const sourceOwned = ('origin' in record && record.origin === 'basement') || ('projectId' in record && record.projectId !== null)
              const linked = collection === 'learnings' && posts.some((post) => post.userId === userId && post.learningId === record.id)
              const title = 'competency' in record ? record.competency : 'role' in record ? `${record.role}, ${record.organization}` : record.title
              return (
                <li key={record.id} className="trajectory-settings__row">
                  <div className="trajectory-settings__record">
                    <span className="trajectory-settings__record-title" title={title}>{title}</span>
                    <span className="trajectory-settings__hint">{VISIBILITY.find((item) => item.value === record.visibility)?.label}{sourceOwned ? '. Conteúdo da origem.' : ''}</span>
                  </div>
                  <Button size="sm" variant="ghost" disabled={editing !== null} onClick={() => { setResult(null); setEditing({ collection, record }) }}>{sourceOwned ? 'Visibilidade' : 'Editar'}</Button>
                  {!sourceOwned && !linked && <DeleteRecord userId={userId} collection={collection} recordId={record.id} disabled={editing !== null} onResult={setResult} />}
                </li>
              )
            })}
          </ul>
          {editing?.collection === collection && <RecordForm key={`${collection}-${editing.record?.id ?? 'new'}`} userId={userId} collection={collection} record={editing.record} onClose={() => setEditing(null)} onSaved={() => { setResult({ ok: true, message: 'Registro salvo.' }); setEditing(null) }} />}
        </Card>
      ))}
      <TrajectoryHistory userId={userId} />
    </section>
  )
}

function TrajectoryHistory({ userId }: { userId: string }) {
  const revisions = useDb((state) => state.profileRevisions)
  const mine = revisions.filter((revision) => revision.userId === userId).toReversed()
  return (
    <Card>
      <h2 className="profile-page__title">Histórico privado da trajetória</h2>
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
  const sourceOwned = record && (('origin' in record && record.origin === 'basement') || ('projectId' in record && record.projectId !== null))
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
  return (
    <form action={submit} className="trajectory-settings__form trajectory-settings__editor" aria-label={`${record ? 'Editar' : 'Adicionar'} ${FIELDS[collection].title}`}>
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
      <Label id={`${id}-visibility`}>Quem pode ver</Label>
      <ToggleGroup type="single" variant="chips" aria-labelledby={`${id}-visibility`} value={draft.visibility} onValueChange={(value) => { if (value) update('visibility', value) }} disabled={pending}>
        {VISIBILITY.map((item) => <ToggleGroupItem key={item.value} value={item.value}>{item.label}</ToggleGroupItem>)}
      </ToggleGroup>
      <FormMessage tone={result?.ok === false ? 'error' : 'success'}>{result?.message}</FormMessage>
      <div className="trajectory-settings__actions">
        <Button type="submit" variant="secondary" loading={pending}>Salvar registro</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  )
}

function DeleteRecord({ userId, collection, recordId, disabled, onResult }: { userId: string; collection: TrajectoryCollection; recordId: string; disabled: boolean; onResult: (result: Result) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [, submit, pending] = useActionState(async () => {
    try { await deleteTrajectoryRecord(userId, collection, recordId); onResult({ ok: true, message: 'Registro removido.' }) }
    catch (error) { onResult({ ok: false, message: errorMessage(error) }); setConfirming(false) }
    return null
  }, null)
  return (
    <Dialog open={confirming} onOpenChange={(open) => { if (!pending) setConfirming(open) }}>
      <DialogTrigger asChild><Button type="button" size="sm" variant="ghost" disabled={disabled}>Remover</Button></DialogTrigger>
      <DialogContent title="Remover este registro?" description="O registro será removido da sua trajetória. Se você só quer deixar de exibi-lo, escolha a visibilidade Só eu."
        footer={<form action={submit} className="trajectory-settings__actions">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button type="submit" variant="danger" disabled={disabled} loading={pending}>Confirmar exclusão</Button>
        </form>}
      />
    </Dialog>
  )
}
