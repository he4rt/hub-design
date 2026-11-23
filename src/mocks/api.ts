import { logFinish, logStart } from '@/debug/debug-store'
import { db, type AnalyticsEvent, type MockDb } from './db'
import { MockError } from './mock-action'

/*
 * Browser side of the API (server/). The screens still read the store synchronously with `useDb`,
 * like the props of an Inertia page; the store now holds what the API sends for the signed-in
 * user. Writes go to the API, which answers with the new state.
 */

type Call = { module: string; name: string; args: unknown[] }

let current: Call | null = null

/**
 * Wraps an exported function of an actions module, so `mockAction` knows which function, with
 * which arguments, the API runs. The Vite plugin in vite.config.ts applies it to every export of
 * those modules; only the outermost call counts, so helpers called inside an action are ignored.
 */
export function remote<F extends (...args: never[]) => unknown>(module: string, name: string, fn: F): F {
  return ((...args: never[]) => {
    if (current) return fn(...args)
    current = { module, name, args }
    try {
      return fn(...args)
    } finally {
      current = null
    }
  }) as F
}

/** Called by `mockAction` before its first await: returns the request that runs this action on the API. */
export function callServer(action: string): () => Promise<unknown> {
  const call = current
  if (!call) throw new Error(`A ação ${action} precisa ser exportada de um actions.ts.`)
  const authenticated = !!(db.get().session || db.get().adminSession)
  const key = authenticated && call.module !== 'mocks/github' && !call.module.endsWith('/auth/actions') ? crypto.randomUUID() : undefined
  return () => send(`/api/actions/${action}`, { module: call.module, export: call.name, args: call.args }, key)
}

/** One request at a time, in order, so a debug change and the action after it never cross. */
let queue: Promise<unknown> = Promise.resolve()

function send(url: string, body: unknown, key?: string): Promise<unknown> {
  const request = queue.then(() => post(url, body, key))
  queue = request.catch(() => undefined)
  return request
}

async function post(url: string, body: unknown, key?: string): Promise<unknown> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(body),
  }
  // Only authenticated, receipted actions can retry an uncertain network result safely.
  const response = await fetch(url, options).catch((error: unknown) => {
    if (!key) throw error
    return fetch(url, options)
  })
  const data = (await response.json().catch(() => ({}))) as {
    output?: unknown
    state?: MockDb
    tracked?: AnalyticsEvent[]
    message?: string
    field?: string
  }
  for (const { event, props } of (data.tracked ?? []).toReversed()) logFinish(logStart(`analytics: ${event}`, props), { status: 'success' })
  // The state comes back on errors too: a refusal can change it, like an underage sign-up.
  if (data.state) applyServerState(data.state)
  if (response.status >= 400 && response.status < 500) throw new MockError(data.message ?? 'Algo deu errado.', data.field ?? undefined)
  if (!response.ok) throw new Error(data.message ?? `HTTP ${response.status}`)
  return data.output
}

/** Last state the API sent; debug changes are diffed against it. */
let snapshot: MockDb = db.get()
let applying = false

function applyServerState(state: MockDb) {
  applying = true
  snapshot = state
  db.set(() => state)
  applying = false
}

/** Loads the state before the first render, like the props of the first Inertia page. */
export async function loadServerState() {
  const response = await fetch('/api/state')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  applyServerState((await response.json()) as MockDb)
  db.subscribe(sendDebugChange)
  // The other person's decisions become visible when returning to the tab; no parallel stale GET.
  const refresh = () => {
    if (document.visibilityState !== 'visible') return
    const request = queue.then(async () => {
      const response = await fetch('/api/state')
      if (response.ok) applyServerState((await response.json()) as MockDb)
    })
    queue = request.catch(() => undefined)
  }
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
}

/** "Resetar dados mockados": the API loads the seed again and signs everyone out. */
export function resetDb() {
  return send('/api/debug/reset', {})
}

/*
 * Debug shortcuts change the store directly ("Entrar como Rafael", "Esvaziar o fórum"). Each change
 * goes to the API as a patch of the collections it touched, so the database follows the screen.
 */

/** Items without an `id` are identified by these fields. */
const KEYS: Partial<Record<keyof MockDb, string[]>> = {
  profiles: ['userId'],
  entryTests: ['userId'],
  validators: ['userId'],
  feedBookmarks: ['userId', 'postId'],
  achievementChoices: ['userId', 'key'],
  passwordResets: ['token'],
}

export function itemKey(collection: string, item: unknown): string {
  const record = item as Record<string, unknown>
  const fields = KEYS[collection as keyof MockDb]
  if (fields) return fields.map((field) => String(record[field])).join(':')
  return typeof record.id === 'string' ? record.id : JSON.stringify(item)
}

export type StatePatch = {
  set: Record<string, unknown>
  arrays: Record<string, { keys: string[]; upserts: unknown[]; deletes: string[] }>
}

function sendDebugChange() {
  if (applying) return
  const next = db.get()
  const patch: StatePatch = { set: {}, arrays: {} }
  for (const key of Object.keys(next) as (keyof MockDb)[]) {
    const before = snapshot[key]
    const after = next[key]
    if (before === after) continue
    if (Array.isArray(after) && Array.isArray(before)) {
      const old = new Map(before.map((item) => [itemKey(key, item), item]))
      const keys = after.map((item) => itemKey(key, item))
      patch.arrays[key] = {
        keys,
        upserts: after.filter((item, i) => old.get(keys[i]) !== item),
        deletes: [...old.keys()].filter((k) => !keys.includes(k)),
      }
    } else {
      patch.set[key] = after
    }
  }
  snapshot = next
  send('/api/debug/state', patch).catch((error: unknown) => console.error('Mudança de debug recusada pela API:', error))
}
