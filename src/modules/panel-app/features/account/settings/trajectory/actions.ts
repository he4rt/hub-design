import { track } from '@/mocks/analytics'
import { db, newId, type MemberProfile, type Visibility } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { assertProfileOwner, moderateProfileText, preserveProfileRevision, profileOf } from '@/mocks/member-profile'

export type TrajectoryCollection = 'knowledge' | 'learnings' | 'experiences' | 'articles' | 'evidences'
export type TrajectoryFields = Record<string, string>
const COLLECTIONS: TrajectoryCollection[] = ['knowledge', 'learnings', 'experiences', 'articles', 'evidences']

function persist(profile: MemberProfile) {
  db.set((state) => ({ ...state, profiles: [...state.profiles.filter((item) => item.userId !== profile.userId), profile] }))
}

function collectionOf(value: TrajectoryCollection) {
  if (!COLLECTIONS.includes(value)) throw new MockError('Tipo de registro inválido.')
  return value
}

function visibilityOf(value: string): Visibility {
  if (!['private', 'community', 'public'].includes(value)) throw new MockError('Escolha quem pode ver o registro.')
  return value as Visibility
}

function text(input: TrajectoryFields, field: string, max: number, optional = false) {
  const value = input?.[field]
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.trim().length > max) {
    throw new MockError(`Revise o campo: use ${optional ? 'até' : 'de 1 a'} ${max} caracteres.`, field)
  }
  moderateProfileText(value)
  return value.trim()
}

function date(input: TrajectoryFields, field: string, optional = false) {
  const value = text(input, field, 10, optional)
  if (optional && !value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new MockError('Informe uma data válida.', field)
  }
  if (value > new Date().toISOString().slice(0, 10)) throw new MockError('A data não pode estar no futuro.', field)
  return `${value}T00:00:00.000Z`
}

function link(input: TrajectoryFields, host: string) {
  const value = text(input, 'url', 1000)
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new MockError('Informe um link HTTPS válido.', 'url') }
  if (parsed.protocol !== 'https:' || parsed.hostname !== host || parsed.username || parsed.password || parsed.port) {
    throw new MockError(`Use um link HTTPS de ${host}.`, 'url')
  }
  return parsed
}

function editable(collection: TrajectoryCollection, record: MemberProfile[TrajectoryCollection][number]) {
  return !(collection === 'learnings' && 'origin' in record && record.origin === 'basement') &&
    !(collection === 'evidences' && 'projectId' in record && record.projectId !== null)
}

/** Only member-declared records can be authored here; no computed metrics or validations. */
export function saveTrajectoryRecord(userId: string, collection: TrajectoryCollection, recordId: string | null, input: TrajectoryFields) {
  return mockAction(recordId ? 'panel-app.settings.trajectory.update' : 'panel-app.settings.trajectory.store', { userId, collection, recordId }, () => {
    assertProfileOwner(userId)
    collectionOf(collection)
    const profile = profileOf(userId)
    const previous = recordId === null ? undefined : profile[collection].find((record) => record.id === recordId)
    if (recordId !== null && !previous) throw new MockError('Este registro não existe mais.')
    if (previous && !editable(collection, previous)) throw new MockError('O conteúdo vem da origem e não pode ser alterado aqui. Você pode mudar a visibilidade.')
    const base = { id: previous?.id ?? newId(), visibility: visibilityOf(input?.visibility) }
    let record: MemberProfile[TrajectoryCollection][number]
    switch (collection) {
      case 'knowledge': {
        const level = input.level
        if (!['basic', 'intermediate', 'advanced'].includes(level)) throw new MockError('Escolha o nível declarado.', 'level')
        record = { ...base, competency: text(input, 'competency', 100), level: level as 'basic' | 'intermediate' | 'advanced', declaredAt: date(input, 'declaredAt')! }
        break
      }
      case 'learnings':
        record = { ...base, title: text(input, 'title', 160), description: text(input, 'description', 2000, true) || null, origin: 'member', completedAt: date(input, 'completedAt')! }
        break
      case 'experiences': {
        const startedAt = date(input, 'startedAt')!
        const endedAt = date(input, 'endedAt', true)
        if (endedAt && endedAt < startedAt) throw new MockError('O término não pode ser anterior ao início.', 'endedAt')
        record = { ...base, role: text(input, 'role', 120), organization: text(input, 'organization', 160), description: text(input, 'description', 2000, true) || null, startedAt, endedAt }
        break
      }
      case 'articles': {
        const url = link(input, 'dev.to')
        if (url.pathname.split('/').filter(Boolean).length < 2) throw new MockError('Informe o link completo do artigo no dev.to.', 'url')
        record = { ...base, title: text(input, 'title', 160), summary: text(input, 'summary', 2000, true) || null, source: 'dev.to', url: url.href, publishedAt: date(input, 'publishedAt')! }
        break
      }
      case 'evidences': {
        const kind = input.kind
        const repository = text(input, 'repository', 200)
        const ref = text(input, 'ref', 40, true) || null
        if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new MockError('Use o formato organização/repositório.', 'repository')
        if (!['commit', 'pull-request', 'repository'].includes(kind) ||
          (kind === 'repository' && ref !== null) || (kind === 'commit' && !/^[a-f\d]{7,40}$/i.test(ref ?? '')) ||
          (kind === 'pull-request' && !/^[1-9]\d*$/.test(ref ?? ''))) throw new MockError('Revise o tipo e a referência da evidência.', 'ref')
        const url = link(input, 'github.com')
        const path = `/${repository}${kind === 'repository' ? '' : `/${kind === 'commit' ? 'commit' : 'pull'}/${ref}`}`
        if (url.pathname.replace(/\/$/, '') !== path) throw new MockError('O link deve corresponder ao repositório e à referência.', 'url')
        record = { ...base, kind: kind as 'commit' | 'pull-request' | 'repository', repository, ref, title: text(input, 'title', 160), context: text(input, 'context', 2000), url: url.href, date: date(input, 'date')!, projectId: null }
        break
      }
    }
    if (previous && Object.entries(record).some(([key, value]) => Reflect.get(previous, key) !== value)) preserveProfileRevision(userId, collection, record.id, 'update', previous)
    persist({ ...profile, [collection]: previous ? profile[collection].map((item) => item.id === record.id ? record : item) : [...profile[collection], record] })
    if (!previous || Object.entries(record).some(([key, value]) => Reflect.get(previous, key) !== value)) {
      track(previous ? 'trajectory_record_updated' : 'trajectory_record_added', { userId, type: collection, recordId: record.id })
    }
    return { recordId: record.id }
  })
}

export function setTrajectoryVisibility(userId: string, collection: TrajectoryCollection, recordId: string, visibility: Visibility) {
  return mockAction('panel-app.settings.trajectory.visibility.update', { userId, collection, recordId, visibility }, () => {
    assertProfileOwner(userId)
    collectionOf(collection)
    visibilityOf(visibility)
    const profile = profileOf(userId)
    const previous = profile[collection].find((item) => item.id === recordId)
    if (!previous) throw new MockError('Este registro não existe mais.')
    if (previous.visibility !== visibility) preserveProfileRevision(userId, collection, recordId, 'update', previous)
    persist({ ...profile, [collection]: profile[collection].map((item) => item.id === recordId ? { ...item, visibility } : item) })
    if (previous.visibility !== visibility) track('trajectory_record_updated', { userId, type: collection, recordId, visibility })
    return { recordId }
  })
}

export function deleteTrajectoryRecord(userId: string, collection: TrajectoryCollection, recordId: string) {
  return mockAction('panel-app.settings.trajectory.destroy', { userId, collection, recordId }, () => {
    assertProfileOwner(userId)
    collectionOf(collection)
    const profile = profileOf(userId)
    const record = profile[collection].find((item) => item.id === recordId)
    if (!record) throw new MockError('Este registro não existe mais.')
    if (!editable(collection, record)) throw new MockError('Registros da origem não podem ser removidos aqui. Altere a visibilidade.')
    if (collection === 'learnings' && db.get().feedPosts.some((post) => post.userId === userId && post.learningId === recordId)) {
      throw new MockError('Esta aprendizagem está ligada ao diário e não pode ser removida. Altere a visibilidade.')
    }
    preserveProfileRevision(userId, collection, recordId, 'delete', record)
    persist({ ...profile, [collection]: profile[collection].filter((item) => item.id !== recordId) })
    track('trajectory_record_deleted', { userId, type: collection, recordId })
    return { recordId }
  })
}
