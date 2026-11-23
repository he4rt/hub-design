import '../server/runtime'
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { resolve } from 'node:path'
import { seedState, type MockDb } from '@/mocks/db'

const MODULE = 'modules/panel-app/features/account/settings/trajectory/actions'
const SETTINGS = 'modules/panel-app/features/account/settings/actions'
const AUTH = 'modules/panel-app/features/auth/actions'
let connection: typeof import('../server/database/connection')
let writeState: typeof import('../server/database/write-state').writeState
let api: ReturnType<typeof Bun.spawn>
let origin: string
let fixture: MockDb
let passwords: MockDb['passwords']
let cookie: string
const previousPath = process.env.DB_PATH

beforeAll(async () => {
  mkdirSync(resolve('.amp/in/orb-backup'), { recursive: true })
  const directory = mkdtempSync(resolve('.amp/in/orb-backup/trajectory-api-'))
  process.env.DB_PATH = `${directory}/hub.sqlite`
  connection = await import('../server/database/connection')
  ;({ writeState } = await import('../server/database/write-state'))
  // Bun may reuse the singleton imported by another test file in this process.
  const databasePath = connection.sql.query<{ file: string }, []>('PRAGMA database_list').all()[0].file
  if (!databasePath.startsWith(`${resolve('.amp/in/orb-backup')}/`)) throw new Error('Refusing to reset a database outside the disposable test directory.')
  connection.migrateFresh()
  connection.transaction(() => writeState(structuredClone(seedState)))
  passwords = Object.fromEntries(connection.all<{ id: string; password: string }>('SELECT id, password FROM users WHERE password IS NOT NULL').map((user) => [user.id, user.password]))
  api = Bun.spawn([process.execPath, 'server/index.ts'], {
    env: {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_'))),
      HOME: directory, DB_PATH: databasePath, API_PORT: '0', HUB_DEBUG: '0',
    }, stdout: 'pipe', stderr: 'inherit',
  })
  const reader = (api.stdout as ReadableStream<Uint8Array>).getReader()
  let output = ''
  while (!origin) {
    const next = await reader.read()
    if (next.done) throw new Error('Isolated API did not start.')
    output += new TextDecoder().decode(next.value)
    origin = output.match(/API em (http:\/\/[^\s]+)/)?.[1] ?? ''
  }
  void (async () => { while (!(await reader.read()).done) { /* drain action logs */ } })()
}, 20000)

beforeEach(async () => {
  fixture = structuredClone(seedState)
  fixture.passwords = passwords
  fixture.profiles[0].userId = 'u1'
  connection.replaceRows(() => writeState(fixture))
  connection.sql.run('DELETE FROM sessions')
  const response = await call(AUTH, 'login', [{ email: fixture.users.find((user) => user.id === 'u1')!.email, password: 'password' }])
  expect(response.status).toBe(200)
  cookie = response.headers.get('set-cookie')!.split(';')[0]
})

afterAll(async () => {
  api?.kill()
  if (api) await api.exited
  if (previousPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousPath
})

function call(module: string, name: string, args: unknown[], session = '') {
  return fetch(`${origin}/api/actions/contract`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: session },
    body: JSON.stringify({ module, export: name, args }),
  })
}

async function state(session = cookie): Promise<MockDb> {
  return (await fetch(`${origin}/api/state`, { headers: { cookie: session } })).json() as Promise<MockDb>
}

test('AC-27: actual registration without MemberProfile can save, reload and clear About/focus', async () => {
  const registration = await call(AUTH, 'register', [{ name: 'Pessoa Nova', email: 'trajectory@example.test', username: 'trajectory-new', password: 'password', birthDate: '2000-01-01', acceptedUsageNotice: true }])
  expect(registration.status).toBe(200)
  const session = registration.headers.get('set-cookie')!.split(';')[0]
  const initial = await state(session)
  const userId = initial.session!.userId
  expect(initial.profiles.find((profile) => profile.userId === userId)).toBeUndefined()
  for (const input of [{ readme: 'Minha trajetória', currentFocus: 'Testes com Bun' }, { readme: '', currentFocus: '' }]) {
    expect((await call(MODULE, 'updateProfilePresentation', [userId, input], session)).status).toBe(200)
    const saved = (await state(session)).profiles.filter((profile) => profile.userId === userId)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ readme: input.readme || null, currentFocus: input.currentFocus || null, knowledge: [], learnings: [] })
  }
  const events = connection.all<{ event: string; props: string }>("SELECT event, props FROM analytics_events WHERE event IN ('profile_about_saved', 'profile_focus_updated')")
  expect(events.filter((event) => JSON.parse(event.props).userId === userId).map((event) => event.event).sort()).toEqual(['profile_about_saved', 'profile_about_saved', 'profile_focus_updated', 'profile_focus_updated'])
})

const inputs = {
  knowledge: { competency: 'TypeScript', level: 'basic', declaredAt: '2025-01-02' },
  learnings: { title: 'Curso independente', description: 'Prática de testes', completedAt: '2025-01-02' },
  experiences: { role: 'Desenvolvimento', organization: 'Projeto pessoal', description: '', startedAt: '2024-01-01', endedAt: '' },
  articles: { title: 'Testes de integração', summary: '', url: 'https://dev.to/member/testing-123', publishedAt: '2025-01-02' },
  evidences: { title: 'Projeto pessoal', kind: 'repository', repository: 'member/project', ref: '', context: 'Implementei testes para garantir o comportamento.', url: 'https://github.com/member/project', date: '2025-01-02' },
}

for (const [collection, fields] of Object.entries(inputs)) {
  test(`${collection}: create, edit, choose every visibility and delete survive independent GET /api/state`, async () => {
    const before = (await state()).profiles.find((profile) => profile.userId === 'u1')![collection as keyof typeof inputs].length
    const input = { ...fields, visibility: 'private' }
    const response = await call(MODULE, 'saveTrajectoryRecord', ['u1', collection, null, input], cookie)
    expect(response.status).toBe(200)
    const { output } = await response.json() as { output: { recordId: string } }
    const id = output.recordId
    const ownRecords = async () => (await state()).profiles.find((profile) => profile.userId === 'u1')![collection as keyof typeof inputs]
    expect(await ownRecords()).toHaveLength(before + 1)
    expect((await ownRecords()).find((record) => record.id === id)?.visibility).toBe('private')
    const edited = { ...input, ...('competency' in fields ? { competency: 'TypeScript atualizado' } : 'role' in fields ? { role: 'Atuação atualizada' } : { title: 'Título atualizado' }) }
    expect((await call(MODULE, 'saveTrajectoryRecord', ['u1', collection, id, edited], cookie)).status).toBe(200)
    const persisted = Object.fromEntries(Object.entries(edited).map(([key, value]) => [key, value === '' ? null : /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value]))
    expect((await ownRecords()).find((record) => record.id === id)).toMatchObject({ ...persisted, id })
    expect((await call(MODULE, 'saveTrajectoryRecord', ['u1', collection, id, edited], cookie)).status).toBe(200)
    for (const visibility of ['public', 'community', 'private']) {
      expect((await call(MODULE, 'setTrajectoryVisibility', ['u1', collection, id, visibility], cookie)).status).toBe(200)
      expect((await ownRecords()).find((record) => record.id === id)?.visibility).toBe(visibility)
    }
    expect((await call(MODULE, 'deleteTrajectoryRecord', ['u1', collection, id], cookie)).status).toBe(200)
    expect(await ownRecords()).toHaveLength(before)
    expect((await call(MODULE, 'deleteTrajectoryRecord', ['u1', collection, id], cookie)).status).toBe(422)
    const history = (await state()).profileRevisions.filter((revision) => revision.recordId === id)
    expect(history).toHaveLength(5)
    const original = 'competency' in fields ? { competency: 'TypeScript' } : 'role' in fields ? { role: 'Desenvolvimento' } : { title: fields.title }
    expect(history[0].snapshot).toMatchObject({ ...original, visibility: 'private' })
    expect(history.at(-1)).toMatchObject({ operation: 'delete', snapshot: { ...persisted, visibility: 'private' }, userId: 'u1', actorId: 'u1' })
    expect((await state('')).profileRevisions).toEqual([])
    const events = connection.all<{ props: string }>("SELECT props FROM analytics_events WHERE event = 'trajectory_record_added'")
    expect(events.map((event) => JSON.parse(event.props)).filter((props) => props.recordId === id)).toEqual([{ userId: 'u1', type: collection, recordId: id }])
    const mutations = connection.all<{ event: string; props: string }>("SELECT event, props FROM analytics_events WHERE event IN ('trajectory_record_updated', 'trajectory_record_deleted')")
    expect(mutations.filter((event) => JSON.parse(event.props).recordId === id).map((event) => event.event).sort()).toEqual(['trajectory_record_deleted', ...Array(4).fill('trajectory_record_updated')])
  })
}

test('the public profile editor also upserts focus, moderates text and refuses unknown visibility/collections', async () => {
  const landing = 'modules/landing/features/community/profiles/actions'
  const registration = await call(AUTH, 'register', [{ name: 'Pessoa Nova', email: 'focus@example.test', username: 'focus-new', password: 'password', birthDate: '2000-01-01', acceptedUsageNotice: true }])
  expect(registration.status).toBe(200)
  const session = registration.headers.get('set-cookie')!.split(';')[0]
  const userId = (await state(session)).session!.userId
  expect((await call(landing, 'updateLearningNow', [userId, 'Filas e recuperação após falhas'], session)).status).toBe(200)
  expect((await state(session)).profiles.find((profile) => profile.userId === userId)?.currentFocus).toBe('Filas e recuperação após falhas')
  expect((await call(landing, 'updateLearningNow', [userId, 'idiota'], session)).status).toBe(422)
  for (const args of [['unknown', 'missing', 'public'], ['knowledge', 'missing', 'everyone']]) {
    expect((await call(landing, 'updateRecordVisibility', [userId, ...args], session)).status).toBe(422)
  }
  expect((await state(session)).profiles.find((profile) => profile.userId === userId)?.currentFocus).toBe('Filas e recuperação após falhas')
})

test('all trajectory writes refuse anonymous and foreign actors without mutation', async () => {
  const before = (await state()).profiles
  for (const [name, args] of [
    ['updateProfilePresentation', [{ readme: 'Não autorizado', currentFocus: '' }]],
    ['saveTrajectoryRecord', ['knowledge', null, { ...inputs.knowledge, visibility: 'public' }]],
    ['setTrajectoryVisibility', ['knowledge', 'missing', 'public']],
    ['deleteTrajectoryRecord', ['knowledge', 'missing']],
  ] as const) {
    expect((await call(MODULE, name, ['u1', ...args])).status).toBe(401)
    expect((await call(MODULE, name, ['u2', ...args], cookie)).status).toBe(403)
  }
  expect((await state()).profiles).toEqual(before)
})

test('invalid/moderated About and focus retain the prior persisted data', async () => {
  const before = (await state()).profiles
  for (const input of [
    { readme: 'a'.repeat(5001), currentFocus: '' }, { readme: '', currentFocus: 'a'.repeat(81) },
    { readme: 'idiota', currentFocus: '' }, { readme: '', currentFocus: 'OTÁRIO' },
  ]) expect((await call(MODULE, 'updateProfilePresentation', ['u1', input], cookie)).status).toBe(422)
  expect((await state()).profiles).toEqual(before)
})

test('invalid dates, enum, URLs, blank/oversized/offensive text and wrong collection do not write', async () => {
  const before = (await state()).profiles
  const cases = [
    ['knowledge', { ...inputs.knowledge, competency: '' }], ['knowledge', { ...inputs.knowledge, competency: 'a'.repeat(101) }],
    ['knowledge', { ...inputs.knowledge, level: 'expert' }], ['knowledge', { ...inputs.knowledge, declaredAt: '2025-02-30' }],
    ['knowledge', { ...inputs.knowledge, declaredAt: '2999-01-01' }], ['knowledge', { ...inputs.knowledge, competency: 'imbecil' }],
    ['experiences', { ...inputs.experiences, endedAt: '2023-01-01' }], ['experiences', { ...inputs.experiences, description: 'idiota' }],
    ['learnings', { ...inputs.learnings, description: 'idiota' }], ['articles', { ...inputs.articles, summary: 'idiota' }],
    ['articles', { ...inputs.articles, url: 'javascript:alert(1)' }], ['articles', { ...inputs.articles, url: 'https://dev.to.evil.test/member/post' }],
    ['evidences', { ...inputs.evidences, url: 'https://github.com/other/project' }], ['evidences', { ...inputs.evidences, context: 'idiota' }],
    ['evidences', { ...inputs.evidences, kind: 'pull-request', ref: '-1' }], ['invalid', inputs.knowledge],
  ]
  for (const [collection, fields] of cases) {
    expect((await call(MODULE, 'saveTrajectoryRecord', ['u1', collection, null, { ...(fields as object), visibility: 'private' }], cookie)).status).toBe(422)
  }
  expect((await call(MODULE, 'saveTrajectoryRecord', ['u1', 'knowledge', null, { ...inputs.knowledge, visibility: 'everyone' }], cookie)).status).toBe(422)
  expect((await state()).profiles).toEqual(before)
})

test('origin-owned records preserve source content but permit choosing visibility', async () => {
  const profile = fixture.profiles.find((item) => item.userId === 'u1')!
  const basement = profile.learnings.find((item) => item.origin === 'basement')!
  expect(basement).toBeDefined()
  expect((await call(MODULE, 'saveTrajectoryRecord', ['u1', 'learnings', basement.id, { ...inputs.learnings, visibility: 'private' }], cookie)).status).toBe(422)
  expect((await call(MODULE, 'deleteTrajectoryRecord', ['u1', 'learnings', basement.id], cookie)).status).toBe(422)
  expect((await call(MODULE, 'setTrajectoryVisibility', ['u1', 'learnings', basement.id, 'private'], cookie)).status).toBe(200)
  expect((await state()).profiles.find((item) => item.userId === 'u1')!.learnings.find((item) => item.id === basement.id)).toEqual({ ...basement, visibility: 'private' })
})

test('profile identity validates email and moderates bio before changing User', async () => {
  const own = (await state()).users.find((user) => user.id === 'u1')!
  expect((await call(SETTINGS, 'updateProfile', ['u1', { name: own.name, email: 'invalid' }], cookie)).status).toBe(422)
  expect((await call(SETTINGS, 'updateMemberProfile', ['u1', { ...own, bio: 'idiota' }], cookie)).status).toBe(422)
  expect((await state()).users.find((user) => user.id === 'u1')).toEqual(own)
})
