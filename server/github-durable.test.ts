import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { githubQueue, migrateGithub } from './github-queue'

if (process.env.HUB_GITHUB_CONTRACT_CHILD !== '1') test('GitHub durable contract: isolated SQLite and fake HTTP GitHub', async () => {
  const child = Bun.spawn([process.execPath, import.meta.path], {
    env: { ...process.env, HUB_GITHUB_CONTRACT_CHILD: '1' }, stdout: 'pipe', stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  expect(code, stderr).toBe(0)
  expect(stdout.includes('GITHUB_CONTRACT_OK')).toBe(true)
}, 120_000)

if (import.meta.main && process.env.HUB_GITHUB_CONTRACT_CHILD === '1') await contract()

async function contract() {
  mkdirSync('.amp/in/orb-backup', { recursive: true })
  process.env.DB_PATH = `${process.cwd()}/.amp/in/orb-backup/github-contract-${process.pid}.sqlite`
  process.env.GITHUB_APP_CREDENTIALS = `${process.cwd()}/.amp/in/orb-backup/no-credentials-${process.pid}.json`
  process.env.GITHUB_CLIENT_ID = 'fake-client'
  process.env.GITHUB_CLIENT_SECRET = 'fake-secret'
  process.env.GITHUB_APP_ID = '123'
  process.env.GITHUB_WEBHOOK_SECRET = 'fake-webhook-secret'
  process.env.GITHUB_PRIVATE_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  await import('./runtime')
  const { sql, replaceRows } = await import('./database/connection')
  const { seed } = await import('./database/seed')
  await seed()
  const { readState } = await import('./database/read-state')
  const { writeState } = await import('./database/write-state')
  const { seedState } = await import('@/mocks/db')
  const { jobs, bindGithubIdentity, reconcileAccess, syncReadme, resource, userIdByGithub, enqueueGithubEffects } = await import('./github-effects')
  const { webhook } = await import('./github')
  const { provisionProject, processGithubJobs, handleWebhook, sweepGithub } = await import('./github-sync')
  const { execute, withContext } = await import('./actions')
  const { createSession, sessionCookie } = await import('./auth')
  const { GITHUB_ORG } = await import('@/lib/github')
  const org = GITHUB_ORG
  const state = structuredClone(seedState)
  const project = state.projects[0]
  for (const other of state.projects) if (other.id !== project.id) other.status = 'ended'
  const squad = state.squads.find((s) => s.id === project.squadId)!
  const member = { ...structuredClone(state.users[0]), id: 'contract-member', email: 'member@example.test', username: 'contract-member', linkedAccounts: [{ provider: 'github' as const, handle: 'member', linkedAt: new Date().toISOString() }] }
  const captain = { ...structuredClone(member), id: 'contract-captain', email: 'captain@example.test', username: 'contract-captain', role: 'admin' as const }
  captain.linkedAccounts[0].handle = 'captain'
  state.users.push(member, captain)
  squad.captainId = captain.id
  project.repository = { fullName: `${org}/contract`, url: `https://github.com/${org}/contract` }
  project.status = 'active'
  project.board = { number: 700, url: 'https://github.com/board/700' }
  state.memberships = state.memberships.filter((m) => m.projectId !== project.id)
  state.applications = state.applications.filter((a) => a.projectId !== project.id)
  state.entryTests = state.entryTests.filter((t) => ![member.id, captain.id].includes(t.userId))
  const application = { id: 'contract-application', projectId: project.id, userId: member.id, answers: [], status: 'accepted' as const, notes: null, decision: null, githubInvite: 'pending' as const, createdAt: new Date().toISOString() }
  state.applications.push(application)
  replaceRows(() => writeState(state))
  bindGithubIdentity(member.id, 11, 'member')
  bindGithubIdentity(captain.id, 22, 'captain')
  assert.equal(userIdByGithub(readState(), { id: 11, login: 'renamed-member' }), member.id)
  assert.equal(userIdByGithub(readState(), { id: 999, login: 'member' }), null)

  const paths: string[] = []
  let grantFails = false
  let membershipActive = true
  let boardCreates = 0
  let loseBoardResponse = false
  let losePrResponse = false
  let issueNumber = 880
  let issueKind = 'Não técnica'
  let readme = '# Template\nDo not remove this.\n'
  let branchExists = false
  let remoteBoard: { id: string; number: number; url: string; title: string } | null = null
  const pulls: { number: number; state: string; merged_at: null; html_url: string; head: string }[] = []
  const teamMembers = new Set<string>()
  const fake = Bun.serve({ port: 0, async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname
    paths.push(`${request.method} ${path}`)
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {}
    if (path.endsWith('/installation')) return Response.json({ id: 1 })
    if (path.endsWith('/access_tokens')) return Response.json({ token: 'fake-installation', expires_at: new Date(Date.now() + 3_600_000).toISOString() })
    if (path === '/user/11') return Response.json({ id: 11, login: 'member' })
    if (path === '/user/22') return Response.json({ id: 22, login: 'captain' })
    if (path === `/orgs/${org}/repos`) return Response.json([{ full_name: `${org}/contract`, archived: false }])
    if (path === `/repos/${org}/contract`) return Response.json({ node_id: 'REPO', full_name: `${org}/contract`, html_url: 'https://github.com/contract', default_branch: 'main' })
    if (path === '/graphql') {
      const query = body.query as string
      const vars = body.variables as Record<string, unknown>
      if (query.includes('createProjectV2(')) {
        boardCreates++
        remoteBoard = { id: 'BOARD', number: 700, url: 'https://github.com/board/700', title: String(vars.title) }
        if (loseBoardResponse) { loseBoardResponse = false; return Response.json({ errors: [{ message: 'fake lost response' }] }) }
        return Response.json({ data: { createProjectV2: { projectV2: remoteBoard } } })
      }
      if (query.includes('projectsV2(first:100')) return Response.json({ data: { organization: { projectsV2: { nodes: remoteBoard ? [remoteBoard] : [], pageInfo: { hasNextPage: false } } } } })
      if (query.includes('items(first:100')) return Response.json({ data: { organization: { projectV2: { items: { nodes: [{ id: 'ITEM' }], pageInfo: { hasNextPage: false } } } } } })
      if (query.includes('ProjectV2Item {')) return Response.json({ data: { node: {
        id: 'ITEM', isArchived: false, project: { number: 700, owner: { login: org } }, status: { name: 'Feito' }, criterion: { text: project.acceptanceCriteria[0].id }, kind: { name: issueKind },
        content: { __typename: 'Issue', number: issueNumber, title: `Contract issue ${issueNumber}`, url: `https://github.com/issue/${issueNumber}`, labels: { nodes: [] }, assignees: { nodes: [{ databaseId: 11, login: 'member' }] } },
      } } })
      if (query.includes('closingIssuesReferences')) return Response.json({ data: { repository: { pullRequest: {
        closingIssuesReferences: { nodes: [] }, commits: { nodes: [{ commit: { authors: { nodes: [{ user: { databaseId: 22, login: 'captain' } }] } } }], pageInfo: { hasNextPage: false } },
      } } } })
      if (query.includes('field(name:')) return Response.json({ data: { node: { field: { id: 'STATUS' } } } })
      if (query.includes('fields(first:100')) return Response.json({ data: { node: { fields: { nodes: [{ name: 'Tipo' }, { name: 'Critério' }] } } } })
      if (query.includes('organization(login:')) return Response.json({ data: { organization: { id: 'ORG' } } })
      return Response.json({ data: {} })
    }
    if (path === `/orgs/${org}/teams/squad-${squad.slug}`) return Response.json({ id: 77, node_id: 'TEAM', slug: `squad-${squad.slug}` })
    if (path === `/orgs/${org}/teams/squad-${squad.slug}/members`) return Response.json([...teamMembers].map((login) => ({ login, id: login === 'member' ? 11 : 22 })))
    if (path.includes('/memberships/')) {
      const login = path.split('/').at(-1)!
      if (request.method === 'PUT') {
        if (grantFails) return Response.json({ message: 'fake unavailable' }, { status: 503 })
        teamMembers.add(login)
      }
      if (request.method === 'DELETE') teamMembers.delete(login)
      return Response.json({ state: membershipActive && teamMembers.has(login) ? 'active' : 'pending' })
    }
    if (path.includes('/collaborators/') || path.includes('/teams/') && path.includes('/repos/')) return new Response(null, { status: 204 })
    if (path.endsWith('/pulls')) {
      if (request.method === 'POST') {
        const pull = { number: pulls.length + 1, state: 'open', merged_at: null, html_url: 'https://github.com/pr/1', head: String(body.head) }
        pulls.push(pull)
        if (losePrResponse) { losePrResponse = false; return Response.json({ message: 'fake lost response' }, { status: 503 }) }
        return Response.json(pull)
      }
      return Response.json(url.searchParams.has('head') ? pulls.filter((p) => `${org}:${p.head}` === url.searchParams.get('head')) : [])
    }
    if (path.includes('/git/ref/heads/')) return path.endsWith('/main') || branchExists ? Response.json({ object: { sha: 'BASE' } }) : new Response(null, { status: 404 })
    if (path.endsWith('/git/refs')) { branchExists = true; return Response.json({}) }
    if (path.endsWith('/contents/README.md')) {
      if (request.method === 'PUT') readme = Buffer.from(String(body.content), 'base64').toString('utf8')
      return Response.json({ sha: 'README', content: Buffer.from(readme).toString('base64') })
    }
    if (path.endsWith('/commits') || path.endsWith('/reviews')) return Response.json([])
    return Response.json({ message: `unhandled fake path: ${path}` }, { status: 500 })
  } })
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    assert.equal(url.hostname, 'api.github.com', 'No real network is permitted by this contract')
    return originalFetch(`http://127.0.0.1:${fake.port}${url.pathname}${url.search}`, init)
  }) as typeof fetch
  try {
    // Signature/replay + inbox survives a fresh queue instance (the HTTP handler does not run work).
    const raw = JSON.stringify({ action: 'ignored' })
    const request = (signature: string, id = 'contract-delivery') => new Request('http://hub/api/github/webhook', { method: 'POST', body: raw,
      headers: { 'x-github-event': 'ping', 'x-github-delivery': id, 'x-hub-signature-256': signature } })
    assert.equal((await webhook(request('invalid'))).status, 401)
    assert.equal(sql.query('SELECT id FROM github_jobs').all().length, 0)
    const signature = `sha256=${new Bun.CryptoHasher('sha256', 'fake-webhook-secret').update(raw).digest('hex')}`
    assert.equal((await webhook(request(signature))).status, 202)
    assert.equal((await (await webhook(request(signature))).json()).duplicate, true)
    assert.equal(sql.query('SELECT id FROM github_jobs').all().length, 1)
    await processGithubJobs()
    assert.equal((sql.query('SELECT status FROM github_jobs').get() as { status: string }).status, 'done')

    // Actual close/reopen of SQLite, expired claim recovery and stale-owner fencing.
    const path = `${process.cwd()}/.amp/in/orb-backup/github-restart-${process.pid}.sqlite`
    let db = new Database(path)
    db.run('CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES (\'preserved-user\'); CREATE TABLE sessions(id TEXT); INSERT INTO sessions VALUES (\'preserved-session\')')
    migrateGithub(db)
    assert.equal((db.query('SELECT id FROM users').get() as { id: string }).id, 'preserved-user')
    assert.equal((db.query('SELECT id FROM sessions').get() as { id: string }).id, 'preserved-session')
    let queue = githubQueue(db)
    queue.enqueue('webhook', 'restart', {}, 0)
    const abandoned = queue.claim(0, 10)!
    db.close()
    db = new Database(path)
    migrateGithub(db)
    queue = githubQueue(db)
    assert.equal(queue.claim(9), null)
    const recovered = queue.claim(11)!
    assert.equal(recovered.attempts, 2)
    queue.complete(abandoned, 12)
    assert.equal((db.query('SELECT status FROM github_jobs').get() as { status: string }).status, 'processing')
    queue.fail(recovered, 12)
    assert.equal(queue.claim(13), null)
    const retried = queue.claim(100_000)!
    queue.complete(retried)
    assert.equal(queue.enqueue('webhook', 'restart', {}), false)
    db.close()

    // Failed grant cannot activate a member; durable retry does so exactly once when confirmed.
    grantFails = true
    jobs.enqueue('access', 'contract-access', { projectId: project.id })
    await processGithubJobs()
    assert.equal(readState().applications.find((a) => a.id === application.id)?.githubInvite, 'pending')
    assert.equal(readState().memberships.some((m) => m.userId === member.id), false)
    grantFails = false
    membershipActive = false
    sql.run("UPDATE github_jobs SET available_at=0 WHERE status='pending'")
    await processGithubJobs()
    assert.equal(readState().memberships.some((m) => m.userId === member.id), false)
    membershipActive = true
    await handleWebhook(new Request('http://hub'), 'membership', { action: 'added', member: { id: 11, login: 'member' } })
    await handleWebhook(new Request('http://hub'), 'membership', { action: 'added', member: { id: 11, login: 'member' } })
    assert.equal(readState().memberships.filter((m) => m.userId === member.id).length, 1)

    // Stable id survives rename; a merge by someone outside staff cannot approve the entry test.
    const reference = { number: 991, title: 'Entry', html_url: `https://github.com/${org}/another-repo/pull/991`, body: '', merged: false, user: { id: 11, login: 'renamed' }, merged_by: null as { id: number; login: string } | null }
    await handleWebhook(new Request('http://hub'), 'pull_request', { action: 'opened', repository: { full_name: `${org}/another-repo` }, pull_request: reference })
    await handleWebhook(new Request('http://hub'), 'pull_request', { action: 'closed', repository: { full_name: `${org}/another-repo` }, pull_request: { ...reference, merged: true, merged_by: { id: 999, login: 'not-staff' } } })
    assert.equal(readState().entryTests.find((t) => t.userId === member.id)?.status, 'open')
    for (let replay = 0; replay < 2; replay++) await handleWebhook(new Request('http://hub'), 'pull_request', { action: 'closed', repository: { full_name: `${org}/another-repo` }, pull_request: { ...reference, merged: true, merged_by: { id: 22, login: 'captain' } } })
    assert.equal(readState().entryTests.find((t) => t.userId === member.id)?.status, 'approved')
    assert.equal(readState().events.filter((e) => e.event === 'squad_test_approved' && e.props.userId === member.id).length, 1)

    // Receipt is actor/session scoped, authorizes before replay and does not reapply a successful write.
    const session = createSession(new Request('http://hub'), 'web', member.id)
    const idempotencyKey = crypto.randomUUID()
    const authenticated = (key: string = idempotencyKey) => new Request('http://hub', { headers: { cookie: sessionCookie('web', session), 'idempotency-key': key } })
    const call = { module: 'modules/panel-app/features/account/settings/actions', export: 'updateProfile', args: [member.id, { name: 'Contract Person', email: member.email }] }
    const first = await withContext(authenticated(), (context) => execute(context, call))
    assert.equal(first.failure, undefined)
    const changed = readState()
    changed.users.find((u) => u.id === member.id)!.name = 'Changed after first write'
    replaceRows(() => writeState(changed))
    const replay = await withContext(authenticated(), (context) => execute(context, call))
    assert.deepEqual(replay.output, first.output)
    assert.deepEqual(replay.tracked, [])
    assert.equal(readState().users.find((u) => u.id === member.id)?.name, 'Changed after first write')
    await assert.rejects(withContext(authenticated(), (context) => execute(context, { ...call, args: [member.id, { name: 'Different', email: member.email }] })), { status: 409 })
    await assert.rejects(withContext(authenticated('invalid'), (context) => execute(context, call)), { status: 400 })
    assert.ok((sql.query('SELECT expires_at FROM action_receipts').get() as { expires_at: number }).expires_at - Date.now() > 86_400_000)

    // PR response lost AFTER creation: retry finds the same PR and keeps template content.
    losePrResponse = true
    await assert.rejects(syncReadme(project.id, 'credits-contract'))
    await syncReadme(project.id, 'credits-contract')
    assert.equal(pulls.length, 1)
    assert.ok(readme.includes('Do not remove this.'))
    assert.ok(readme.includes(project.goal))
    assert.ok(readme.includes('Quem fez'))

    // Board response lost AFTER creation, before any local checkpoint: remote lookup recovers it.
    const provisioning = readState()
    provisioning.projects.find((p) => p.id === project.id)!.status = 'provisioning'
    replaceRows(() => writeState(provisioning))
    loseBoardResponse = true
    await assert.rejects(provisionProject(project.id))
    await provisionProject(project.id)
    assert.equal(boardCreates, 1)
    assert.ok(resource(`board:${project.id}`))
    assert.equal(readState().projects.find((p) => p.id === project.id)?.status, 'active')

    // A lost board webhook is recovered from HTTP. Repeating the sweep preserves decisions.
    await sweepGithub()
    await sweepGithub()
    assert.equal(readState().boardItems.filter((i) => i.projectId === project.id && i.issue.number === 880).length, 1)
    assert.equal(readState().deliveries.filter((d) => d.projectId === project.id && d.title === 'Contract issue 880').length, 1)

    // Both merge/board orders pass through the real adapter, including remote coauthor identity.
    issueKind = 'Técnica'
    const merge = async (issue: number) => handleWebhook(new Request('http://hub'), 'pull_request', {
      action: 'closed', repository: { full_name: `${org}/contract` }, pull_request: { ...reference, number: issue + 1000, body: `Closes #${issue}`, merged: true, merged_by: { id: 22, login: 'captain' } },
    })
    issueNumber = 881
    await merge(881)
    await handleWebhook(new Request('http://hub'), 'projects_v2_item', { action: 'edited', projects_v2_item: { node_id: 'ITEM' } })
    issueNumber = 882
    await handleWebhook(new Request('http://hub'), 'projects_v2_item', { action: 'edited', projects_v2_item: { node_id: 'ITEM' } })
    assert.equal(readState().deliveries.some((d) => d.title === 'Contract issue 882'), false)
    await merge(882)
    await merge(882)
    for (const number of [881, 882]) {
      const deliveries = readState().deliveries.filter((d) => d.title === `Contract issue ${number}`)
      assert.equal(deliveries.length, 1)
      assert.ok(deliveries[0].credits.some((c) => c.userId === captain.id))
    }
    issueNumber = 880
    issueKind = 'Não técnica'

    const unaccepted = readState()
    const credited = structuredClone(unaccepted)
    const delivery = credited.deliveries.find((d) => d.title === 'Contract issue 880')!
    delivery.status = 'accepted'
    delivery.credits = [{ userId: member.id, part: 'contract credit calculation and tests' }]
    delivery.context = 'Private review context must never be exported.'
    replaceRows(() => { writeState(credited); enqueueGithubEffects({ module: 'contract', export: 'acceptDelivery', args: [] }, unaccepted, credited) })
    await processGithubJobs()
    assert.ok(readme.includes('contract credit calculation and tests'))
    assert.ok(!readme.includes(delivery.context))
    const creditPrCount = pulls.length
    await processGithubJobs()
    assert.equal(pulls.length, creditPrCount)
    await sweepGithub()
    assert.equal(readState().deliveries.find((d) => d.id === delivery.id)?.status, 'accepted')

    // Domain persistence and its outbox intent roll back together; operational records survive replaceRows.
    const before = readState()
    const after = structuredClone(before)
    after.projects.find((p) => p.id === project.id)!.status = 'ended'
    const count = (sql.query('SELECT count(*) AS n FROM github_jobs').get() as { n: number }).n
    assert.throws(() => replaceRows(() => { writeState(after); enqueueGithubEffects({ module: 'contract', export: 'endProject', args: [] }, before, after); throw new Error('rollback') }))
    assert.equal((sql.query('SELECT count(*) AS n FROM github_jobs').get() as { n: number }).n, count)
    assert.equal(readState().projects.find((p) => p.id === project.id)?.status, 'active')
    replaceRows(() => writeState(after))
    await reconcileAccess(project.id)
    assert.equal(teamMembers.has('member'), false)
    assert.ok(paths.some((p) => p === `DELETE /repos/${org}/contract/collaborators/captain`))
    assert.ok(paths.some((p) => p.endsWith(`/repos/${org}/contract`) && p.startsWith('DELETE ')))
    assert.ok(sql.query('SELECT id FROM github_jobs').all().length >= count)
    console.log('GITHUB_CONTRACT_OK')
  } finally {
    globalThis.fetch = originalFetch
    fake.stop(true)
    sql.close()
  }
}
