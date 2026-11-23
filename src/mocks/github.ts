import { ENTRY_TEST_REPOSITORY, GITHUB_ORG } from '@/lib/github'
import { track } from './analytics'
import { db, newId, type BoardItem, type BoardStatus, type EntryTest, type SquadDelivery, type Evidence } from './db'
import { MockError, mockAction } from './mock-action'
import { activeMemberships, appendLog, githubHandle, isStaff, reservedSeats } from './squads'

/**
 * What the He4rt GitHub App does to the Hub: `POST /api/github/webhook` (server/github-sync.ts) calls
 * these with what GitHub sent, like `POST /webhooks/github` in the Laravel app. The debug actions call
 * them without the GitHub data, which is then made up.
 */

function touchSync() {
  db.set((s) => ({ ...s, githubSync: { ...s.githubSync, lastWebhookAt: new Date().toISOString() } }))
}

/** `pull_request.opened` on a He4rt repository by a member without an approved entry test. */
export function entryTestOpened(userId: string, pullRequest?: EntryTest['pullRequest']) {
  return mockAction('github.webhook.pull_request.opened', { userId, pullRequest }, () => {
    const state = db.get()
    const user = state.users.find((u) => u.id === userId)
    if (!githubHandle(user)) throw new MockError('A conta não tem GitHub vinculado; o webhook é ignorado.')
    const current = state.entryTests.find((t) => t.userId === userId)
    if (current?.status === 'approved') throw new MockError('O teste de entrada já está aprovado.')
    const number = 40 + Math.floor(Math.random() * 900)
    const test = {
      userId,
      pullRequest: pullRequest ?? {
        repository: ENTRY_TEST_REPOSITORY,
        number,
        title: 'Meu primeiro commit na He4rt',
        url: `https://github.com/${ENTRY_TEST_REPOSITORY}/pull/${number}`,
      },
      status: 'open' as const,
      reviewer: null,
      openedAt: new Date().toISOString(),
      approvedAt: null,
    }
    db.set((s) => ({ ...s, entryTests: [...s.entryTests.filter((t) => t.userId !== userId), test] }))
    touchSync()
    track('squad_test_submitted', { userId })
  })
}

/** `pull_request.closed` on the entry test PR, merged or not, by someone from the staff. */
export function entryTestClosed(userId: string, merged: boolean, reviewerId = 'u8', reviewerHandle?: string, pullRequest?: EntryTest['pullRequest']) {
  return mockAction('github.webhook.pull_request.closed', { userId, merged, reviewerHandle }, () => {
    const state = db.get()
    const test = state.entryTests.find((t) => t.userId === userId && t.status === 'open')
    if (!test) throw new MockError('Não há PR de teste aberto.')
    if (pullRequest && (pullRequest.number !== test.pullRequest.number || pullRequest.repository.toLowerCase() !== test.pullRequest.repository.toLowerCase())) {
      throw new MockError('Este não é o PR de teste aguardando revisão.')
    }
    if (merged && !isStaff(state.users.find((u) => u.id === reviewerId))) throw new MockError('O merge do teste precisa ser feito pela staff.')
    const reviewer = reviewerHandle ?? githubHandle(state.users.find((u) => u.id === reviewerId))
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      entryTests: s.entryTests.map((t) =>
        t.userId === userId
          ? { ...t, status: merged ? ('approved' as const) : ('closed' as const), reviewer, approvedAt: merged ? now : null }
          : t,
      ),
    }))
    touchSync()
    if (merged) track('squad_test_approved', { userId })
  })
}

/** `organization.member_added`: the member accepted the GitHub invite and becomes active in the squad. */
export function inviteAccepted(applicationId: string) {
  return mockAction('github.webhook.organization.member_added', { applicationId }, () => {
    const state = db.get()
    const app = state.applications.find((a) => a.id === applicationId)
    if (app?.status === 'accepted' && app.githubInvite === 'accepted') return
    if (!app || app.status !== 'accepted' || app.githubInvite !== 'pending') {
      throw new MockError('Não há convite pendente para esta candidatura.')
    }
    const project = state.projects.find((p) => p.id === app.projectId)
    if (!project) throw new MockError('Projeto não encontrado.')
    if (project.status !== 'active') throw new MockError('O projeto não está ativo.')
    const members = activeMemberships(state, project.id)
    if (members.some((m) => m.userId === app.userId)) throw new MockError('Esta pessoa já participa do projeto.')
    if (members.length + reservedSeats(state, project.id) > project.seats) throw new MockError('O projeto está sem lugares livres.')
    const squad = state.squads.find((s) => s.id === project.squadId)
    db.set((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === applicationId ? { ...a, githubInvite: 'accepted' as const } : a)),
      memberships: [
        ...s.memberships,
        {
          id: newId(),
          squadId: project.squadId,
          projectId: project.id,
          userId: app.userId,
          responsibilities: '',
          joinedAt: new Date().toISOString(),
          leftAt: null,
          leftReason: null,
          shownOnProfile: false,
        },
      ],
    }))
    appendLog({
      squadId: project.squadId,
      projectId: project.id,
      kind: 'member-joined',
      actorId: squad?.captainId ?? app.userId,
      subjectId: app.userId,
    })
    touchSync()
    track('squad_joined', { userId: app.userId, squadId: project.squadId })
  })
}

/**
 * `projects_v2_item.edited`: an item moved on the board. Reaching "done"
 * creates a pending delivery when the item qualifies; a technical item
 * needs a merged pull request.
 */
export function boardItemMoved(itemId: string, status: BoardStatus) {
  return mockAction('github.webhook.projects_v2_item.edited', { itemId, status }, () => {
    const state = db.get()
    const item = state.boardItems.find((i) => i.id === itemId)
    if (!item) throw new MockError('Item não encontrado no board.')
    db.set((s) => ({
      ...s,
      boardItems: s.boardItems.map((i) => (i.id === itemId ? { ...i, status, updatedAt: new Date().toISOString() } : i)),
    }))
    touchSync()
    if (status !== 'done') return { delivery: null }
    return { delivery: createPendingDelivery(itemId, item.status !== status) }
  })
}

/** Builds the pending delivery from the board item with the credit pre-filled from GitHub. */
function createPendingDelivery(itemId: string, changed = false): string | null {
  const state = db.get()
  const item = state.boardItems.find((i) => i.id === itemId)
  if (!item) return null
  if (state.projects.find((p) => p.id === item.projectId)?.status !== 'active') return null
  const merged = item.pullRequests.filter((pr) => pr.merged)
  if (item.kind === 'technical' && merged.length === 0) return null
  const existing = state.deliveries.find((d) => d.boardItemId === itemId)
  if (existing?.status === 'accepted' || existing?.status === 'pending') return null
  if (existing?.status === 'returned' && !changed) return null

  const repo = state.projects.find((p) => p.id === item.projectId)?.repository?.fullName.split('/')[1] ?? 'repo'
  const people = [...new Set([...merged.flatMap((pr) => [pr.authorId, ...pr.coAuthorIds, ...(pr.reviewerIds ?? [])]), ...item.assigneeIds])]
  const evidence: Evidence[] = merged.flatMap((pr) => [{
    kind: 'pull-request',
    ref: `${repo}#${pr.number}`,
    url: pr.url,
    authorId: pr.authorId,
  } as Evidence, ...(pr.reviewerIds ?? []).map((authorId) => ({ kind: 'review' as const, ref: `${repo}#${pr.number}:review:${authorId}`, url: `${pr.url}/files`, authorId }))])
  const delivery: SquadDelivery = {
    id: existing?.id ?? newId(),
    projectId: item.projectId,
    boardItemId: item.id,
    title: item.issue.title,
    kind: item.kind,
    criterionId: item.criterionId,
    status: 'pending',
    collaboration: people.length > 2 ? 'group' : people.length === 2 ? 'pair' : 'individual',
    credits: people.map((userId) => ({ userId, part: '' })),
    context: existing?.context ?? '',
    evidence,
    returnedReason: existing?.returnedReason ?? null,
    decidedBy: null,
    decidedAt: null,
    decisions: existing?.decisions ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  db.set((s) => ({ ...s, deliveries: [...s.deliveries.filter((d) => d.id !== delivery.id), delivery] }))
  return delivery.id
}

/** Merges a pull request on a board item, so it can become a delivery. */
export function pullRequestMerged(
  itemId: string,
  authorId: string,
  coAuthorIds: string[] = [],
  pullRequest?: { number: number; url: string; reviewerIds?: string[] },
) {
  return mockAction('github.webhook.pull_request.closed', { itemId, merged: true, pullRequest }, () => {
    const project = db.get().projects.find((p) => p.id === db.get().boardItems.find((i) => i.id === itemId)?.projectId)
    const number = pullRequest?.number ?? 40 + Math.floor(Math.random() * 900)
    const url = pullRequest?.url ?? `${project?.repository?.url}/pull/${number}`
    const changed = !db.get().boardItems.find((i) => i.id === itemId)?.pullRequests.some((pr) => pr.number === number && pr.merged)
    db.set((s) => ({
      ...s,
      boardItems: s.boardItems.map((i) =>
        i.id === itemId
          ? {
              ...i,
              pullRequests: [
                ...i.pullRequests.filter((pr) => pr.number !== number),
                { number, merged: true, authorId, coAuthorIds, reviewerIds: [...new Set(pullRequest?.reviewerIds ?? [])], url },
              ],
            }
          : i,
      ),
    }))
    touchSync()
    if (db.get().boardItems.find((i) => i.id === itemId)?.status === 'done') createPendingDelivery(itemId, changed)
  })
}

/** Periodic sweep: catches up on items that reached "done" without a webhook. */
export function sweep() {
  return mockAction('github.sweep', null, () => {
    const created = db
      .get()
      .boardItems.filter((i) => i.status === 'done')
      .map((i) => createPendingDelivery(i.id))
      .filter((id) => id !== null)
    db.set((s) => ({ ...s, githubSync: { ...s.githubSync, lastSweepAt: new Date().toISOString() } }))
    return { created: created.length }
  })
}

/** A change made by hand on GitHub that the Hub did not ask for. */
export function accessDiverged(description: string) {
  return mockAction('github.webhook.membership.removed', { description }, () => {
    db.set((s) => ({
      ...s,
      githubSync: {
        ...s.githubSync,
        divergences: [...s.githubSync.divergences, { id: newId(), description, detectedAt: new Date().toISOString() }],
      },
    }))
  })
}

/** `repository.created` + `projects_v2.created`: the App finished creating the project on GitHub. */
export function projectProvisioned(projectId: string, board?: { number: number; url: string }, actorId = 'u8') {
  return mockAction('github.webhook.projects_v2.created', { projectId, board }, () => {
    const state = db.get()
    const project = state.projects.find((p) => p.id === projectId && p.status === 'provisioning')
    if (!project) throw new MockError('Não há projeto esperando o GitHub.')
    const squad = state.squads.find((s) => s.id === project.squadId)
    const now = new Date().toISOString()
    const number = 20 + Math.floor(Math.random() * 80)
    db.set((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, status: 'active' as const, startedAt: now, board: board ?? { number, url: `https://github.com/orgs/${GITHUB_ORG}/projects/${number}` } }
          : p,
      ),
      squads: s.squads.map((sq) => (sq.id === project.squadId ? { ...sq, status: 'active' as const } : sq)),
      memberships:
        squad?.captainId && !s.memberships.some((m) => m.projectId === projectId && m.userId === squad.captainId)
          ? [
              ...s.memberships,
              { id: newId(), squadId: project.squadId, projectId, userId: squad.captainId, responsibilities: 'Capitão.', joinedAt: now, leftAt: null, leftReason: null, shownOnProfile: false },
            ]
          : s.memberships,
    }))
    appendLog({ squadId: project.squadId, projectId, kind: 'project-started', actorId, detail: project.name })
    touchSync()
  })
}

/**
 * `projects_v2_item.created`/`edited`: an issue on the project's board, as GitHub has it now. Creates or
 * updates the board item (matched by issue number); reaching "done" works like `boardItemMoved`.
 */
export function boardItemSynced(
  projectId: string,
  item: Pick<BoardItem, 'issue' | 'status' | 'kind' | 'assigneeIds'> & Partial<Pick<BoardItem, 'criterionId'>>,
) {
  return mockAction('github.webhook.projects_v2_item.edited', { projectId, issue: item.issue.number, status: item.status }, () => {
    const state = db.get()
    if (!state.projects.some((p) => p.id === projectId)) throw new MockError('Projeto não encontrado.')
    const existing = state.boardItems.find((i) => i.projectId === projectId && i.issue.number === item.issue.number)
    const id = existing?.id ?? newId()
    const next: BoardItem = {
      id,
      projectId,
      criterionId: existing?.criterionId ?? null,
      pullRequests: existing?.pullRequests ?? [],
      ...item,
      updatedAt: new Date().toISOString(),
    }
    db.set((s) => ({ ...s, boardItems: [...s.boardItems.filter((i) => i.id !== id), next] }))
    touchSync()
    const changed = !existing || existing.status !== item.status || existing.issue.title !== item.issue.title || existing.kind !== item.kind || existing.criterionId !== next.criterionId || existing.assigneeIds.join(',') !== item.assigneeIds.join(',')
    return { itemId: id, delivery: item.status === 'done' ? createPendingDelivery(id, changed) : null }
  })
}

/** Repositories of the organization, after the App listed them. */
export function repositoriesSynced(repositories: string[]) {
  return mockAction('github.sweep.repositories', { count: repositories.length }, () => {
    db.set((s) => ({ ...s, githubSync: { ...s.githubSync, repositories, lastSweepAt: new Date().toISOString() } }))
  })
}
