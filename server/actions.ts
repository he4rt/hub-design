import { Glob } from 'bun'
import { canReadDiscussion } from '@/lib/discussions'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { canSee } from '@/lib/trajectory/visibility'
import { itemKey, type StatePatch } from '@/mocks/api'
import { db, makeUser, type MockDb, type Removal, type User } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'
import { completePendingGithubIdentity, enqueueGithubEffects } from './github-effects'
import { all, first, insert, now, replaceRows, sql } from './database/connection'
import { readState } from './database/read-state'
import { writeState } from './database/write-state'
import { seed } from './database/seed'
import { createSession, currentSession, deleteSession, isStaff, sessionCookie, type Guard, type SessionRow } from './auth'
import { clearAuthMail } from './mail-auth'

/*
 * Runs the prototype's actions (every `actions.ts`) as the backend. Each call reads the state from
 * the database, sets the signed-in users from the request's cookies, runs the same function the
 * screen called (checks included), and writes the result back in one transaction. Then it answers
 * with the state cut for whoever is signed in, which the screens read with `useDb`.
 */

/** Debug mode: the debug sidebar may change the database directly and sign in as anyone. */
export const DEBUG = process.env.HUB_DEBUG === '1'
/** Set when Sign in with GitHub is configured: the OAuth App or the GitHub App (server/github.ts). */
export const GITHUB_OAUTH = !!process.env.GITHUB_OAUTH_CLIENT_ID || !!process.env.GITHUB_CLIENT_ID || existsSync(`${process.env.HOME}/.config/he4rt-hub/github-app.json`)

const ROOT = new URL('../src/', import.meta.url).pathname
/** Same list as the Vite plugin in vite.config.ts. */
const MODULES = new Set(
  [...new Glob('modules/**/actions.ts').scanSync(ROOT), 'mocks/github.ts'].map((file) => file.replace(/\.ts$/, '')),
)

/** First parameters that name who acts: the API checks they are the signed-in user. */
const ACTOR_PARAMS = ['userId', 'actorId', 'memberId', 'validatorId']

type Fn = (...args: unknown[]) => unknown
export type Context = { request: Request; web?: SessionRow; admin?: SessionRow; cookies: string[] }

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
  const [first] = parameterNames(fn)
  if (module.endsWith('/auth/actions')) {
    // Provider identities come from the trusted OAuth callback, never from browser arguments.
    if (!DEBUG) {
      const linking = fn.name === 'answerOnboardingStep' && args[1] === 'github'
      const hasGithub = userOf(state, context.web)?.linkedAccounts.some((a) => a.provider === 'github')
      if (fn.name === 'socialLogin' || (linking && !hasGithub)) {
        throw new HttpError('Autentique pelo próprio provedor.', 403)
      }
    }
    // Login and registration are public; onboarding still acts on the signed-in account.
    if (!ACTOR_PARAMS.includes(first)) return
  }
  if (!DEBUG && fn.name === 'connectAccount' && args[1] !== 'linkedin') {
    throw new HttpError('Vincule a conta pelo próprio provedor.', 403)
  }
  const admin = module.startsWith('modules/panel-admin/')
  const user = userOf(state, admin ? context.admin : context.web)
  if (!user) throw new HttpError(admin ? 'Entre na administração.' : 'Entre no Hub.', 401)
  if (admin && !isStaff(user)) throw new HttpError('Só a administração.', 403)
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
function persist(context: Context, after: MockDb, matched: Map<string, string>, effects?: () => void) {
  const passwords = { ...after.passwords }
  // A password the action left as it was goes back to its hash; a new one is hashed by writeState.
  for (const [id, plain] of matched) if (passwords[id] === plain) passwords[id] = hashOf(id)
  replaceRows(() => {
    writeState({ ...after, passwords })
    effects?.()
  })
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

/** Identity needed for attribution; the profile's body only leaves the API after publication. */
function publicUser(user: User): User {
  return makeUser({
    id: user.id, name: user.name, username: user.username, email: '', birthDate: '',
    role: user.role, photoUrl: user.photoUrl, createdAt: user.createdAt, onboardedAt: user.onboardedAt,
    published: user.published,
    ...(user.published ? {
      bio: user.bio, objective: user.objective, areas: user.areas, languages: user.languages, spokenLanguages: user.spokenLanguages,
      situation: user.situation, city: user.city, portfolioUrl: user.portfolioUrl,
      linkedAccounts: user.linkedAccounts,
    } : {}),
  })
}

/** The author reads why the staff removed their text, never who removed it. */
function hideRemover(removal: Removal | null): Removal | null {
  return removal && { ...removal, removedBy: '' }
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
    passwordResets: DEBUG && isStaff(userOf(state, context.admin)) ? state.passwordResets : [],
    events: isStaff(userOf(state, context.admin)) ? state.events : [],
    profileRevisions: isStaff(userOf(state, context.admin)) ? state.profileRevisions : state.profileRevisions.filter((revision) => revision.userId === me),
    projects: state.projects.map((p) => ({ ...p, reservedSeats: new Set(state.applications.filter((a) =>
      a.projectId === p.id && a.status === 'accepted' && a.githubInvite === 'pending' &&
      !state.memberships.some((m) => m.projectId === p.id && m.userId === a.userId && !m.leftAt),
    ).map((a) => a.userId)).size })),
    validationQueueSize: state.validationRequests.filter((r) => r.status === 'queued').length,
  }
  if (isStaff(userOf(state, context.admin))) return view
  const viewer = (ownerId: string) => (ownerId === me ? 'owner' : me ? 'member' : 'visitor')
  const published = new Set(state.users.filter((u) => u.published).map((u) => u.id))
  const captainOf = (projectId: string) => {
    const project = state.projects.find((p) => p.id === projectId)
    return state.squads.find((s) => s.id === project?.squadId)?.captainId
  }
  const manages = (projectId: string) => !!me && (captainOf(projectId) === me || userOf(state, context.web)?.role === 'super-admin')
  const participates = (projectId: string) => !!me && state.memberships.some((m) => m.userId === me && m.projectId === projectId && !m.leftAt)
  const requests = state.validationRequests.filter((r) => !!me && (r.memberId === me || r.validatorId === me))
  const assignedDeliveries = new Set(requests.filter((r) => r.validatorId === me).flatMap((r) => r.deliveryIds))
  const validations = state.validations.filter((v) =>
    (v.status === 'recorded' && (v.memberId === me || v.validatorId === me || (v.published && published.has(v.memberId)))) ||
    (!!me && v.validatorId === me && requests.some((r) => r.id === v.requestId && r.validatorId === me)),
  )
  const visibleValidations = new Set(validations.map((v) => v.id))
  const feedPosts = state.feedPosts
    .filter((p) => p.userId === me || (!p.deletedAt && ((me && p.sharedOnFeed) || (p.shownOnProfile && published.has(p.userId)))))
    .map((p) => p.userId === me ? { ...p, removal: hideRemover(p.removal) } : { ...p, revisions: [], reactions: p.showReactionCounts ? p.reactions : p.reactions.filter((r) => r.userId === me) })
  const visibleCollections = new Set(feedPosts.flatMap((p) => p.collectionIds))
  // Comments are for members reading the Feed; a deleted one stays only for moderation.
  const discussed = new Set(feedPosts.filter((p) => p.sharedOnFeed && !p.deletedAt).map((p) => p.id))
  return {
    ...view,
    users: state.users.map((u) => u.id === me ? u : publicUser(u)),
    profiles: state.profiles.filter((p) => p.userId === me || published.has(p.userId)).map((p) => {
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
    feedPosts,
    // A project shows wherever the publication that shares it shows.
    memberProjects: state.memberProjects
      .filter((p) => feedPosts.some((post) => post.projectId === p.id && !post.deletedAt))
      .map((p) => (p.userId === me ? p : { ...p, revisions: [] })),
    // The author of a comment the staff removed keeps seeing it, with the reason, in its place.
    feedComments: me
      ? state.feedComments
          .filter((c) => discussed.has(c.postId) && (!c.deletedAt || (c.userId === me && c.removal)))
          .map((c) => ({ ...c, removal: hideRemover(c.removal) }))
      : [],
    discussions: state.discussions.filter((discussion) => canReadDiscussion(state, discussion, me)),
    // The Showcase is between members: a visitor reads none of it.
    showcaseProjects: me ? state.showcaseProjects : [],
    showcaseFeedbacks: me ? state.showcaseFeedbacks : [],
    feedCollections: state.feedCollections.filter((c) => c.userId === me || visibleCollections.has(c.id)),
    feedBookmarks: state.feedBookmarks.filter((b) => b.userId === me),
    applications: state.applications.filter((a) => !!me && (a.userId === me || manages(a.projectId))),
    entryTests: state.entryTests.filter((t) => t.userId === me || published.has(t.userId) || state.applications.some((a) => a.userId === t.userId && manages(a.projectId))),
    boardItems: state.boardItems.filter((b) => manages(b.projectId) || participates(b.projectId)),
    deliveries: state.deliveries.flatMap((d) => {
      const internal = manages(d.projectId) || participates(d.projectId) || assignedDeliveries.has(d.id) || d.credits.some((c) => c.userId === me)
      if (internal) return [d]
      return d.status === 'accepted' ? [{ ...d, context: '', returnedReason: null, decisions: [] }] : []
    }),
    githubSync: { ...state.githubSync, repositories: [], divergences: [] },
    validatorApplications: state.validatorApplications.filter((a) => a.userId === me),
    validators: state.validators.filter((v) => v.userId === me || (published.has(v.userId) && !v.suspension)).map((v) => v.userId === me ? v : {
      ...v, jobTitle: v.showEmployer ? v.jobTitle : '', company: v.showEmployer ? v.company : '', lastAssignedAt: null,
    }),
    validationRequests: requests.map((r) => ({ ...r, conflicts: [] })),
    validationQueueSize: state.validators.some((v) => v.userId === me && !v.suspension) ? view.validationQueueSize : undefined,
    validations: validations.map((v) => v.validatorId === me ? v : { ...v, review: null }),
    contestations: state.contestations.filter((c) => visibleValidations.has(c.validationId)).map((c) =>
      c.openedBy === me || validations.some((v) => v.id === c.validationId && v.memberId === me)
        ? c : { ...c, openedBy: '', reason: '', decision: null },
    ),
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

type Outcome = { output: unknown; failure: unknown; tracked: MockDb['events'] }

/**
 * Runs one action for the request's sessions and writes the result. `trusted` is for calls the API
 * builds itself, such as the GitHub OAuth callback, whose arguments come from GitHub, not the browser.
 */
export async function execute(context: Context, call: { module: string; export: string; args: unknown[] }, trusted = false): Promise<Outcome> {
  if (!MODULES.has(call.module) || !Array.isArray(call.args)) throw new HttpError('Ação desconhecida.', 404)
  const exports = (await import(`${ROOT}${call.module}.ts`)) as Record<string, unknown>
  const fn = exports[call.export]
  if (typeof fn !== 'function') throw new HttpError('Ação desconhecida.', 404)

  const { state: before, matched } = stateFor(context, call.args)
  if (!trusted) authorize(call.module, fn as Fn, call.args, before, context)
  const receiptGuard = call.module.startsWith('modules/panel-admin/') ? 'admin' : 'web'
  const receiptSession = context[receiptGuard]
  const key = !trusted && !call.module.endsWith('/auth/actions') && call.module !== 'mocks/github'
    && receiptSession?.user_id ? context.request.headers.get('idempotency-key') : null
  if (key !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) throw new HttpError('Idempotency-Key inválida.', 400)
  const scope = createHash('sha256').update(JSON.stringify([receiptGuard, receiptSession?.id, receiptSession?.user_id])).digest('hex')
  const payloadHash = createHash('sha256').update(JSON.stringify(call)).digest('hex')
  if (key) {
    const receipt = first<{ payload_hash: string; output: string }>('SELECT payload_hash,output FROM action_receipts WHERE scope=$scope AND key=$key AND expires_at>$at', { scope, key, at: Date.now() })
    if (receipt) {
      if (receipt.payload_hash !== payloadHash) throw new HttpError('Esta chave já foi usada com outra ação.', 409)
      return { output: JSON.parse(receipt.output), failure: undefined, tracked: [] }
    }
  }
  db.set(() => before)
  let output: unknown
  let failure: unknown
  try {
    // The browser's mock sweep is a simulation, not evidence from GitHub. The backend queues a
    // real sweep after the same guard/actor authorization, without reopening local returned work.
    output = call.module === 'modules/panel-admin/features/system/github/actions' && call.export === 'syncGithub'
      ? { queued: true, created: 0 }
      : await (fn as Fn)(...call.args)
  } catch (error) {
    failure = error
  }
  // Like the mock, what the action wrote before refusing stays (an underage sign-up drops the social login).
  persist(context, db.get(), matched, failure ? undefined : () => {
    completePendingGithubIdentity(context.web?.id, db.get())
    enqueueGithubEffects(call, before, db.get())
    if (key) {
      sql.query('DELETE FROM action_receipts WHERE expires_at<=?').run(Date.now())
      sql.query('INSERT INTO action_receipts(scope,key,payload_hash,output,expires_at) VALUES(?,?,?,?,?)')
        .run(scope, key, payloadHash, JSON.stringify(output ?? null), Date.now() + 48 * 60 * 60 * 1000)
    }
  })
  console.log(`${call.module}.${call.export} ${failure ? `→ ${failure instanceof Error ? failure.message : failure}` : 'ok'}`)
  // The product events the action sent, for the browser's debug log.
  return { output, failure, tracked: db.get().events.filter((event) => !before.events.includes(event)) }
}

/** Runs `work` with the request's sessions, one write at a time. */
export function withContext<T>(request: Request, work: (context: Context) => Promise<T>): Promise<T> {
  return exclusive(() => work(contextOf(request)))
}

/** POST /api/actions/:name, body { module, export, args }: runs one action. */
export async function runAction(request: Request, _name: string, body: { module: string; export: string; args: unknown[] }) {
  const { context, outcome } = await withContext(request, async (context) => ({ context, outcome: await execute(context, body) }))
  const { output, failure, tracked } = outcome
  if (failure instanceof MockError) return respond(context, { message: failure.message, field: failure.field ?? null, tracked }, 422)
  if (failure) throw failure
  // External effects are durable intents committed with the model, never awaited by the request.
  return respond(context, { output: output ?? null, tracked })
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
    const visible = publicUser(old)
    return Object.fromEntries(Object.entries(next).map(([key, value]) => [
      key, JSON.stringify(value) === JSON.stringify(visible[key as keyof User]) ? old[key as keyof User] : value,
    ]))
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
  if (collection === 'memberProjects') {
    const [next, old] = [item as MockDb['memberProjects'][number], stored as MockDb['memberProjects'][number]]
    return next.revisions.length === 0 ? { ...next, revisions: old.revisions } : next
  }
  return item
}

/** POST /api/debug/reset: loads the seed again; every session ends with it. */
export function resetState(request: Request) {
  return exclusive(async () => {
    if (!DEBUG) throw new HttpError('O modo debug está desligado na API.', 403)
    clearAuthMail()
    await seed()
    const context: Context = { request, cookies: [sessionCookie('web', null), sessionCookie('admin', null)] }
    return respond(context, { output: null })
  })
}
