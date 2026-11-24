import './runtime'
import { all, hasSchema, sql } from './database/connection'
import { migrateFeed } from './database/migrate-feed'
import { migrateFeedRemoval } from './database/migrate-feed-removal'
import { migrateProfileAbout } from './database/migrate-profile-about'
import { migrateProfileCover } from './database/migrate-profile-cover'
import { migrateSpokenLanguages } from './database/migrate-spoken-languages'
import { currentSession } from './auth'
import { seed } from './database/seed'
import { startGithubWorker } from './github-sync'
import { manifestCallback, manifestPage, oauthCallback, oauthStart, webhook } from './github'
import { applyDebugPatch, DEBUG, HttpError, resetState, runAction, showState } from './actions'
import { confirmEmailVerification, developmentMail, dispatchAuthMail, emailVerificationPage } from './mail-auth'

/*
 * He4rt Hub API: Bun.serve + SQLite. Runs beside the Vite dev server, which proxies /api here, so
 * the browser sees one origin and the session cookies are first-party.
 */

if (!hasSchema()) await seed()
migrateFeed(sql)
migrateProfileCover(sql)
migrateFeedRemoval(sql)
migrateProfileAbout(sql)
migrateSpokenLanguages(sql)
startGithubWorker()
process.env.APP_URL ??= process.env.HUB_PUBLIC_URL ?? process.env.HUB_PORTAL_URL
if (process.env.MAIL_TRANSPORT === 'resend' && process.env.MAIL_RESEND_API_KEY && process.env.MAIL_FROM) {
  let dispatching = false
  setInterval(async () => {
    if (dispatching) return
    dispatching = true
    try { await dispatchAuthMail() } catch { console.error('[mail] envio pendente; nova tentativa agendada.') }
    finally { dispatching = false }
  }, 5000)
}

type Handler = (request: Request, params: string[]) => Response | Promise<Response>

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError('O corpo da requisição precisa ser JSON.', 400)
  }
}

const json = (data: unknown) => Response.json(data)

/** Method, path pattern (`:param` segments) and handler, like routes/web.php. */
const routes: [string, string, Handler][] = [
  ['GET', '/api', () => new Response(Bun.file(new URL('./explorer.html', import.meta.url).pathname))],
  ['GET', '/api/health', () => json({ ok: true, debug: DEBUG })],
  ['GET', '/api/state', (r) => showState(r)],
  ['POST', '/api/actions/:name', async (r, [name]) => runAction(r, name, await body(r))],
  ['POST', '/api/debug/state', async (r) => applyDebugPatch(r, await body(r))],
  ['POST', '/api/debug/reset', (r) => resetState(r)],
  ['GET', '/api/debug/mail', (r) => developmentMail(r)],
  ['GET', '/api/auth/email/verify', (r) => emailVerificationPage(r)],
  ['POST', '/api/auth/email/verify', (r) => confirmEmailVerification(r)],
  ['GET', '/api/github/manifest', (r) => manifestPage(r)],
  ['GET', '/api/github/manifest/callback', (r) => manifestCallback(r)],
  ['GET', '/api/github/oauth/start', (r) => oauthStart(r)],
  ['GET', '/api/github/oauth/callback', (r) => oauthCallback(r)],
  ['POST', '/api/github/webhook', (r) => webhook(r)],
  ['POST', '/webhooks/github', (r) => webhook(r)],
  ['GET', '/api/github/jobs', (r) => {
    const session = currentSession(r, 'admin')
    const user = session && all<{ role: string }>('SELECT role FROM users WHERE id=$id', { id: session.user_id })[0]
    if (!user || !['admin', 'super-admin'].includes(user.role)) throw new HttpError('Entre na administração.', 401)
    return json({ jobs: all(`SELECT id,kind,dedupe_key,status,attempts,available_at,last_error,created_at,completed_at FROM github_jobs ORDER BY id DESC LIMIT 200`) })
  }],
  ['GET', '/api/tables', () => json({ tables: tableCounts() })],
  ['GET', '/api/tables/:name', (_, [name]) => json(tableRows(name))],
]

function match(method: string, path: string): [Handler, string[]] | undefined {
  const parts = path.replace(/\/$/, '').split('/')
  for (const [m, pattern, handler] of routes) {
    const expected = pattern.split('/')
    if (m !== method || expected.length !== parts.length) continue
    const params: string[] = []
    if (expected.every((segment, i) => (segment.startsWith(':') ? params.push(decodeURIComponent(parts[i])) : segment === parts[i]))) {
      return [handler, params]
    }
  }
  return undefined
}

function tableNames(): string[] {
  return all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid").map((t) => t.name)
}

function tableCounts() {
  return tableNames().map((name) => ({ name, rows: all<{ n: number }>(`SELECT COUNT(*) AS n FROM "${name}"`)[0].n }))
}

/** Rows of one table for the explorer; secrets are masked. */
function tableRows(name: string) {
  if (!tableNames().includes(name)) throw new HttpError('Tabela não encontrada.', 404)
  const masked: Record<string, string[]> = { users: ['password'], sessions: ['id'], pending_social_identities: ['session_id'], password_reset_tokens: ['token'], github_resources: ['key'], github_jobs: ['payload'] }
  const rows = all<Record<string, unknown>>(`SELECT * FROM "${name}" ORDER BY rowid LIMIT 200`).map((row) => {
    for (const column of masked[name] ?? []) if (row[column]) row[column] = '••••'
    return row
  })
  return { name, rows }
}

const server = Bun.serve({
  port: Number(process.env.API_PORT ?? 3001),
  hostname: '127.0.0.1',
  async fetch(request) {
    const url = new URL(request.url)
    const found = match(request.method, url.pathname)
    if (!found) return Response.json({ message: 'Rota não encontrada.' }, { status: 404 })
    // A write from another origin never carries the session: same origin only, like Laravel's CSRF check.
    const origin = request.headers.get('origin')
    if (request.method !== 'GET' && origin && new URL(origin).host !== (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host)) {
      return Response.json({ message: 'Origem não permitida.' }, { status: 403 })
    }
    try {
      const development = url.pathname === '/api' || url.pathname.startsWith('/api/tables') || url.pathname.startsWith('/api/github/manifest')
      if (development) {
        if (!DEBUG) throw new HttpError('Rota não encontrada.', 404)
        const session = currentSession(request, 'admin')
        const staff = session && all<{ role: string }>('SELECT role FROM users WHERE id = $id', { id: session.user_id })[0]
        if (!staff || !['admin', 'super-admin'].includes(staff.role)) throw new HttpError('Entre na administração.', 401)
      }
      return await found[0](request, found[1])
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ message: error.message, field: error.field ?? null }, { status: error.status })
      console.error(error)
      return Response.json({ message: 'Algo deu errado.' }, { status: 500 })
    }
  },
})

console.log(`API em http://${server.hostname}:${server.port}${DEBUG ? ' (modo debug)' : ''}`)
