import './runtime'
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { seedState, type MockDb } from '@/mocks/db'
import type { LocalMail } from './mail'

const AUTH = 'modules/panel-app/features/auth/actions'
const saved = { DB_PATH: process.env.DB_PATH, MAIL_DB_PATH: process.env.MAIL_DB_PATH, HUB_DEBUG: process.env.HUB_DEBUG, MAIL_TRANSPORT: process.env.MAIL_TRANSPORT, APP_URL: process.env.APP_URL }
let connection: typeof import('./database/connection')
let auth: typeof import('./auth')
let mail: typeof import('./mail-auth')
let actions: typeof import('./actions')
let writeState: typeof import('./database/write-state').writeState
let fixture: MockDb
let staffCookie: string

beforeAll(async () => {
  process.env.DB_PATH = ':memory:'
  process.env.MAIL_DB_PATH = ':memory:'
  process.env.HUB_DEBUG = '1'
  process.env.MAIL_TRANSPORT = 'local'
  process.env.APP_URL = 'https://hub.example.test'
  connection = await import('./database/connection')
  const main = connection.sql.query<{ name: string; file: string }, []>('PRAGMA database_list').all().find((item) => item.name === 'main')
  if (main?.file && !main.file.includes('/.amp/in/orb-backup/')) {
    throw new Error('Mail tests require a disposable SQLite connection, not the shared development database.')
  }
  auth = await import('./auth')
  mail = await import('./mail-auth')
  actions = await import('./actions')
  ;({ writeState } = await import('./database/write-state'))
  connection.migrateFresh()
  fixture = structuredClone(seedState)
  const hash = Bun.password.hashSync('password', { algorithm: 'bcrypt', cost: 4 })
  fixture.passwords = Object.fromEntries(Object.keys(fixture.passwords).map((id) => [id, hash]))
})

beforeEach(() => {
  connection.replaceRows(() => writeState(structuredClone(fixture)))
  connection.sql.run('DELETE FROM sessions')
  process.env.HUB_DEBUG = '1'
  mail.clearAuthMail()
  staffCookie = `hub_admin_session=${auth.createSession(request(), 'admin', 'u1')}`
})

afterAll(() => {
  // Other test files may share this cached singleton; only the runner owns its lifetime.
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function request(cookie = '') {
  return new Request('https://hub.example.test/api/test', { headers: { cookie } })
}

function call(name: string, args: unknown[], cookie = '') {
  return actions.runAction(request(cookie), 'contract', { module: AUTH, export: name, args })
}

async function messages() {
  const response = mail.developmentMail(request(staffCookie))
  expect(response.status).toBe(200)
  return ((await response.json()) as { messages: LocalMail[] }).messages
}

async function latestToken() {
  const body = (await messages()).find((message) => message.body)!.body
  return body.match(/(?:reset-password\/|token=)([A-Za-z0-9_-]{43})/)![1]
}

test('AC-21 same response and no leaked token for existing/missing accounts; local outbox persists', async () => {
  const missing = await call('sendPasswordResetLink', [{ email: 'absent@example.test' }])
  const existing = await call('sendPasswordResetLink', [{ email: ' ANA@HE4RT.DEV ' }])
  const missingBody = await missing.json()
  const existingBody = await existing.json()
  expect(missing.status).toBe(200)
  expect(existing.status).toBe(200)
  expect(existingBody.output).toEqual(missingBody.output)
  expect(existingBody.output).toEqual({ queued: true })
  expect((await messages())).toHaveLength(1)
  expect(existingBody.state.passwordResets).toEqual([])
  expect(JSON.stringify(existingBody)).not.toContain(await latestToken())
  expect(connection.all('SELECT * FROM password_reset_tokens')).toHaveLength(0)
})

test('AC-22 rotation, password validation, bcrypt persistence, replay refusal and web session revocation', async () => {
  const web = `hub_session=${auth.createSession(request(), 'web', 'u2')}`
  const other = `hub_session=${auth.createSession(request(), 'web', 'u3')}`
  await call('sendPasswordResetLink', [{ email: 'ana@he4rt.dev' }])
  const first = await latestToken()
  await call('sendPasswordResetLink', [{ email: 'ana@he4rt.dev' }])
  const token = await latestToken()
  const reset = (value: string, password = 'replacement-password', confirmation = password) => call('resetPassword', [{ token: value, password, confirmation }])
  expect((await reset(first)).status).toBe(422)
  expect((await reset(token, 'short')).status).toBe(422)
  expect((await reset(token, 'replacement-password', 'different-password')).status).toBe(422)
  expect((await reset(token)).status).toBe(200)
  const hash = connection.first<{ password: string }>('SELECT password FROM users WHERE id = $id', { id: 'u2' })!.password
  expect(Bun.password.verifySync('replacement-password', hash)).toBe(true)
  expect((await reset(token)).status).toBe(422)
  expect(auth.currentSession(request(web), 'web')).toBeUndefined()
  expect(auth.currentSession(request(other), 'web')).toBeDefined()
  expect(auth.currentSession(request(staffCookie), 'admin')).toBeDefined()
})

test('AC-24 a token, not an account id, proves email ownership; GET does not consume it', async () => {
  connection.sql.query('UPDATE users SET email_verified_at = NULL WHERE id = ?').run('u2')
  const web = `hub_session=${auth.createSession(request(), 'web', 'u2')}`
  expect((await call('sendEmailVerification', ['u2'], web)).status).toBe(200)
  const token = await latestToken()
  const page = mail.emailVerificationPage(new Request(`https://hub.example.test/api/auth/email/verify?token=${token}`))
  expect(page.status).toBe(200)
  expect(page.headers.get('referrer-policy')).toBe('no-referrer')
  expect(connection.first<{ email_verified_at: string | null }>("SELECT email_verified_at FROM users WHERE id = 'u2'")!.email_verified_at).toBeNull()
  expect((await call('verifyEmail', ['u2'], web)).status).toBe(422)
  const confirmation = await mail.confirmEmailVerification(new Request('https://hub.example.test/api/auth/email/verify', {
    method: 'POST', body: new URLSearchParams({ token }),
  }))
  expect(confirmation.status).toBe(200)
  expect(connection.first<{ email_verified_at: string | null }>("SELECT email_verified_at FROM users WHERE id = 'u2'")!.email_verified_at).toBeTruthy()
  expect((await call('verifyEmail', [token], web)).status).toBe(422)
})

test('verification request rejects another actor, and a changed address invalidates a link', async () => {
  connection.sql.query('UPDATE users SET email_verified_at = NULL WHERE id = ?').run('u2')
  const web = `hub_session=${auth.createSession(request(), 'web', 'u2')}`
  await expect(call('sendEmailVerification', ['u3'], web)).rejects.toThrow('outra conta')
  expect((await call('sendEmailVerification', ['u2'], web)).status).toBe(200)
  const token = await latestToken()
  connection.sql.query('UPDATE users SET email = ? WHERE id = ?').run('changed@example.test', 'u2')
  expect((await call('verifyEmail', [token])).status).toBe(422)
})

test('mailbox requires HUB_DEBUG AND a staff admin session; web and nonstaff admin sessions fail', () => {
  expect(mail.developmentMail(request()).status).toBe(401)
  const web = `hub_session=${auth.createSession(request(), 'web', 'u1')}`
  const nonstaff = `hub_admin_session=${auth.createSession(request(), 'admin', 'u2')}`
  expect(mail.developmentMail(request(web)).status).toBe(401)
  expect(mail.developmentMail(request(nonstaff)).status).toBe(401)
  expect(mail.developmentMail(request(staffCookie)).status).toBe(200)
  process.env.HUB_DEBUG = '0'
  expect(mail.developmentMail(request(staffCookie)).status).toBe(404)
})
