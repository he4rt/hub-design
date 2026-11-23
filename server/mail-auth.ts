import { db } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'
import { installAuthMailGateway } from '@/modules/panel-app/lib/auth-mail'
import { currentSession } from './auth'
import { first, sql } from './database/connection'
import { AuthMailbox, configuredMailProvider } from './mail'

let mailbox: AuthMailbox | undefined

function localMailbox(): AuthMailbox {
  mailbox ??= new AuthMailbox({
    path: process.env.MAIL_DB_PATH ?? `${process.env.DB_PATH ?? new URL('./database/hub.sqlite', import.meta.url).pathname}.mail.sqlite`,
    publicUrl: process.env.APP_URL ?? process.env.HUB_PUBLIC_URL ?? process.env.HUB_PORTAL_URL,
    provider: configuredMailProvider(),
  })
  return mailbox
}

/** Called when the auth module loads, without opening or writing a database at import time. */
export function initializeAuthMail() {
  installAuthMailGateway({
    ready() {
      try { localMailbox().database.query('SELECT 1').get() } catch {
        throw new MockError('Não foi possível registrar a mensagem. Tente novamente mais tarde.')
      }
    },
    request(purpose, user) {
      try { localMailbox().request(purpose, user) } catch {
        throw new MockError('Não foi possível registrar a mensagem. Tente novamente mais tarde.')
      }
    },
    consume(purpose, token, users, apply) {
      try {
        localMailbox().consume(purpose, token, users, (user) => {
          apply(user)
          // Password recovery ends member sessions, but never the independent staff guard.
          if (purpose === 'password-reset') sql.query("DELETE FROM sessions WHERE user_id = ? AND guard = 'web'").run(user.id)
        })
      } catch {
        throw new MockError('Este link expirou ou já foi usado. Peça um novo.')
      }
    },
  })
}

/** GET /api/debug/mail. Enforces both gates even when the caller forgets route middleware. */
export function developmentMail(request: Request): Response {
  const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
  if (process.env.HUB_DEBUG !== '1') return Response.json({ message: 'Rota não encontrada.' }, { status: 404, headers })
  const session = currentSession(request, 'admin')
  const staff = session?.user_id && first<{ role: string }>('SELECT role FROM users WHERE id = $id', { id: session.user_id })
  if (!staff || !['admin', 'super-admin'].includes(staff.role)) {
    return Response.json({ message: 'Entre na administração.' }, { status: 401, headers })
  }
  return Response.json({ messages: localMailbox().messages(), transport: process.env.MAIL_TRANSPORT === 'resend' ? 'resend' : 'local' }, { headers })
}

/** A GET never consumes the token: link scanners can only open the confirmation form. */
export function emailVerificationPage(request: Request): Response {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const headers = {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response('Link inválido. Peça uma nova confirmação.', { status: 422, headers })
  return new Response(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirmar e-mail — He4rt</title><h1>Confirmar seu e-mail</h1><form method="post" action="/api/auth/email/verify"><input type="hidden" name="token" value="${token}"><button type="submit">Confirmar e-mail</button></form></html>`, { headers })
}

/** POST /api/auth/email/verify. execute derives the actor from the token, not from a form id. */
export async function confirmEmailVerification(request: Request): Promise<Response> {
  const { execute, withContext } = await import('./actions')
  const form = await request.formData()
  const token = form.get('token')
  if (typeof token !== 'string') return Response.json({ message: 'Link inválido.' }, { status: 422 })
  const result = await withContext(request, (context) => execute(context, {
    module: 'modules/panel-app/features/auth/actions', export: 'verifyEmail', args: [token],
  }))
  const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
  if (result.failure) return new Response('Este link expirou ou já foi usado. Peça um novo.', { status: 422, headers })
  return new Response('E-mail confirmado. Você já pode voltar ao He4rt Hub.', { headers })
}

/** Optional supervised worker calls this; normal requests never make external network calls. */
export function dispatchAuthMail(): Promise<void> {
  return localMailbox().dispatch()
}

/** Useful for debug resets: tokens for a seed identity must not survive a model reset. */
export function clearAuthMail() {
  const store = localMailbox()
  store.database.transaction(() => {
    store.database.run('DELETE FROM auth_mail_tokens')
    store.database.run('DELETE FROM auth_mail_outbox')
  })()
  db.set((state) => ({ ...state, passwordResets: [] }))
}
