import { Glob } from 'bun'
import { canSee } from '@/lib/trajectory/visibility'
import { itemKey, type StatePatch } from '@/mocks/api'
import { db, type MockDb, type User } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'
import { all, first, insert, now, replaceRows, sql } from './database/connection'
import { readState } from './database/read-state'
import { writeState } from './database/write-state'
import { seed } from './database/seed'
import { createSession, currentSession, deleteSession, isStaff, sessionCookie, type Guard, type SessionRow } from './auth'

/*
 * Runs the prototype's actions (every `actions.ts`) as the backend. Each call reads the state from
 * the database, sets the signed-in users from the request's cookies, runs the same function the
 * screen called (checks included), and writes the result back in one transaction. Then it answers
 * with the state cut for whoever is signed in, which the screens read with `useDb`.
 */

/** Debug mode: the debug sidebar may change the database directly and sign in as anyone. */
export const DEBUG = process.env.HUB_DEBUG === '1'

const ROOT = new URL('../src/', import.meta.url).pathname
/** Same list as the Vite plugin in vite.config.ts. */
const MODULES = new Set(
  [...new Glob('modules/**/actions.ts').scanSync(ROOT), 'mocks/github.ts'].map((file) => file.replace(/\.ts$/, '')),
)

/** First parameters that name who acts: the API checks they are the signed-in user. */
const ACTOR_PARAMS = ['userId', 'actorId', 'memberId', 'validatorId']

type Fn = (...args: unknown[]) => unknown
type Context = { request: Request; web?: SessionRow; admin?: SessionRow; cookies: string[] }

export class HttpError extends Error {
  status: number
  field?: string

  constructor(message: string, status: number, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

/** One write at a time: every action reads and rewrites the whole state. */
let lock: Promise<unknown> = Promise.resolve()
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const run = lock.then(work)
  lock = run.catch(() => undefined)
  return run
}

function parameterNames(fn: Fn): string[] {
  const list = fn.toString().match(/^[^(]*\(([^)]*)\)/)?.[1] ?? ''
  return list
    .split(',')
    .map((param) => param.split('=')[0].trim())
    .filter(Boolean)
}

function userOf(state: MockDb, session: SessionRow | undefined): User | undefined {
  return session?.user_id ? state.users.find((u) => u.id === session.user_id) : undefined
}

/** Who may call the function: signed in to the right guard, and acting as themselves. */
function authorize(module: string, fn: Fn, args: unknown[], state: MockDb, context: Context) {
  if (module === 'mocks/github') {
    if (!DEBUG) throw new HttpError('Os webhooks do GitHub só são simulados no modo debug.', 403)
    return
  }
  if (module.endsWith('/auth/actions')) return
  const admin = module.startsWith('modules/panel-admin/')
  const user = userOf(state, admin ? context.admin : context.web)
  if (!user) throw new HttpError(admin ? 'Entre na administração.' : 'Entre no Hub.', 401)
  if (admin && !isStaff(user)) throw new HttpError('Só a administração.', 403)
  const [first] = parameterNames(fn)
  if (ACTOR_PARAMS.includes(first) && args[0] !== user.id) {
    throw new HttpError('Esta ação é de outra conta.', 403)
  }
}

/** Every string inside the arguments, with the key it sits under. */
function strings(value: unknown, key = ''): { key: string; value: string }[] {
  if (typeof value === 'string') return [{ key, value }]
  if (Array.isArray(value)) return value.flatMap((item) => strings(item, key))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => strings(v, k))
  return []
}

/**
 * The full state an action runs against. The database keeps bcrypt hashes and the actions compare
 * plain passwords, so a password sent in this request is put in place of the hash of the account it
 * matches; `restorePasswords` puts the hash back afterwards.
 */
function stateFor(context: Context, args: unknown[]): { state: MockDb; matched: Map<string, string> } {
  const state = readState()
  const hashes = new Map(all<{ id: string; password: string | null }>('SELECT id, password FROM users').map((u) => [u.id, u.password]))
  const sent = strings(args)
  const candidates = sent.filter((s) => /password|confirmation/i.test(s.key)).map((s) => s.value)
  const matched = new Map<string, string>()
  if (candidates.length > 0) {
    // Only accounts this request names: by e-mail, by reset token, or the signed-in member.
    const texts = new Set(sent.map((s) => s.value.trim().toLowerCase()))
    const resetEmails = state.passwordResets.filter((r) => texts.has(r.token.toLowerCase())).map((r) => r.email.toLowerCase())
    for (const user of state.users) {
      const hash = hashes.get(user.id)
      const named = texts.has(user.email.toLowerCase()) || resetEmails.includes(user.email.toLowerCase()) || user.id === context.web?.user_id
      if (!hash || !named) continue
      const plain = candidates.find((candidate) => Bun.password.verifySync(candidate, hash))
      if (plain) matched.set(user.id, plain)
    }
  }
  state.passwords = Object.fromEntries(
    [...hashes].filter(([, hash]) => hash).map(([id, hash]) => [id, matched.get(id) ?? (hash as string)]),
  )
  const pending = context.web && first<Record<string, string | number>>('SELECT * FROM pending_social_identities WHERE session_id = $id', { id: context.web.id })
  state.session = context.web?.user_id ? { userId: context.web.user_id } : null
  state.adminSession = context.admin?.user_id ? { userId: context.admin.user_id } : null
  state.pendingSocialSignUp =
    pending?.kind === 'sign-up'
      ? { provider: pending.provider as never, name: String(pending.name), email: String(pending.email), emailVerified: pending.email_verified === 1, handle: String(pending.handle) }
      : null
  state.pendingSocialLink =
    pending?.kind === 'link' ? { provider: pending.provider as never, email: String(pending.email), handle: String(pending.handle) } : null
  return { state, matched }
}

/** Writes the state after the action, and signs users in or out as the action chose. */
function persist(context: Context, after: MockDb, matched: Map<string, string>) {
  const passwords = { ...after.passwords }
  // A password the action left as it was goes back to its hash; a new one is hashed by writeState.
  for (const [id, plain] of matched) if (passwords[id] === plain) passwords[id] = hashOf(id)
  replaceRows(() => writeState({ ...after, passwords }))
  syncSession(context, 'web', after.session?.userId ?? null, after.pendingSocialSignUp ?? after.pendingSocialLink)
  syncSession(context, 'admin', after.adminSession?.userId ?? null, null)
}

function hashOf(id: string): string {
  return first<{ password: string }>('SELECT password FROM users WHERE id = $id', { id })!.password
}

/**
 * Makes the guard's session match what the action chose. A login always gets a new session id,
 * so an id known before the login is worthless after it.
 */
function syncSession(
  context: Context,
  guard: Guard,
  userId: string | null,
  pending: MockDb['pendingSocialSignUp'] | MockDb['pendingSocialLink'],
) {
  let row = context[guard]
  const set = (next: SessionRow | undefined) => {
    context[guard] = next
    context.cookies.push(sessionCookie(guard, next?.id ?? null))
  }
  if (row && row.user_id !== userId) {
    deleteSession(row.id)
    row = undefined
    set(undefined)
  }
  if (!row && (userId || pending)) {
    const id = createSession(context.request, guard, userId)
    row = { id, guard, user_id: userId, last_activity_at: now() }
    set(row)
  }
  if (!row || guard !== 'web') return
  sql.query('DELETE FROM pending_social_identities WHERE session_id = $id').run({ id: row.id })
  if (pending) {
    const signUp = 'name' in pending
    insert('pending_social_identities', {
      session_id: row.id,
      kind: signUp ? 'sign-up' : 'link',
      provider: pending.provider,
      name: signUp ? pending.name : '',
      email: pending.email,
      email_verified: signUp ? pending.emailVerified : false,
      handle: pending.handle,
      created_at: now(),
    })
  } else if (!row.user_id) {
    deleteSession(row.id)
    set(undefined)
  }
}

/**
 * The state as the signed-in user may see it, like the props of a page. The staff (admin session)
 * sees everything; a member sees their own records and what others chose to show members; a
 * visitor sees what is public. Password hashes never leave the API.
 */
export function viewState(context: Context): MockDb {
  const { state } = stateFor(context, [])
  const me = state.session?.userId ?? null
  const view: MockDb = {
    ...state,
    passwords: {},
    passwordResets: DEBUG ? state.passwordResets : [],
    events: DEBUG || isStaff(userOf(state, context.admin)) ? state.events : [],
  }
  if (isStaff(userOf(state, context.admin))) return view
  const viewer = (ownerId: string) => (ownerId === me ? 'owner' : me ? 'member' : 'visitor')
  const published = new Set(state.users.filter((u) => u.published).map((u) => u.id))
  const captainOf = (projectId: string) => {
    const project = state.projects.find((p) => p.id === projectId)
    return state.squads.find((s) => s.id === project?.squadId)?.captainId
  }
  return {
    ...view,
    // Never public: the e-mail, the birth date, and being open to opportunities (staff only).
    users: state.users.map((u) => (u.id === me ? u : { ...u, email: '', birthDate: '', openToOpportunities: false })),
    profiles: state.profiles.map((p) => {
      const sees = <T extends { visibility: 'private' | 'community' | 'public' }>(records: T[]) =>
        records.filter((r) => canSee(r.visibility, viewer(p.userId)))
      return {
        ...p,
        knowledge: sees(p.knowledge),
        learnings: sees(p.learnings),
        experiences: sees(p.experiences),
        articles: sees(p.articles),
        evidences: sees(p.evidences),
      }
    }),
    feedPosts: state.feedPosts
      .filter((p) => p.userId === me || (!p.deletedAt && ((me && p.sharedOnFeed) || (p.shownOnProfile && published.has(p.userId)))))
      .map((p) => (p.userId === me ? p : { ...p, revisions: [] })),
    feedBookmarks: state.feedBookmarks.filter((b) => b.userId === me),
    applications: state.applications.filter((a) => a.userId === me || captainOf(a.projectId) === me),
    validatorApplications: state.validatorApplications.filter((a) => a.userId === me),
    validations: state.validations.filter((v) => v.memberId === me || v.validatorId === me || v.published),
  }
}

function contextOf(request: Request): Context {
  return { request, web: currentSession(request, 'web'), admin: currentSession(request, 'admin'), cookies: [] }
}

function respond(context: Context, body: Record<string, unknown>, status = 200): Response {
  const headers = new Headers({ 'content-type': 'application/json' })
  for (const cookie of context.cookies) headers.append('set-cookie', cookie)
  return new Response(JSON.stringify({ ...body, state: viewState(context) }), { status, headers })
}

/** GET /api/state: the first page load. */
export function showState(request: Request): Response {
  const context = contextOf(request)
  return new Response(JSON.stringify(viewState(context)), { headers: { 'content-type': 'application/json' } })
}

/** POST /api/actions/:name, body { module, export, args }: runs one action. */
export function runAction(request: Request, name: string, body: { module: string; export: string; args: unknown[] }) {
  return exclusive(async () => {
    const context = contextOf(request)
    if (!MODULES.has(body.module) || !Array.isArray(body.args)) throw new HttpError('Ação desconhecida.', 404)
    const exports = (await import(`${ROOT}${body.module}.ts`)) as Record<string, unknown>
    const fn = exports[body.export]
    if (typeof fn !== 'function') throw new HttpError('Ação desconhecida.', 404)

    const { state: before, matched } = stateFor(context, body.args)
    authorize(body.module, fn as Fn, body.args, before, context)
    db.set(() => before)
    let output: unknown
    let failure: unknown
    try {
      output = await (fn as Fn)(...body.args)
    } catch (error) {
      failure = error
    }
    // Like the mock, what the action wrote before refusing stays (an underage sign-up drops the social login).
    persist(context, db.get(), matched)
    console.log(`${name} ${failure ? `→ ${failure instanceof Error ? failure.message : failure}` : 'ok'}`)
    // The product events the action sent, for the browser's debug log.
    const tracked = db.get().events.filter((event) => !before.events.includes(event))
    if (failure instanceof MockError) return respond(context, { message: failure.message, field: failure.field ?? null, tracked }, 422)
    if (failure) throw failure
    return respond(context, { output: output ?? null, tracked })
  })
}

/** POST /api/debug/state: a change the debug sidebar made to the store, as a patch. */
export function applyDebugPatch(request: Request, patch: StatePatch) {
  return exclusive(async () => {
    if (!DEBUG) throw new HttpError('O modo debug está desligado na API.', 403)
    const context = contextOf(request)
    const { state: before } = stateFor(context, [])
    const after = { ...before } as Record<string, unknown>
    for (const [key, value] of Object.entries(patch.set ?? {})) after[key] = value
    for (const [key, change] of Object.entries(patch.arrays ?? {})) {
      const current = (before[key as keyof MockDb] ?? []) as unknown[]
      const byKey = new Map(current.map((item) => [itemKey(key, item), item]))
      const upserts = new Map(change.upserts.map((item) => [itemKey(key, item), restore(key, item, byKey.get(itemKey(key, item)))]))
      const listed = new Set(change.keys)
      after[key] = [
        ...change.keys.map((k) => upserts.get(k) ?? byKey.get(k)).filter((item) => item !== undefined),
        // Rows the screen could not see stay where they were.
        ...current.filter((item) => {
          const k = itemKey(key, item)
          return !listed.has(k) && !change.deletes.includes(k)
        }),
      ]
    }
    persist(context, after as MockDb, new Map())
    return respond(context, { output: null })
  })
}

/** Puts back what `viewState` hid from the screen when the screen sends an item back. */
function restore(collection: string, item: unknown, stored: unknown): unknown {
  if (!stored) return item
  if (collection === 'users') {
    const [next, old] = [item as User, stored as User]
    if (next.email !== '') return next
    return { ...next, email: old.email, birthDate: old.birthDate, openToOpportunities: old.openToOpportunities }
  }
  if (collection === 'profiles') {
    const [next, old] = [item as MockDb['profiles'][number], stored as MockDb['profiles'][number]]
    const merge = <T extends { id: string; visibility: string }>(mine: T[], theirs: T[]) => [
      ...mine,
      ...theirs.filter((r) => r.visibility !== 'public' && !mine.some((m) => m.id === r.id)),
    ]
    return {
      ...next,
      knowledge: merge(next.knowledge, old.knowledge),
      learnings: merge(next.learnings, old.learnings),
      experiences: merge(next.experiences, old.experiences),
      articles: merge(next.articles, old.articles),
      evidences: merge(next.evidences, old.evidences),
    }
  }
  if (collection === 'feedPosts') {
    const [next, old] = [item as MockDb['feedPosts'][number], stored as MockDb['feedPosts'][number]]
    return next.revisions.length === 0 ? { ...next, revisions: old.revisions } : next
  }
  return item
}

/** POST /api/debug/reset: loads the seed again; every session ends with it. */
export function resetState(request: Request) {
  return exclusive(async () => {
    if (!DEBUG) throw new HttpError('O modo debug está desligado na API.', 403)
    await seed()
    const context: Context = { request, cookies: [sessionCookie('web', null), sessionCookie('admin', null)] }
    return respond(context, { output: null })
  })
}
