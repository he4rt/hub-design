import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUTH_LINK_TTL_MS, AuthMailbox, configuredMailProvider, type MailProvider } from './mail'

const user = { id: 'mail-member', email: 'member@example.test' }
const stores: AuthMailbox[] = []
let time = 1_800_000_000_000

function store(provider?: MailProvider) {
  const result = new AuthMailbox({ path: ':memory:', publicUrl: 'https://hub.example.test', clock: () => time, provider })
  stores.push(result)
  return result
}

function tokenOf(mailbox: AuthMailbox) {
  const body = mailbox.messages().find((m) => m.body)!.body
  return body.match(/(?:reset-password\/|token=)([A-Za-z0-9_-]{43})/)![1]
}

afterEach(() => {
  for (const item of stores.splice(0)) item.database.close()
  time = 1_800_000_000_000
})

test('local durable intent has a 256-bit bearer link, no remote delivery claim and a hashed lookup', async () => {
  const mailbox = store()
  mailbox.request('password-reset', user)
  const token = tokenOf(mailbox)
  expect(mailbox.messages()[0].status).toBe('local')
  const row = mailbox.database.query<{ digest: string; expires_at: number }, []>('SELECT digest, expires_at FROM auth_mail_tokens').get()!
  expect(row.digest).not.toBe(token)
  expect(row.digest).toHaveLength(64)
  expect(row.expires_at).toBe(time + AUTH_LINK_TTL_MS)
  await mailbox.dispatch()
  expect(mailbox.messages()[0].attempts).toBe(0)
})

test('rotation rejects the old link, keeps only one token, and never changes another purpose', () => {
  const mailbox = store()
  mailbox.request('email-verification', user)
  const verification = tokenOf(mailbox)
  mailbox.request('password-reset', user)
  const old = tokenOf(mailbox)
  mailbox.request('password-reset', user)
  const current = tokenOf(mailbox)
  expect(current).not.toBe(old)
  expect(() => mailbox.consume('password-reset', old, [user], () => {})).toThrow('expirou')
  mailbox.consume('password-reset', current, [user], () => {})
  mailbox.consume('email-verification', verification, [user], () => {})
  expect(mailbox.messages().filter((m) => m.status === 'superseded')).toHaveLength(1)
})

test('exact expiry boundary, malformed, wrong-purpose, changed-address and replay links fail closed', () => {
  const mailbox = store()
  mailbox.request('password-reset', user)
  const token = tokenOf(mailbox)
  expect(() => mailbox.consume('password-reset', 'short', [user], () => {})).toThrow()
  expect(() => mailbox.consume('email-verification', token, [user], () => {})).toThrow()
  expect(() => mailbox.consume('password-reset', token, [{ ...user, email: 'changed@example.test' }], () => {})).toThrow()
  time += AUTH_LINK_TTL_MS
  expect(() => mailbox.consume('password-reset', token, [user], () => {})).toThrow()
  mailbox.request('password-reset', user)
  const fresh = tokenOf(mailbox)
  let actor = ''
  mailbox.consume('password-reset', fresh, [user], (identity) => { actor = identity.id })
  expect(actor).toBe(user.id)
  expect(() => mailbox.consume('password-reset', fresh, [user], () => {})).toThrow()
  expect(mailbox.messages().find((m) => m.status === 'consumed')!.body).toBe('')
})

test('a refused mutation does not burn its link', () => {
  const mailbox = store()
  mailbox.request('email-verification', user)
  const token = tokenOf(mailbox)
  expect(() => mailbox.consume('email-verification', token, [user], () => { throw new Error('validation') })).toThrow('validation')
  mailbox.consume('email-verification', token, [user], () => {})
})

test('mailbox and tokens survive a process connection restart and the file is private', () => {
  const scratch = resolve('.amp/in/orb-backup')
  mkdirSync(scratch, { recursive: true })
  const path = `${mkdtempSync(`${scratch}/mail-test-`)}/mail.sqlite`
  const first = new AuthMailbox({ path, clock: () => time })
  first.request('password-reset', user)
  const token = tokenOf(first)
  first.database.close()
  expect(statSync(path).mode & 0o777).toBe(0o600)
  const second = new AuthMailbox({ path, clock: () => time })
  stores.push(second)
  second.consume('password-reset', token, [user], () => {})
})

test('transient provider errors persist retry state without leaking their body', async () => {
  let calls = 0
  const ids: string[] = []
  const mailbox = store({ send: async (mail) => {
    ids.push(mail.id)
    if (++calls === 1) throw new Error('provider-private-response')
  } })
  mailbox.request('password-reset', user)
  await mailbox.dispatch()
  expect(mailbox.messages()[0].status).toBe('pending')
  expect(JSON.stringify(mailbox.messages())).not.toContain('provider-private-response')
  await mailbox.dispatch()
  expect(calls).toBe(1)
  time += 120_000
  await mailbox.dispatch()
  expect(calls).toBe(2)
  expect(ids[0]).toBe(ids[1])
  expect(mailbox.messages()[0].status).toBe('accepted')
})

test('worker stops after five attempts and never sends expired or superseded links', async () => {
  let calls = 0
  const mailbox = store({ send: async () => { calls++; throw new Error('unavailable') } })
  mailbox.request('password-reset', user)
  for (let attempt = 0; attempt < 5; attempt++) {
    await mailbox.dispatch()
    time += 60_000 * 2 ** (attempt + 1)
  }
  expect(mailbox.messages()[0].status).toBe('failed')
  await mailbox.dispatch()
  expect(calls).toBe(5)
  mailbox.request('password-reset', user)
  mailbox.request('password-reset', user)
  time += AUTH_LINK_TTL_MS
  await mailbox.dispatch()
  expect(calls).toBe(5)
})

test('provider requires explicit transport, credentials and a secure public URL', () => {
  expect(configuredMailProvider({})).toBeUndefined()
  expect(() => configuredMailProvider({ MAIL_TRANSPORT: 'resend' })).toThrow()
  expect(() => configuredMailProvider({ MAIL_TRANSPORT: 'resend', MAIL_RESEND_API_KEY: 'fixture', MAIL_FROM: 'Hub <hub@example.test>', APP_URL: 'http://hub.example.test' })).toThrow()
  expect(configuredMailProvider({ MAIL_TRANSPORT: 'resend', MAIL_RESEND_API_KEY: 'fixture', MAIL_FROM: 'Hub <hub@example.test>', APP_URL: 'https://hub.example.test' })).toBeDefined()
})
