import { createHash } from 'node:crypto'
import { GITHUB_ORG } from '@/lib/github'
import type { MockDb } from '@/mocks/db'
import { sql } from './database/connection'
import { readState } from './database/read-state'
import { graphql, rest } from './github-app'
import { githubQueue } from './github-queue'

const ORG = GITHUB_ORG
export const jobs = githubQueue(sql)

export function resource<T>(key: string): T | null {
  const row = sql.query<{ value: string }, [string]>('SELECT value FROM github_resources WHERE key=?').get(key)
  return row ? JSON.parse(row.value) as T : null
}

export function saveResource(key: string, value: unknown) {
  sql.query('INSERT INTO github_resources(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value))
}

type Call = { module: string; export: string; args: unknown[] }

/** Called inside the SAME domain transaction. A rejected action never creates an external intent. */
export function enqueueGithubEffects(call: Call, before: MockDb, after: MockDb) {
  if (call.module === 'mocks/github') return
  if (call.export === 'syncGithub') jobs.enqueue('sweep', `sweep:manual:${crypto.randomUUID()}`, {})
  for (const project of after.projects) {
    const previous = before.projects.find((p) => p.id === project.id)
    if (!previous && project.status === 'provisioning') {
      saveResource(`intent:${project.id}`, { actorId: call.args[0], repositoryMode: (call.args[2] as { repositoryMode?: string } | undefined)?.repositoryMode })
      jobs.enqueue('provision', `provision:${project.id}`, { projectId: project.id })
    }
    const squad = after.squads.find((s) => s.id === project.squadId)
    const oldSquad = before.squads.find((s) => s.id === project.squadId)
    const links = (state: MockDb) => JSON.stringify({
      members: state.memberships.filter((m) => m.projectId === project.id).map((m) => [m.userId, m.leftAt]),
      apps: state.applications.filter((a) => a.projectId === project.id).map((a) => [a.id, a.status, a.githubInvite]),
    })
    if (!previous || previous.status !== project.status || squad?.captainId !== oldSquad?.captainId || links(before) !== links(after)) {
      jobs.enqueue('access', `access:${project.id}:${crypto.randomUUID()}`, { projectId: project.id })
    }
    if (previous?.status !== 'ended' && project.status === 'ended') {
      // Compatibility: endProject(actor,project,{archiveRepository}) or third boolean.
      const option = call.args[2]
      saveResource(`closure:${project.id}`, { archive: typeof option === 'boolean' ? option : !!(option as { archiveRepository?: boolean } | undefined)?.archiveRepository })
    }
  }
  for (const delivery of after.deliveries) {
    if (delivery.status === 'accepted' && before.deliveries.find((d) => d.id === delivery.id)?.status !== 'accepted') {
      jobs.enqueue('readme', `credit:${delivery.id}`, { projectId: delivery.projectId, revision: `credit-${delivery.id}` })
    }
  }
}

export type RemoteUser = { id: number; login: string }

/** Numeric identity only. An old username can never transfer evidence to its new owner. */
export function userIdByGithub(state: MockDb, user: RemoteUser | null | undefined): string | null {
  if (!user?.id) return null
  const identity = sql.query<{ user_id: string }, [number]>('SELECT user_id FROM github_identities WHERE github_id=?').get(user.id)
  if (!identity || !state.users.some((u) => u.id === identity.user_id && u.linkedAccounts.some((a) => a.provider === 'github'))) return null
  sql.query('UPDATE github_identities SET login=? WHERE github_id=?').run(user.login, user.id)
  return identity.user_id
}

/** OAuth verified identity; never populated from a claimed browser handle or a webhook login. */
export function bindGithubIdentity(userId: string, githubId: number, login: string) {
  sql.query(`INSERT INTO github_identities(github_id,user_id,login) VALUES(?,?,?)
    ON CONFLICT(github_id) DO UPDATE SET login=excluded.login WHERE user_id=excluded.user_id`).run(githubId, userId, login)
  const owner = sql.query<{ user_id: string }, [number]>('SELECT user_id FROM github_identities WHERE github_id=?').get(githubId)
  if (owner?.user_id !== userId) throw new Error('Esta identidade GitHub já pertence a outra conta.')
}

export function completePendingGithubIdentity(sessionId: string | undefined, state: MockDb) {
  if (!sessionId || !state.session?.userId) return
  const identity = resource<RemoteUser>(`oauth:${sessionId}`)
  const user = state.users.find((u) => u.id === state.session?.userId)
  if (identity && user?.linkedAccounts.some((a) => a.provider === 'github' && a.handle === identity.login)) {
    bindGithubIdentity(user.id, identity.id, identity.login)
    sql.query('DELETE FROM github_resources WHERE key=?').run(`oauth:${sessionId}`)
  }
}

async function loginFor(state: MockDb, userId: string): Promise<string | null> {
  if (/^u\d+$/.test(userId)) return null
  const user = state.users.find((u) => u.id === userId)
  if (!user?.linkedAccounts.some((a) => a.provider === 'github')) return null
  const identity = sql.query<{ github_id: number }, [string]>('SELECT github_id FROM github_identities WHERE user_id=?').get(userId)
  if (!identity) throw new Error('Vincule novamente o GitHub para confirmar a identidade numérica.')
  const remote = await rest<RemoteUser>(ORG, 'GET', `/user/${identity.github_id}`)
  if (!remote) throw new Error('Conta GitHub não encontrada.')
  userIdByGithub(state, remote)
  return remote.login
}

export async function ensureTeam(projectId: string) {
  const state = readState()
  const project = state.projects.find((p) => p.id === projectId)
  const squad = state.squads.find((s) => s.id === project?.squadId)
  if (!squad) throw new Error('Squad não encontrado.')
  const slug = `squad-${squad.slug}`
  let team = await rest<{ id: number; node_id: string; slug: string }>(ORG, 'GET', `/orgs/${ORG}/teams/${slug}`)
  if (!team) team = await rest(ORG, 'POST', `/orgs/${ORG}/teams`, { name: slug, privacy: 'closed' })
  if (!team) throw new Error('Time não criado.')
  return team
}

/** Desired state plus a write-ahead grant ledger recovers even a crash immediately after a PUT. */
export async function reconcileAccess(projectId: string) {
  const state = readState()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project?.repository) return
  const squad = state.squads.find((s) => s.id === project.squadId)
  const team = await ensureTeam(projectId)
  const base = `/orgs/${ORG}/teams/${team.slug}`
  const desired = new Set(project.status === 'ended' ? [] : [
    ...state.memberships.filter((m) => m.projectId === projectId && !m.leftAt).map((m) => m.userId),
    ...state.applications.filter((a) => a.projectId === projectId && a.status === 'accepted' && a.githubInvite === 'pending').map((a) => a.userId),
    ...(squad?.captainId ? [squad.captainId] : []),
  ])
  const key = `grants:${projectId}`
  const granted = resource<Record<string, { login: string; captain: boolean }>>(key) ?? {}
  if (project.status !== 'ended') await rest(ORG, 'PUT', `${base}/repos/${project.repository.fullName}`, { permission: 'push' })
  for (const [userId, grant] of Object.entries(granted)) {
    // A username may have been reassigned since the grant. Resolve the bound numeric account again
    // even if the Hub account has since unlinked GitHub; never delete the new owner's access.
    const identity = sql.query<{ github_id: number }, [string]>('SELECT github_id FROM github_identities WHERE user_id=?').get(userId)
    const account = identity && await rest<RemoteUser>(ORG, 'GET', `/user/${identity.github_id}`)
    if (!account) throw new Error('Não foi possível confirmar a identidade para revogar o acesso.')
    const login = account.login
    const captain = desired.has(userId) && userId === squad?.captainId
    if (!desired.has(userId) || (grant.captain && !captain)) {
      await rest(ORG, 'DELETE', `/repos/${project.repository.fullName}/collaborators/${login}`)
    }
    // The same squad team may still be needed for another project: do not revoke that membership.
    const otherProject = state.projects.some((p) => p.id !== projectId && p.squadId === project.squadId && p.status !== 'ended' &&
      (state.memberships.some((m) => m.projectId === p.id && m.userId === userId && !m.leftAt) || squad?.captainId === userId))
    if (!desired.has(userId) && !otherProject) await rest(ORG, 'DELETE', `${base}/memberships/${login}`)
    if (!desired.has(userId)) { delete granted[userId]; saveResource(key, granted) }
  }
  for (const userId of desired) {
    const login = await loginFor(state, userId)
    if (!login) continue
    const captain = userId === squad?.captainId
    granted[userId] = { login, captain }
    saveResource(key, granted)
    await rest(ORG, 'PUT', `${base}/memberships/${login}`, { role: captain ? 'maintainer' : 'member' })
    if (captain) {
      await rest(ORG, 'PUT', `/repos/${project.repository.fullName}/collaborators/${login}`, { permission: 'maintain' })
      const confirmed = await rest<{ state: string }>(ORG, 'GET', `${base}/memberships/${login}`)
      if (confirmed?.state !== 'active') throw new Error('O capitão ainda precisa aceitar o convite do GitHub.')
    }
  }
  if (project.status === 'ended') {
    await rest(ORG, 'DELETE', `${base}/repos/${project.repository.fullName}`)
    const closure = resource<{ archive: boolean }>(`closure:${projectId}`)
    if (closure?.archive) await rest(ORG, 'PATCH', `/repos/${project.repository.fullName}`, { archived: true })
  }
}

/** Deterministic managed block; keep every byte outside it, including the template's instructions. */
export function readmeContent(state: MockDb, projectId: string, current: string): string {
  const project = state.projects.find((p) => p.id === projectId)!
  const text = (value: string) => value.replaceAll('<!--', '&lt;!--').replaceAll('-->', '--&gt;')
  const credits = state.deliveries.filter((d) => d.projectId === projectId && d.status === 'accepted')
    .map((d) => `### ${text(d.title)}\n${d.credits.map((c) => `- ${text(state.users.find((u) => u.id === c.userId)?.name ?? c.userId)}: ${text(c.part)}`).join('\n')}`).join('\n\n')
  const block = `<!-- hub:project:start -->\n## Objetivo\n${text(project.goal)}\n\n## Critérios de aceite\n${project.acceptanceCriteria.map((c) => `- ${text(c.text)}`).join('\n')}\n\n## Critérios de avaliação\n${project.evaluationCriteria.map((c) => `- ${text(c.competency)}: ${text(c.description)}`).join('\n')}\n\n## Quem fez\n${credits}\n<!-- hub:project:end -->`
  return current.includes('<!-- hub:project:start -->')
    ? current.replace(/<!-- hub:project:start -->[\s\S]*?<!-- hub:project:end -->/, block)
    : `${current.trimEnd()}\n\n${block}\n`
}

/** Stable branch per intent + all-state PR lookup closes the POST/crash duplication window. */
export async function syncReadme(projectId: string, revision: string) {
  const state = readState()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project?.repository) return
  const repo = project.repository.fullName
  const branch = `hub/${createHash('sha256').update(`${projectId}:${revision}`).digest('hex').slice(0, 24)}`
  const pulls = await rest<{ number: number; state: string; merged_at: string | null; html_url: string }[]>(ORG, 'GET', `/repos/${repo}/pulls?state=all&head=${ORG}:${branch}&per_page=100`)
  const existing = pulls?.[0]
  if (existing?.state === 'closed') { saveResource(`readme:${revision}`, existing); return }
  const metadata = await rest<{ default_branch: string }>(ORG, 'GET', `/repos/${repo}`)
  if (!metadata) throw new Error('Repositório não encontrado.')
  const head = await rest<{ object: { sha: string } }>(ORG, 'GET', `/repos/${repo}/git/ref/heads/${metadata.default_branch}`)
  if (!head) throw new Error('Branch base não encontrada.')
  if (!await rest(ORG, 'GET', `/repos/${repo}/git/ref/heads/${branch}`)) {
    await rest(ORG, 'POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha })
  }
  const file = await rest<{ sha: string; content: string }>(ORG, 'GET', `/repos/${repo}/contents/README.md?ref=${branch}`)
  const current = file ? Buffer.from(file.content, 'base64').toString('utf8') : ''
  const next = readmeContent(state, projectId, current)
  if (current !== next) await rest(ORG, 'PUT', `/repos/${repo}/contents/README.md`, {
    message: 'docs: sincroniza objetivo, critérios e créditos do Hub', branch, sha: file?.sha,
    content: Buffer.from(next).toString('base64'),
  })
  if (!existing) {
    const pull = await rest(ORG, 'POST', `/repos/${repo}/pulls`, { title: 'Atualiza objetivo, critérios e quem fez', head: branch, base: metadata.default_branch, body: 'Registros confirmados no He4rt Hub. Publicação depende de revisão e merge.' })
    if (!pull) throw new Error('PR não criado.')
    saveResource(`readme:${revision}`, pull)
  } else saveResource(`readme:${revision}`, existing)
}

export async function linkTeam(boardId: string, projectId: string) {
  const team = await ensureTeam(projectId)
  await graphql(ORG, `mutation($p:ID!,$t:ID!){linkProjectV2ToTeam(input:{projectId:$p,teamId:$t}){team{id}}}`, { p: boardId, t: team.node_id })
}

/** Observe hand edits before applying desired state. Unknown remote members are reported, not deleted. */
export async function inspectAccess(projectId: string): Promise<boolean> {
  const state = readState()
  const project = state.projects.find((p) => p.id === projectId)
  const squad = state.squads.find((s) => s.id === project?.squadId)
  if (!project?.repository || !squad) return false
  const expected = new Set(state.memberships.filter((m) => m.projectId === projectId && !m.leftAt).map((m) => m.userId))
  if (squad.captainId) expected.add(squad.captainId)
  let mismatch = false
  const found = new Set<string>()
  for (let page = 1; ; page++) {
    const batch = await rest<RemoteUser[]>(ORG, 'GET', `/orgs/${ORG}/teams/squad-${squad.slug}/members?per_page=100&page=${page}`)
    if (!batch) return expected.size > 0
    for (const remote of batch) {
      const userId = userIdByGithub(state, remote)
      if (!userId || !expected.has(userId)) mismatch = true
      else found.add(userId)
    }
    if (batch.length < 100) break
  }
  for (const userId of expected) if (!/^u\d+$/.test(userId) && !found.has(userId)) mismatch = true
  return mismatch
}
