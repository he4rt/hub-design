import { createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

/*
 * The Hub's GitHub App: its credentials and calls to the GitHub API as the App's installation in the
 * organization. The credentials come from the manifest flow (server/github.ts) or the environment.
 */

export const CREDENTIALS_PATH = process.env.GITHUB_APP_CREDENTIALS ?? `${process.env.HOME}/.config/he4rt-hub/github-app.json`

export type AppCredentials = {
  appId?: number
  clientId: string
  clientSecret: string
  webhookSecret?: string | null
  privateKey?: string
}

export function appCredentials(): AppCredentials | null {
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return {
      appId: Number(process.env.GITHUB_APP_ID) || undefined,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? null,
      privateKey: process.env.GITHUB_PRIVATE_KEY?.replaceAll('\\n', '\n'),
    }
  }
  if (!existsSync(CREDENTIALS_PATH)) return null
  return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8')) as AppCredentials
}

export class GithubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API = 'https://api.github.com'
const HEADERS = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'he4rt-hub' }

/** A short-lived JWT that identifies the App itself (RS256, at most 10 minutes). */
function appJwt(app: AppCredentials): string {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: now - 60, exp: now + 540, iss: String(app.appId) })}`
  return `${body}.${createSign('RSA-SHA256').update(body).sign(app.privateKey!, 'base64url')}`
}

let cached: { org: string; token: string; expiresAt: number } | null = null

/** Installation token for the organization, reused until a minute before it expires. */
async function installationToken(org: string): Promise<string> {
  if (cached?.org === org && cached.expiresAt - Date.now() > 60_000) return cached.token
  const app = appCredentials()
  if (!app?.appId || !app.privateKey) throw new GithubError('O GitHub App não está configurado.', 0)
  const jwt = { ...HEADERS, authorization: `Bearer ${appJwt(app)}` }
  const installation = await fetch(`${API}/orgs/${org}/installation`, { headers: jwt, signal: AbortSignal.timeout(30_000) })
  if (!installation.ok) throw new GithubError(`O App não está instalado em ${org}.`, installation.status)
  const { id } = (await installation.json()) as { id: number }
  const response = await fetch(`${API}/app/installations/${id}/access_tokens`, { method: 'POST', headers: jwt, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new GithubError('O GitHub não emitiu o token da instalação.', response.status)
  const { token, expires_at } = (await response.json()) as { token: string; expires_at: string }
  cached = { org, token, expiresAt: Date.parse(expires_at) }
  return token
}

/** Whether the App can act on GitHub (credentials with a private key). */
export function githubEnabled(): boolean {
  const app = appCredentials()
  return !!app?.appId && !!app.privateKey
}

/** REST call as the installation. Returns null for 404; throws on other errors. */
export async function rest<T>(org: string, method: string, path: string, body?: unknown): Promise<T | null> {
  const response = await fetch(`${API}${path}`, {
    method,
    signal: AbortSignal.timeout(30_000),
    headers: { ...HEADERS, authorization: `Bearer ${await installationToken(org)}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 404 && ['GET', 'DELETE'].includes(method)) return null
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { message?: string }
    throw new GithubError(`${method} ${path}: ${detail.message ?? response.statusText}`, response.status)
  }
  return response.status === 204 ? ({} as T) : ((await response.json()) as T)
}

/** GraphQL call as the installation (Projects v2 only exists in GraphQL). */
export async function graphql<T>(org: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${API}/graphql`, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: { ...HEADERS, authorization: `Bearer ${await installationToken(org)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const result = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (!response.ok || result.errors?.length || !result.data) {
    throw new GithubError(result.errors?.map((e) => e.message).join('; ') ?? `GraphQL HTTP ${response.status}`, response.status)
  }
  return result.data
}
