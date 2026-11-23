import { chmodSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { MockError } from '@/mocks/mock-action'
import { execute, HttpError, withContext } from './actions'
import { appCredentials, CREDENTIALS_PATH } from './github-app'
import { bindGithubIdentity, jobs, saveResource, userIdByGithub } from './github-effects'
import { readState } from './database/read-state'

/*
 * Creates the Hub's GitHub App with GitHub's manifest flow: the page posts the App's configuration
 * to GitHub from the user's own browser, GitHub creates it and redirects back with a one-time code,
 * and the API exchanges the code for the App's credentials. Nobody types a password or token here.
 * https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
 */

/** GitHub organization names: letters, digits and single hyphens. */
const ORG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i

/** States issued by the page, so the callback only accepts a code from a flow this API started. */
const states = new Map<string, number>()
const STATE_TTL_MS = 60 * 60 * 1000

/** A custom portal hostname goes in HUB_PUBLIC_URL (.env.local); otherwise the portal's generated URL. */
function publicUrl(): string {
  const url = process.env.HUB_PUBLIC_URL ?? process.env.HUB_PORTAL_URL
  if (!url) throw new HttpError('Defina HUB_PUBLIC_URL com a URL pública do Hub.', 500)
  return url.replace(/\/$/, '')
}

function manifest(base: string, name: string) {
  return {
    // App names are unique across GitHub; GitHub lets the owner change it before creating.
    name,
    url: base,
    description: 'He4rt Hub: login com GitHub, squads, boards e teste de entrada.',
    // Private to the organization; members sign in through the separate OAuth App (GITHUB_OAUTH_*).
    public: false,
    redirect_url: `${base}/api/github/manifest/callback`,
    // Sign in with GitHub and the onboarding's required GitHub link.
    callback_urls: [`${base}/api/github/oauth/callback`],
    request_oauth_on_install: false,
    // The portal reaches GitHub; deliveries are signed with the webhook secret (POST /api/github/webhook).
    hook_attributes: { url: `${base}/api/github/webhook`, active: true },
    default_permissions: {
      // Create the project's repository; read what members commit, open and review.
      administration: 'write',
      // Write: linking the board to the repository (linkProjectV2ToRepository) needs it.
      contents: 'write',
      metadata: 'read',
      issues: 'read',
      pull_requests: 'write',
      // Invite accepted members to the organization and see who joined.
      members: 'write',
      // Create and read the project's board (GitHub Projects v2).
      organization_projects: 'write',
      // The member's verified e-mails at sign-in ("Email addresses"; GitHub calls it `emails`).
      emails: 'read',
    },
    default_events: [
      // Entry test and deliveries: opened, merged, closed.
      'pull_request',
      'pull_request_review',
      // Accepted invite (member_added) and members leaving the organization.
      'organization',
      'membership',
      'projects_v2',
      // Board items moved, created or archived.
      'projects_v2_item',
      // Repositories created, renamed or archived outside the Hub.
      'repository',
    ],
  }
}

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>:root{color-scheme:light dark}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:Canvas;color:CanvasText}
main{max-width:720px;margin:0 auto;padding:32px 16px;display:grid;gap:16px}h1{font-size:22px;margin:0}
pre{overflow:auto;max-height:50dvh;padding:12px;border:1px solid #8884;border-radius:8px;font-size:13px}
button{font:inherit;padding:10px 16px;border-radius:8px;border:0;background:#6d28d9;color:#fff;cursor:pointer}p{margin:0}</style>
</head><body><main>${body}</main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'x-amp-review-widget': 'off' } },
  )
}

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * GET /api/github/manifest?org=&name=: the page that sends the manifest to GitHub. Without `org`
 * it asks for the organization first.
 */
export function manifestPage(request: Request): Response {
  const base = publicUrl()
  const params = new URL(request.url).searchParams
  const org = (params.get('org') ?? '').trim()
  const name = (params.get('name') ?? '').trim() || 'He4rt Hub Sandbox'
  if (!ORG_PATTERN.test(org)) {
    return page(
      'Criar o GitHub App do Hub',
      `<h1>Em qual organização criar o GitHub App do Hub?</h1>
<p>Você precisa ser owner dela. O App fica privado e é instalado na própria organização.</p>
<form method="get" style="display:grid;gap:8px">
<label>Organização <input name="org" required pattern="[A-Za-z0-9-]+" placeholder="he4rt-hub-sandbox" value="${escape(org)}" style="font:inherit;padding:8px;width:100%"></label>
<label>Nome do App <input name="name" value="${escape(name)}" style="font:inherit;padding:8px;width:100%"></label>
<button>Continuar</button>
</form>`,
    )
  }
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
  states.set(state, Date.now())
  const json = JSON.stringify(manifest(base, name), null, 2)
  const action = `https://github.com/organizations/${org}/settings/apps/new?state=${state}`
  return page(
    'Criar o GitHub App do Hub',
    `<h1>Criar o GitHub App do Hub na organização ${escape(org)}</h1>
<p>O botão envia esta configuração ao GitHub pelo seu navegador. Lá você confirma o nome e cria o App;
o GitHub volta para cá, a API guarda as credenciais e mostra o link para instalar o App na organização.</p>
<pre>${escape(json)}</pre>
<form action="${escape(action)}" method="post">
<input type="hidden" name="manifest" value="${escape(json)}">
<button>Criar o App no GitHub</button>
</form>`,
  )
}

type Conversion = {
  id: number
  slug: string
  name: string
  html_url: string
  client_id: string
  client_secret: string
  webhook_secret: string | null
  pem: string
  owner: { login: string }
}

/** GET /api/github/manifest/callback?code=&state=: exchanges the code for the App's credentials. */
export async function manifestCallback(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  const state = params.get('state') ?? ''
  const issued = states.get(state)
  states.delete(state)
  if (!code || !issued || Date.now() - issued > STATE_TTL_MS) {
    return page('Link inválido', '<h1>Este link expirou ou não veio desta API.</h1><p>Abra /api/github/manifest de novo.</p>')
  }
  const response = await fetch(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`, {
    method: 'POST',
    headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'he4rt-hub' },
  })
  if (!response.ok) {
    console.error(`[github] conversão do manifest falhou: HTTP ${response.status} ${await response.text()}`)
    return page('Falhou', `<h1>O GitHub recusou o código (HTTP ${response.status}).</h1><p>Ele vale uma hora e uma vez só.</p>`)
  }
  const app = (await response.json()) as Conversion
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 })
  // Keeps the previous App's credentials beside the new ones, in case it is still needed.
  if (existsSync(CREDENTIALS_PATH)) renameSync(CREDENTIALS_PATH, `${CREDENTIALS_PATH}.${Date.now()}.bak`)
  writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify({
      appId: app.id,
      slug: app.slug,
      owner: app.owner.login,
      htmlUrl: app.html_url,
      clientId: app.client_id,
      clientSecret: app.client_secret,
      webhookSecret: app.webhook_secret,
      privateKey: app.pem,
      createdAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  )
  chmodSync(CREDENTIALS_PATH, 0o600)
  console.log(`[github] App ${app.slug} (id ${app.id}) criado em ${app.owner.login}; credenciais guardadas.`)
  return page(
    'GitHub App criado',
    `<h1>App ${escape(app.name)} criado em ${escape(app.owner.login)}</h1>
<p>As credenciais ficaram com a API; nenhuma aparece aqui. Falta instalar o App na organização:</p>
<p><a href="${escape(app.html_url)}/installations/new">Instalar ${escape(app.slug)} na ${escape(app.owner.login)}</a></p>`,
  )
}

/*
 * Sign in with GitHub and the onboarding's GitHub link, through the App's user authorization (OAuth).
 * The callback runs the same actions the simulated flow runs (socialLogin, connectAccount), with the
 * identity GitHub returned, so the rules stay in the actions.
 */

type Credentials = { clientId: string; clientSecret: string; webhookSecret?: string | null }

/**
 * Sign in with GitHub uses its own OAuth App: the GitHub App stays private to the organization, and
 * GitHub only lets members of the owning organization sign in to a private App, while people sign in
 * to the Hub long before they join it. Without an OAuth App, the GitHub App's own OAuth is used.
 */
const credentials = (): Credentials | null =>
  process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET
    ? { clientId: process.env.GITHUB_OAUTH_CLIENT_ID, clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET }
    : appCredentials()

type OAuthFlow = { mode: 'login' | 'link'; redirect: string; at: number }
const flows = new Map<string, OAuthFlow>()
const OAUTH_COOKIE = 'hub_github_oauth'

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  headers.append('set-cookie', `${OAUTH_COOKIE}=; Max-Age=0; Path=/api/github; HttpOnly; SameSite=Lax`)
  return new Response(null, { status: 302, headers })
}

/** GET /api/github/oauth/start?mode=login|link&redirect=/app/...: sends the browser to GitHub. */
export function oauthStart(request: Request): Response {
  const app = credentials()
  if (!app) return page('GitHub não configurado', '<h1>O GitHub App do Hub ainda não foi criado.</h1><p>Abra /api/github/manifest.</p>')
  const params = new URL(request.url).searchParams
  const target = params.get('redirect') ?? '/app'
  const flow: OAuthFlow = {
    mode: params.get('mode') === 'link' ? 'link' : 'login',
    // Only paths of the member area: never an open redirect.
    redirect: /^\/app(\/|$|\?)/.test(target) ? target : '/app',
    at: Date.now(),
  }
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
  flows.set(state, flow)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', `${publicUrl()}/api/github/oauth/callback`)
  url.searchParams.set('state', state)
  // OAuth Apps need the scopes to read the verified e-mails; GitHub Apps ignore them.
  url.searchParams.set('scope', 'read:user user:email')
  // The state is bound to this browser, so a link someone else started cannot sign this browser in.
  return new Response(null, {
    status: 302,
    headers: { location: url.toString(), 'set-cookie': `${OAUTH_COOKIE}=${state}; Max-Age=600; Path=/api/github; HttpOnly; SameSite=Lax` },
  })
}

type GithubUser = { id: number; login: string; name: string | null; email: string | null }

async function githubIdentity(app: Credentials, code: string) {
  const token = (await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: app.clientId, client_secret: app.clientSecret, code, redirect_uri: `${publicUrl()}/api/github/oauth/callback` }),
  }).then((r) => r.json())) as { access_token?: string; error_description?: string }
  if (!token.access_token) throw new Error(token.error_description ?? 'GitHub não devolveu o token.')
  const headers = { authorization: `Bearer ${token.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'he4rt-hub' }
  const user = (await fetch('https://api.github.com/user', { headers }).then((r) => r.json())) as GithubUser
  if (!Number.isSafeInteger(user.id) || user.id <= 0 || !user.login) throw new Error('O GitHub não confirmou a identidade numérica.')
  // Needs the App's "Email addresses" permission; without it only the public e-mail is known.
  const emails = await fetch('https://api.github.com/user/emails', { headers }).then((r) => (r.ok ? r.json() : []))
  const list = emails as { email: string; primary: boolean; verified: boolean }[]
  const primary = list.find((e) => e.primary && e.verified)
  return {
    githubId: user.id,
    handle: user.login,
    name: user.name ?? user.login,
    email: primary?.email ?? user.email,
    emailVerified: !!primary,
    /** Every address GitHub confirmed for this member, lowercased. */
    verifiedEmails: list.filter((e) => e.verified).map((e) => e.email.toLowerCase()),
  }
}

/** GET /api/github/oauth/callback?code=&state=: GitHub sends the member back here. */
export async function oauthCallback(request: Request): Promise<Response> {
  const app = credentials()
  const params = new URL(request.url).searchParams
  const state = params.get('state') ?? ''
  const flow = flows.get(state)
  flows.delete(state)
  const cookie = new Bun.CookieMap(request.headers.get('cookie') ?? '').get(OAUTH_COOKIE)
  const code = params.get('code')
  if (!app || !flow || cookie !== state || Date.now() - flow.at > 10 * 60 * 1000) {
    return page('Link inválido', '<h1>Este login com GitHub expirou.</h1><p><a href="/app/login">Tente de novo</a>.</p>')
  }
  if (!code) return redirect(flow.mode === 'link' ? flow.redirect : '/app/login')

  let identity: Awaited<ReturnType<typeof githubIdentity>>
  try {
    identity = await githubIdentity(app, code)
  } catch {
    console.error('[github] OAuth não confirmou a identidade.')
    return page('Falhou', '<h1>O GitHub não confirmou o login.</h1><p><a href="/app/login">Tente de novo</a>.</p>')
  }

  return withContext(request, async (context) => {
    const back = (message: string) =>
      page('Não deu certo', `<h1>${escape(message)}</h1><p><a href="${escape(flow.redirect)}">Voltar para o Hub</a>.</p>`)

    if (flow.mode === 'link') {
      if (!context.web?.user_id) return redirect('/app/login')
      const ownerId = userIdByGithub(readState(), { id: identity.githubId, login: identity.handle })
      if (ownerId && ownerId !== context.web.user_id) return back('Este GitHub já está vinculado a outra conta.')
      const { failure } = await execute(
        context,
        { module: 'modules/panel-app/features/account/settings/actions', export: 'connectAccount', args: [context.web.user_id, 'github', identity.handle] },
        true,
      )
      // Linking it twice is not a failure: the onboarding just moves on.
      if (failure instanceof MockError && !failure.message.includes('já está vinculado.')) return back(failure.message)
      if (failure && !(failure instanceof MockError)) throw failure
      bindGithubIdentity(context.web.user_id, identity.githubId, identity.handle)
      return redirect(flow.redirect, context.cookies)
    }

    // An account that already has this GitHub signs in with it, whatever e-mail GitHub shows.
    const { readUsers } = await import('./database/read-state')
    const users = readUsers()
    const numericOwner = userIdByGithub(readState(), { id: identity.githubId, login: identity.handle })
    const owner = users.find((u) => u.id === numericOwner)
    // Legacy handles must be re-verified by a matching verified e-mail, never by handle alone.
    const legacy = users.find((u) => u.linkedAccounts.some((a) => a.provider === 'github' && a.handle.toLowerCase() === identity.handle.toLowerCase()))
    if (legacy && legacy.id !== owner?.id && !identity.verifiedEmails.includes(legacy.email.toLowerCase())) return back('Entre com sua senha e vincule novamente o GitHub.')
    const email = owner?.email ?? identity.email
    if (!email) {
      return back('Seu GitHub não mostra um e-mail. Crie a conta com e-mail e senha e vincule o GitHub nas perguntas do perfil.')
    }
    const { output, failure } = await execute(
      context,
      {
        module: 'modules/panel-app/features/auth/actions',
        export: 'socialLogin',
        // The e-mail counts as confirmed only when GitHub confirmed that very address.
        args: ['github', { name: identity.name, email, emailVerified: identity.verifiedEmails.includes(email.toLowerCase()), handle: identity.handle }],
      },
      true,
    )
    if (failure instanceof MockError) return back(failure.message)
    if (failure) throw failure
    const result = output as { status: string; email?: string; needsOnboarding?: boolean }
    if (context.web?.user_id) bindGithubIdentity(context.web.user_id, identity.githubId, identity.handle)
    else if (context.web?.id) saveResource(`oauth:${context.web.id}`, { id: identity.githubId, login: identity.handle })
    if (result.status === 'needs-sign-up') return redirect('/app/register', context.cookies)
    if (result.status === 'needs-password') return redirect(`/app/login?email=${encodeURIComponent(result.email ?? '')}`, context.cookies)
    return redirect(result.needsOnboarding ? '/app/onboarding' : flow.redirect, context.cookies)
  })
}

/**
 * POST /api/github/webhook: events GitHub sends to the App. Only signed deliveries are accepted
 * (X-Hub-Signature-256, HMAC of the body with the App's webhook secret).
 */
export async function webhook(request: Request): Promise<Response> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? appCredentials()?.webhookSecret
  const raw = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  const expected = `sha256=${new Bun.CryptoHasher('sha256', secret ?? '').update(raw).digest('hex')}`
  const valid = !!secret && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  const event = request.headers.get('x-github-event')
  if (!valid) {
    console.log(`[github] webhook ${event} recusado: assinatura inválida`)
    return Response.json({ message: 'Assinatura inválida.' }, { status: 401 })
  }
  const delivery = request.headers.get('x-github-delivery')
  if (!delivery || delivery.length > 200 || !event) return Response.json({ message: 'Entrega sem identificação.' }, { status: 400 })
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error()
  } catch {
    return Response.json({ message: 'JSON inválido.' }, { status: 400 })
  }
  // SQLite commit precedes the 202. A restart cannot lose an acknowledged delivery.
  const inserted = jobs.enqueue('webhook', `delivery:${delivery}`, { event, payload })
  return Response.json({ received: true, duplicate: !inserted }, { status: 202 })
}
