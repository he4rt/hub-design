import './runtime'
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { seedState, type MockDb } from '@/mocks/db'

const AUTH = 'modules/panel-app/features/auth/actions'
const QUEUE = 'modules/panel-app/features/validation/queue/actions'
let connection: typeof import('./database/connection')
let writeState: typeof import('./database/write-state').writeState
const servers: ReturnType<typeof Bun.spawn>[] = []
let origin: string
let debugOrigin: string
let apiDirectory: string
let passwords: MockDb['passwords']
let fixture: MockDb
const previousPath = process.env.DB_PATH

beforeAll(async () => {
  const scratch = resolve('.amp/in/orb-backup')
  mkdirSync(scratch, { recursive: true })
  const directory = mkdtempSync(`${scratch}/api-access-`)
  apiDirectory = directory
  process.env.DB_PATH = `${directory}/hub.sqlite`
  connection = await import('./database/connection')
  ;({ writeState } = await import('./database/write-state'))
  connection.migrateFresh()
  connection.transaction(() => writeState(structuredClone(seedState)))
  passwords = Object.fromEntries(connection.all<{ id: string; password: string }>('SELECT id, password FROM users WHERE password IS NOT NULL').map((u) => [u.id, u.password]))
  origin = await startApi(directory, false)
  debugOrigin = await startApi(directory, true)
}, 20000)

async function startApi(directory: string, debug: boolean, databasePath = process.env.DB_PATH) {
  const api = Bun.spawn([process.execPath, 'server/index.ts'], {
    env: {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_'))),
      HOME: directory,
      DB_PATH: databasePath,
      HUB_DEBUG: debug ? '1' : '0',
      API_PORT: '0',
      HUB_PUBLIC_URL: 'https://hub.example.test',
    },
    stdout: 'pipe',
    stderr: 'inherit',
  })
  servers.push(api)
  const reader = (api.stdout as ReadableStream<Uint8Array>).getReader()
  let output = ''
  let address = ''
  while (!address) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`API did not start: ${output}`)
    output += new TextDecoder().decode(value)
    address = output.match(/API em (http:\/\/[^\s]+)/)?.[1] ?? ''
  }
  // Keep draining action logs without retaining responses or credentials.
  void (async () => { while (!(await reader.read()).done) { /* drain */ } })()
  return address
}

beforeEach(() => {
  fixture = structuredClone(seedState)
  fixture.passwords = passwords
  fixture.users = fixture.users.map((u) => ({ ...u, published: u.id === 'u2' }))
  const profile = structuredClone(fixture.profiles[0])
  profile.userId = 'u2'
  profile.readme = 'Published biography'
  profile.knowledge = (['public', 'community', 'private'] as const).map((visibility) => ({ ...profile.knowledge[0], id: `${visibility}-knowledge`, visibility }))
  fixture.profiles = [...fixture.profiles.filter((p) => p.userId !== 'u2'), profile]
  const validation = fixture.validations[0]
  validation.memberId = 'u2'
  validation.published = true
  const request = fixture.validationRequests.find((r) => r.id === validation.requestId)!
  request.memberId = 'u2'
  request.conflicts = [{ validatorId: validation.validatorId, description: 'Staff-only conflict', at: request.createdAt }]
  fixture.contestations = [{
    id: 'contestation', validationId: validation.id, openedBy: 'u2', reason: 'Private contestation reason',
    status: 'open', decision: null, createdAt: request.createdAt,
  }]
  // A vacancy must never match an anonymous viewer's null identity.
  const project = fixture.projects.find((p) => p.id === fixture.applications[0]?.projectId)
  if (project) fixture.squads.find((s) => s.id === project.squadId)!.captainId = null
  saveFixture()
})

function saveFixture() {
  connection.replaceRows(() => writeState(fixture))
  connection.sql.run('DELETE FROM sessions')
}

afterAll(async () => {
  for (const api of servers) api.kill()
  await Promise.all(servers.map((api) => api.exited))
  if (previousPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousPath
})

async function call(module: string, name: string, args: unknown[], cookie = '') {
  return fetch(`${origin}/api/actions/contract`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ module, export: name, args }),
  })
}

async function login(id: string, admin = false) {
  const response = await call(admin ? 'modules/panel-admin/features/auth/actions' : AUTH, 'login', [{
    email: fixture.users.find((u) => u.id === id)!.email, password: 'password',
  }])
  expect(response.status).toBe(200)
  return response.headers.get('set-cookie')!.split(';')[0]
}

async function state(cookie = ''): Promise<MockDb> {
  return (await fetch(`${origin}/api/state`, { headers: { cookie } })).json() as Promise<MockDb>
}

test('anonymous responses contain public records, not private profiles, operations or vacancy applications', async () => {
  const view = await state()
  expect(view.profiles.map((p) => p.userId)).toEqual(['u2'])
  expect(view.profiles[0].knowledge.map((k) => k.id)).toEqual(['public-knowledge'])
  expect(view.users.find((u) => u.id === 'u1')).toMatchObject({ email: '', birthDate: '', startingPoint: null, bio: '' })
  expect(view.applications).toEqual([])
  expect(view.validationRequests).toEqual([])
  expect(view.validators).toEqual([])
  expect(view.boardItems).toEqual([])
  expect(view.deliveries.every((d) => d.status === 'accepted')).toBe(true)
  expect(view.deliveries.every((d) => d.context === '' && d.returnedReason === null)).toBe(true)
  expect(view.validations.map((v) => v.id)).toContain(fixture.validations[0].id)
  expect(view.contestations[0]).toMatchObject({ reason: '', openedBy: '', decision: null, status: 'open' })
  expect(view.passwords).toEqual({})
  expect(view.passwordResets).toEqual([])
  expect(view.events).toEqual([])
})

test('community and private trajectory records respect the reader, not only the page controls', async () => {
  const member = await state(await login('u3'))
  expect(member.profiles.find((p) => p.userId === 'u2')!.knowledge.map((k) => k.id)).toEqual(['public-knowledge', 'community-knowledge'])
  const owner = await state(await login('u2'))
  expect(owner.profiles.find((p) => p.userId === 'u2')!.knowledge.map((k) => k.id)).toEqual(['public-knowledge', 'community-knowledge', 'private-knowledge'])
})

test('unpublishing a profile removes its biography and validations from anonymous responses', async () => {
  const cookie = await login('u2')
  const response = await call('modules/panel-app/features/account/settings/actions', 'setProfilePublished', ['u2', false], cookie)
  expect(response.status).toBe(200)
  const view = await state()
  expect(view.profiles).toEqual([])
  expect(view.validations).toEqual([])
  expect(view.contestations).toEqual([])
  expect(view.users.find((u) => u.id === 'u2')!.bio).toBe('')
})

test('the recipient sees recorded assessments but not drafts, reviews or private conflict descriptions', async () => {
  fixture.validations[0].status = 'in-review'
  saveFixture()
  const cookie = await login('u2')
  const view = await state(cookie)
  expect(view.validations).toEqual([])
  expect(view.validationRequests[0].conflicts).toEqual([])
  expect(view.users.find((u) => u.id === 'u2')!.email).toBe(fixture.users.find((u) => u.id === 'u2')!.email)
})

test.each(['/api', '/api/tables', '/api/tables/users', '/api/github/manifest'])('development endpoint %s is unavailable with debug disabled', async (path) => {
  expect((await fetch(`${origin}${path}`)).status).toBe(404)
  const cookie = await login('u1', true)
  expect((await fetch(`${origin}${path}`, { headers: { cookie } })).status).toBe(404)
})

test('web and admin guards remain independent and staff can inspect the complete operational state', async () => {
  const web = await login('u1')
  expect((await state(web)).validationRequests).toEqual([])
  expect((await call('modules/panel-admin/features/auth/actions', 'logout', [], web)).status).toBe(200)
  const admin = await login('u1', true)
  const view = await state(admin)
  expect(view.validationRequests[0].conflicts[0].description).toBe('Staff-only conflict')
  expect(view.users.find((u) => u.id === 'u2')!.email).not.toBe('')
  expect(view.passwords).toEqual({})
  expect((await call('modules/panel-app/features/account/settings/actions', 'setProfilePublished', ['u2', false], admin)).status).toBe(401)
})

test('same-origin form submissions through the Vite proxy succeed and foreign origins are refused', async () => {
  const send = (source: string) => fetch(`${origin}/api/actions/panel-app.session.store`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'hub.example.test', origin: source },
    body: JSON.stringify({ module: AUTH, export: 'login', args: [{ email: fixture.users.find((u) => u.id === 'u2')!.email, password: 'password' }] }),
  })
  expect((await send('https://hub.example.test')).status).toBe(200)
  expect((await send('https://foreign.example.test')).status).toBe(403)
})

test('active validators receive the queue size without the private requests behind it', async () => {
  fixture.validationRequests.push({ ...fixture.validationRequests[0], id: 'queued-private', memberId: 'u3', status: 'queued', validatorId: null, assignedAt: null })
  saveFixture()
  const validator = await state(await login('u9'))
  expect(validator.validationQueueSize).toBe(1)
  expect(validator.validationRequests.map((r) => r.id)).toEqual(['vr1'])
  expect((await state()).validationQueueSize).toBeUndefined()
})

test('onboarding cannot modify a different account or complete missing mandatory steps', async () => {
  const answer = { objective: 'learn', areas: ['back-end'], startingPoint: 'junior', languages: ['Go'] }
  expect((await call(AUTH, 'answerOnboardingStep', ['u2', 'objective', answer])).status).toBe(401)
  const cookie = await login('u1')
  expect((await call(AUTH, 'answerOnboardingStep', ['u2', 'objective', answer], cookie)).status).toBe(403)
  fixture.users.find((u) => u.id === 'u2')!.linkedAccounts = []
  fixture.users.find((u) => u.id === 'u2')!.onboardedAt = null
  saveFixture()
  const member = await login('u2')
  expect((await call(AUTH, 'answerOnboardingStep', ['u2', 'languages', answer], member)).status).toBe(422)
  expect((await state(member)).users.find((u) => u.id === 'u2')!.onboardedAt).toBeNull()
})

test('browser-supplied social identities cannot authenticate accounts outside debug', async () => {
  const user = fixture.users.find((u) => u.id === 'u2')!
  for (const provider of ['github', 'google', 'discord']) {
    const response = await call(AUTH, 'socialLogin', [provider, { name: user.name, email: user.email, emailVerified: true, handle: user.username }])
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
  }
})

test('an assessment in review cannot be overwritten, resubmitted or detached by its validator', async () => {
  const assessment = fixture.validations[0]
  const request = fixture.validationRequests.find((r) => r.id === assessment.requestId)!
  assessment.status = 'in-review'
  assessment.published = false
  request.status = 'assigned'
  request.validatorId = assessment.validatorId
  saveFixture()
  const cookie = await login(assessment.validatorId)
  const draft = {
    context: 'Changed context with enough characters', contribution: 'Changed contribution with enough characters',
    strengths: [{ text: 'Strength', evidenceRef: '#1' }],
    improvements: [{ text: 'Improvement', evidenceRef: '#1', suggestion: 'Suggestion' }],
    conflictDeclared: false, conflictDescription: '', insufficientEvidence: false,
  }
  for (const [name, input] of [['saveValidationDraft', draft], ['recordValidation', draft], ['declareConflict', 'New conflict described here']] as const) {
    expect((await call(QUEUE, name, [assessment.validatorId, request.id, input], cookie)).status).toBe(422)
  }
  expect((await state(cookie)).validations.find((v) => v.id === assessment.id)).toMatchObject({ status: 'in-review', context: assessment.context })
})

test('a review cannot approve an assessment whose request was reassigned', async () => {
  fixture.validations[0].status = 'in-review'
  fixture.validators.push({ ...fixture.validators[0], userId: 'u6' })
  fixture.validationRequests[0].status = 'assigned'
  fixture.validationRequests[0].validatorId = 'u6'
  saveFixture()
  const admin = await login('u1', true)
  const response = await call('modules/panel-admin/features/validation/actions', 'decideReview', ['u1', fixture.validations[0].id, 'approved', ''], admin)
  expect(response.status).toBe(422)
  expect((await state(admin)).validations[0].status).toBe('in-review')
})

test('the validator can revise a returned draft and staff can record it without publishing it', async () => {
  const assessment = fixture.validations[0]
  assessment.status = 'in-review'
  assessment.published = false
  assessment.recordedAt = null
  const request = fixture.validationRequests.find((r) => r.id === assessment.requestId)!
  request.status = 'assigned'
  saveFixture()
  const admin = await login('u1', true)
  const validator = await login(assessment.validatorId)
  const member = await login('u2')
  const reviews = 'modules/panel-admin/features/validation/actions'
  expect((await call(reviews, 'decideReview', ['u1', assessment.id, 'returned', 'Cite os casos de erro observados.'], admin)).status).toBe(200)
  const draft = {
    context: 'A entrega incluiu testes de integração dos casos de erro.',
    contribution: 'A pessoa escreveu os testes e isolou a consulta externa.',
    strengths: [{ text: 'Testes cobrem a indisponibilidade do serviço.', evidenceRef: 'loja-checkout#34' }],
    improvements: [{ text: 'A montagem dos dados se repete.', evidenceRef: 'loja-checkout#34', suggestion: 'Extrair a montagem dos dados para um dataset.' }],
    conflictDeclared: false, conflictDescription: '', insufficientEvidence: false,
  }
  expect((await call(QUEUE, 'saveValidationDraft', [assessment.validatorId, request.id, draft], validator)).status).toBe(200)
  expect((await call(QUEUE, 'recordValidation', [assessment.validatorId, request.id, draft], validator)).status).toBe(200)
  expect((await state(member)).validations).toEqual([])
  expect((await call(reviews, 'decideReview', ['u1', assessment.id, 'approved', ''], admin)).status).toBe(200)
  expect((await state(member)).validations[0]).toMatchObject({ context: draft.context, status: 'recorded', published: false, review: null })
  expect((await state()).validations).toEqual([])
})

test('member and captain read their own squad operations; an outsider cannot read or change them', async () => {
  const application = fixture.applications[0]
  const project = fixture.projects.find((p) => p.id === application.projectId)!
  const squad = fixture.squads.find((s) => s.id === project.squadId)!
  squad.captainId = 'u6'
  fixture.memberships = fixture.memberships.filter((m) => m.userId !== 'u3')
  saveFixture()
  const captain = await login('u6')
  const outsider = await login('u3')
  const applicant = await login(application.userId)
  expect((await state(captain)).applications.some((a) => a.id === application.id)).toBe(true)
  expect((await state(applicant)).applications.some((a) => a.id === application.id)).toBe(true)
  const external = await state(outsider)
  expect(external.applications.filter((a) => a.userId !== 'u3')).toEqual([])
  expect(external.boardItems).toEqual([])
  expect(external.deliveries.every((d) => d.status === 'accepted' && d.context === '')).toBe(true)
  expect((await call('modules/panel-app/features/squads/squads/applications/actions', 'saveApplicationNotes', ['u3', application.id, {
    strengths: 'Boa organização dos testes.', improvements: 'Documentar os casos de erro.',
  }], outsider)).status).toBe(422)
  expect((await call('modules/panel-app/features/squads/squads/applications/actions', 'saveApplicationNotes', ['u6', application.id, {
    strengths: 'Boa organização dos testes.', improvements: 'Documentar os casos de erro.',
  }], captain)).status).toBe(200)
  expect((await state(applicant)).applications.find((a) => a.id === application.id)!.notes?.strengths).toBe('Boa organização dos testes.')
})

test('captain acceptance becomes a private validation, then a member-published record that survives API restart', async () => {
  const delivery = fixture.deliveries.find((d) => d.id === 'd1')!
  delivery.status = 'pending'
  delivery.decidedBy = null
  delivery.decidedAt = null
  delivery.decisions = []
  fixture.squads.find((s) => s.id === 's1')!.captainId = 'u6'
  fixture.validationRequests = []
  fixture.validations = []
  fixture.contestations = []
  fixture.validators = fixture.validators.filter((v) => v.userId === 'u9')
  fixture.memberships = fixture.memberships.filter((m) => m.userId !== 'u9' && m.userId !== 'u3')
  saveFixture()
  const captain = await login('u6')
  const member = await login('u2')
  const outsider = await login('u3')
  const validator = await login('u9')
  const admin = await login('u1', true)
  const deliveries = 'modules/panel-app/features/squads/squads/deliveries/actions'
  const requests = 'modules/panel-app/features/validation/requests/actions'
  const publications = 'modules/panel-app/features/validation/validations/actions'
  const decision = { credits: [{ userId: 'u2', part: 'Implementou o cálculo e os testes de CEP inválido.' }], collaboration: 'individual', context: 'O cálculo cobre CEP válido e inválido com testes de regressão.' }
  expect((await call(deliveries, 'acceptDelivery', ['u3', delivery.id, decision], outsider)).status).toBe(422)
  expect((await call(deliveries, 'acceptDelivery', ['u6', delivery.id, decision], captain)).status).toBe(200)
  const requestResponse = await call(requests, 'requestValidation', ['u2', { deliveryIds: [delivery.id], criterionId: 'ec1' }], member)
  expect(requestResponse.status).toBe(200)
  const requestId = (await requestResponse.json()).output.id as string
  expect((await state(validator)).validationRequests.find((r) => r.id === requestId)?.status).toBe('assigned')
  const draft = {
    context: 'A implementação trata o cálculo do frete e a resposta em caso de falha.',
    contribution: 'A pessoa criou os testes de regressão e isolou a integração com os Correios.',
    strengths: [{ text: 'Casos de erro cobertos com dados independentes.', evidenceRef: 'loja-checkout#34' }],
    improvements: [{ text: 'A montagem dos dados de teste pode ser reduzida.', evidenceRef: 'loja-checkout#34', suggestion: 'Extrair um dataset reutilizável.' }],
    conflictDeclared: false, conflictDescription: '', insufficientEvidence: false,
  }
  expect((await call(QUEUE, 'recordValidation', ['u9', requestId, draft], validator)).status).toBe(200)
  const assessment = (await state(validator)).validations.find((v) => v.requestId === requestId)!
  expect(assessment.status).toBe('in-review')
  expect((await state(member)).validations).toEqual([])
  expect((await call('modules/panel-admin/features/validation/actions', 'decideReview', ['u1', assessment.id, 'approved', ''], admin)).status).toBe(200)
  expect((await state(member)).validations.find((v) => v.id === assessment.id)?.published).toBe(false)
  expect((await state()).validations).toEqual([])
  expect((await call(publications, 'setValidationPublished', ['u2', assessment.id, true], member)).status).toBe(200)
  expect((await state()).validations.find((v) => v.id === assessment.id)?.contribution).toBe(draft.contribution)
  const publicDelivery = (await state()).deliveries.find((d) => d.id === delivery.id)!
  expect(publicDelivery).toMatchObject({ context: '', decisions: [] })
  expect((await state(member)).deliveries.find((d) => d.id === delivery.id)?.decisions).toHaveLength(1)
  servers[0].kill()
  await servers[0].exited
  origin = await startApi(apiDirectory, false)
  expect((await state(member)).session?.userId).toBe('u2')
  expect((await state()).validations.find((v) => v.id === assessment.id)?.status).toBe('recorded')
  const events = connection.all<{ event: string }>('SELECT event FROM analytics_events').map((e) => e.event)
  expect(events).toContain('delivery_accepted')
  expect(events).toContain('validation_requested')
  expect(events).toContain('validation_assigned')
  expect(events).toContain('validation_recorded')
  expect(events).toContain('validation_published')
})

test('upgrades an existing database without losing accounts or sessions', async () => {
  const cookie = await login('u2')
  const directory = mkdtempSync(`${resolve('.amp/in/orb-backup')}/api-upgrade-`)
  const path = `${directory}/hub.sqlite`
  connection.sql.query('VACUUM INTO $path').run({ path })
  const old = new Database(path)
  for (const table of ['github_repositories', 'squad_delivery_decisions', 'board_item_pull_request_reviewers', 'profile_revisions']) old.run(`DROP TABLE ${table}`)
  old.close()
  const upgraded = await startApi(directory, false, path)
  const response = await fetch(`${upgraded}/api/state`, { headers: { cookie } })
  expect(response.status).toBe(200)
  const view = await response.json() as MockDb
  expect(view.session?.userId).toBe('u2')
  expect(view.users.find((u) => u.id === 'u2')?.email).toBe('ana@he4rt.dev')
  expect(view.profiles.find((p) => p.userId === 'u2')?.readme).toBe('Published biography')
  expect(view.githubSync.repositories).toEqual([])
})

test('authentication requests a private mail link and only its single-use token verifies the address over HTTP', async () => {
  fixture.users.find((u) => u.id === 'u2')!.emailVerifiedAt = null
  saveFixture()
  const member = await login('u2')
  const admin = await login('u1', true)
  const reminders = 'modules/panel-app/features/community/feed/reminders/actions'
  expect((await call(reminders, 'verifyEmail', ['u2'], member)).status).toBe(404)
  expect((await call(reminders, 'sendEmailVerification', ['u2'], member)).status).toBe(404)
  expect((await call(AUTH, 'sendEmailVerification', ['u2'], member)).status).toBe(200)
  expect((await state(member)).users.find((u) => u.id === 'u2')?.emailVerifiedAt).toBeNull()
  expect((await fetch(`${origin}/api/debug/mail`, { headers: { cookie: admin } })).status).toBe(404)
  expect((await fetch(`${debugOrigin}/api/debug/mail`)).status).toBe(401)
  const mailbox = await fetch(`${debugOrigin}/api/debug/mail`, { headers: { cookie: admin } })
  expect(mailbox.status).toBe(200)
  const messages = (await mailbox.json()).messages as { body: string; purpose: string }[]
  const token = messages.find((message) => message.purpose === 'email-verification')!.body.match(/token=([A-Za-z0-9_-]{43})/)![1]
  expect(JSON.stringify(await state(member))).not.toContain(token)
  expect((await fetch(`${origin}/api/auth/email/verify?token=${token}`)).status).toBe(200)
  expect((await state(member)).users.find((u) => u.id === 'u2')?.emailVerifiedAt).toBeNull()
  const confirm = () => fetch(`${origin}/api/auth/email/verify`, { method: 'POST', body: new URLSearchParams({ token }) })
  expect((await confirm()).status).toBe(200)
  expect((await state(member)).users.find((u) => u.id === 'u2')?.emailVerifiedAt).toBeTruthy()
  expect((await confirm()).status).toBe(422)
})

test('two concurrent acceptances reserve only one last seat without exposing candidates publicly', async () => {
  const project = fixture.projects.find((p) => p.id === 'p1')!
  project.seats = 2
  fixture.squads.find((s) => s.id === project.squadId)!.captainId = 'u6'
  fixture.memberships = fixture.memberships.filter((m) => m.projectId !== project.id || m.userId === 'u6')
  fixture.applications = ['u2', 'u3'].map((userId) => ({ id: `last-${userId}`, userId, projectId: project.id, answers: [], status: 'pending', notes: null, decision: null, githubInvite: 'not-needed', createdAt: new Date().toISOString() }))
  saveFixture()
  const captain = await login('u6')
  const responses = await Promise.all(['last-u2', 'last-u3'].map((id) => call('modules/panel-app/features/squads/squads/applications/actions', 'acceptApplication', ['u6', id], captain)))
  expect(responses.map((r) => r.status).sort()).toEqual([200, 422])
  const view = await state()
  expect(view.applications).toEqual([])
  expect(view.projects.find((p) => p.id === project.id)!.reservedSeats).toBe(1)
})

test('debug keeps impersonation and safe table inspection without exposing tables to visitors', async () => {
  expect((await fetch(`${debugOrigin}/api/tables/users`)).status).toBe(401)
  const member = await login('u2')
  expect((await fetch(`${debugOrigin}/api/tables/users`, { headers: { cookie: member } })).status).toBe(401)
  const admin = await login('u1', true)
  const tables = await fetch(`${debugOrigin}/api/tables/users`, { headers: { cookie: admin } })
  expect(tables.status).toBe(200)
  expect((await tables.json()).rows.every((u: { password: string | null }) => !u.password || u.password === '••••')).toBe(true)
  const response = await fetch(`${debugOrigin}/api/debug/state`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ set: { session: { userId: 'u2' } }, arrays: {} }),
  })
  expect(response.status).toBe(200)
  const cookie = response.headers.get('set-cookie')!.split(';')[0]
  expect((await state(cookie)).session?.userId).toBe('u2')
  const hiddenUser = (await state(cookie)).users.find((u) => u.id === 'u3')!
  const update = await fetch(`${debugOrigin}/api/debug/state`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ set: {}, arrays: { users: { keys: ['u3'], upserts: [{ ...hiddenUser, published: true }], deletes: [] } } }),
  })
  expect(update.status).toBe(200)
  const restored = (await state(admin)).users.find((u) => u.id === 'u3')!
  expect(restored).toMatchObject({ email: fixture.users.find((u) => u.id === 'u3')!.email, published: true, startingPoint: fixture.users.find((u) => u.id === 'u3')!.startingPoint })
  expect((await state()).passwordResets).toEqual([])
})

test('a staff removal reaches only its author, with the reason and without who removed it', async () => {
  const MODERATION = 'modules/panel-admin/features/community/moderation/actions'
  const reason = 'Expõe dados pessoais de um cliente. Publique de novo sem nomes e contatos.'
  const author = await login('u2')
  expect((await call(MODERATION, 'removePost', ['u2', 'p6', reason], author)).status).toBe(401)
  const admin = await login('u1', true)
  expect((await call(MODERATION, 'removePost', ['u1', 'p6', 'Spam.'], admin)).status).not.toBe(200)
  expect((await call(MODERATION, 'removeComment', ['u1', 'fc1', reason], admin)).status).toBe(200)
  expect((await call(MODERATION, 'removePost', ['u1', 'p6', reason], admin)).status).toBe(200)

  const mine = await state(author)
  expect(mine.feedPosts.find((p) => p.id === 'p6')!.removal).toMatchObject({ reason, removedBy: '' })
  const commenter = await state(await login('u3'))
  expect(commenter.feedPosts.some((p) => p.id === 'p6')).toBe(false)
  expect(commenter.feedComments.some((c) => c.id === 'fc1')).toBe(false)
  expect((await state(admin)).feedPosts.find((p) => p.id === 'p6')!.removal!.removedBy).toBe('u1')
})
