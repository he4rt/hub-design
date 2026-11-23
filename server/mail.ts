import { Database } from 'bun:sqlite'
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync } from 'node:fs'
import type { AuthMailIdentity, AuthMailPurpose } from '@/modules/panel-app/lib/auth-mail'

export const AUTH_LINK_TTL_MS = 60 * 60 * 1000
const INVALID_LINK = 'Este link expirou ou já foi usado. Peça um novo.'

type TokenRow = { digest: string; user_id: string; email: string; expires_at: number }
export type LocalMail = {
  id: string; purpose: AuthMailPurpose; recipient: string; subject: string; body: string
  status: string; attempts: number; created_at: number; next_attempt_at: number
}
export type MailProvider = { send: (mail: LocalMail) => Promise<void> }

const digestOf = (token: string) => createHash('sha256').update(token).digest('hex')

/** Separate private SQLite, never exposed through /api/state or the shared table explorer. */
export class AuthMailbox {
  readonly database: Database
  private readonly clock: () => number
  private readonly publicUrl: string | undefined
  private readonly provider: MailProvider | undefined

  constructor(options: { path: string; publicUrl?: string; provider?: MailProvider; clock?: () => number }) {
    this.clock = options.clock ?? Date.now
    this.publicUrl = options.publicUrl
    this.provider = options.provider
    this.database = new Database(options.path, { create: true, strict: true })
    if (options.path !== ':memory:') chmodSync(options.path, 0o600)
    this.database.run('PRAGMA journal_mode = DELETE')
    this.database.run('PRAGMA busy_timeout = 5000')
    this.database.run(`
      CREATE TABLE IF NOT EXISTS auth_mail_tokens (
        digest TEXT PRIMARY KEY, purpose TEXT NOT NULL, user_id TEXT NOT NULL, email TEXT NOT NULL,
        expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_mail_outbox (
        id TEXT PRIMARY KEY, digest TEXT NOT NULL, purpose TEXT NOT NULL, recipient TEXT NOT NULL,
        subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, next_attempt_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_mail_tokens_owner ON auth_mail_tokens(purpose, user_id);
    `)
  }

  /** Rotation and the durable local message commit together, before success is returned. */
  request(purpose: AuthMailPurpose, user: AuthMailIdentity): void {
    const token = randomBytes(32).toString('base64url')
    const digest = digestOf(token)
    const now = this.clock()
    const path = purpose === 'password-reset'
      ? `/app/reset-password/${token}`
      : `/api/auth/email/verify?token=${token}`
    const link = this.publicUrl ? new URL(path, this.publicUrl).href : path
    const subject = purpose === 'password-reset' ? 'Redefinir sua senha He4rt' : 'Confirmar seu e-mail He4rt'
    const body = `${subject}\n\n${link}\n\nEste link vale por 60 minutos e só pode ser usado uma vez. Se não foi você, ignore esta mensagem.`
    this.database.transaction(() => {
      this.database.query(`UPDATE auth_mail_outbox SET status = 'superseded', body = ''
        WHERE digest IN (SELECT digest FROM auth_mail_tokens WHERE purpose = ? AND user_id = ?)
        AND status IN ('local', 'pending', 'sending')`).run(purpose, user.id)
      this.database.query('DELETE FROM auth_mail_tokens WHERE purpose = ? AND user_id = ?').run(purpose, user.id)
      this.database.query('INSERT INTO auth_mail_tokens VALUES (?, ?, ?, ?, ?, NULL, ?)')
        .run(digest, purpose, user.id, user.email, now + AUTH_LINK_TTL_MS, now)
      this.database.query('INSERT INTO auth_mail_outbox VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
        .run(crypto.randomUUID(), digest, purpose, user.email, subject, body, this.provider ? 'pending' : 'local', now, now)
    })()
  }

  /** The token identifies the actor; a caller-supplied user id is never authoritative. */
  consume(purpose: AuthMailPurpose, token: string, users: AuthMailIdentity[], apply: (user: AuthMailIdentity) => void): void {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error(INVALID_LINK)
    this.database.transaction(() => {
      const row = this.database.query<TokenRow, [string, string, number]>(`SELECT * FROM auth_mail_tokens
        WHERE digest = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?`)
        .get(digestOf(token), purpose, this.clock())
      const user = row && users.find((u) => u.id === row.user_id && u.email === row.email)
      if (!user) throw new Error(INVALID_LINK)
      apply(user)
      this.database.query('UPDATE auth_mail_tokens SET used_at = ? WHERE digest = ?').run(this.clock(), row!.digest)
      this.database.query("UPDATE auth_mail_outbox SET status = 'consumed', body = '' WHERE digest = ?")
        .run(row!.digest)
    }).immediate()
  }

  /** Call only behind HUB_DEBUG and a staff session; bodies contain bearer links. */
  messages(): LocalMail[] {
    return this.database.query<LocalMail, []>('SELECT id, purpose, recipient, subject, body, status, attempts, created_at, next_attempt_at FROM auth_mail_outbox ORDER BY created_at DESC, rowid DESC LIMIT 100').all()
  }

  /** Explicit worker entrypoint. Provider acceptance is not a delivery receipt. */
  async dispatch(): Promise<void> {
    if (!this.provider) return
    const now = this.clock()
    // An interrupted delivery is retried with the same provider idempotency key.
    this.database.query("UPDATE auth_mail_outbox SET status = 'pending' WHERE status = 'sending' AND next_attempt_at <= ?").run(now)
    this.database.query("UPDATE auth_mail_outbox SET status = 'failed' WHERE status = 'pending' AND attempts >= 5").run()
    this.database.query(`UPDATE auth_mail_outbox SET status = 'expired', body = ''
      WHERE status IN ('local', 'pending') AND digest IN
      (SELECT digest FROM auth_mail_tokens WHERE expires_at <= ? OR used_at IS NOT NULL)`).run(now)
    const candidates = this.database.query<LocalMail, [number]>(`SELECT * FROM auth_mail_outbox
      WHERE status = 'pending' AND next_attempt_at <= ? AND attempts < 5 ORDER BY created_at LIMIT 20`).all(now)
    for (const mail of candidates) {
      const claimed = this.database.query(`UPDATE auth_mail_outbox SET status = 'sending', attempts = attempts + 1,
        next_attempt_at = ? WHERE id = ? AND status = 'pending' AND digest IN
        (SELECT digest FROM auth_mail_tokens WHERE used_at IS NULL AND expires_at > ?)`)
        .run(this.clock() + 60_000, mail.id, this.clock())
      if (claimed.changes !== 1) continue
      try {
        await this.provider.send(mail)
        this.database.query("UPDATE auth_mail_outbox SET status = 'accepted' WHERE id = ? AND status = 'sending'").run(mail.id)
      } catch {
        const attempts = mail.attempts + 1
        // Never store provider error bodies: they can echo credentials or the bearer link.
        this.database.query("UPDATE auth_mail_outbox SET status = ?, next_attempt_at = ? WHERE id = ? AND status = 'sending'")
          .run(attempts >= 5 ? 'failed' : 'pending', this.clock() + 60_000 * 2 ** attempts, mail.id)
      }
    }
  }
}

/** Opt-in only. Credentials remain in the process, never in SQLite or error messages. */
export function configuredMailProvider(env: Record<string, string | undefined> = process.env): MailProvider | undefined {
  if (env.MAIL_TRANSPORT !== 'resend') return undefined
  const key = env.MAIL_RESEND_API_KEY
  const from = env.MAIL_FROM
  let origin: URL
  try { origin = new URL(env.APP_URL ?? '') } catch { throw new Error('Configure APP_URL HTTPS para enviar e-mails.') }
  if (!key || !from || /[\r\n]/.test(from) || origin.protocol !== 'https:' || origin.username || origin.password) {
    throw new Error('A configuração segura de e-mail está incompleta.')
  }
  return {
    async send(mail) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'idempotency-key': mail.id },
        body: JSON.stringify({ from, to: [mail.recipient], subject: mail.subject, text: mail.body }),
      })
      if (!response.ok) throw new Error('O provedor não aceitou a mensagem.')
    },
  }
}
