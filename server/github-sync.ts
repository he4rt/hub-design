import { GITHUB_ORG } from '@/lib/github'
import type { BoardItem, BoardStatus } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'
import { execute, withContext } from './actions'
import { readState } from './database/read-state'
import { sql } from './database/connection'
import { githubEnabled, graphql, rest } from './github-app'
import { inspectAccess, jobs, linkTeam, reconcileAccess, resource, saveResource, syncReadme, userIdByGithub, type RemoteUser } from './github-effects'

/*
 * The squads on GitHub, through the Hub's GitHub App, like the jobs and webhook controller of the
 * Laravel app. After an action the Hub acts on GitHub (creates the project's repository and board,
 * invites accepted members); GitHub's webhooks come back as calls to the functions of
 * src/mocks/github.ts, the same ones the debug sidebar simulates, so the rules stay in one place.
 * A failure on GitHub never undoes the action: it becomes a divergence in the admin's GitHub page.
 */

const ORG = GITHUB_ORG
const GITHUB_MODULE = 'mocks/github'

/** Calls one function of src/mocks/github.ts as the system, with what GitHub sent. */
async function run(name: string, args: unknown[]) {
  const request = new Request('http://hub.internal/github')
  const { output, failure } = await withContext(request, (context) => execute(context, { module: GITHUB_MODULE, export: name, args }, true))
  if (failure) {
    if (!(failure instanceof MockError)) throw failure
  }
  return { output, failure }
}

async function diverged(description: string) {
  if (readState().githubSync.divergences.some((d) => d.description === description)) return
  console.error(`[github] divergência: ${description}`)
  await run('accessDiverged', [description])
}

/** Lists the organization's repositories into the Hub, so projects create or link the right one. */
export async function syncRepositories() {
  if (!githubEnabled()) return
  const repositories: string[] = []
  for (let page = 1; ; page++) {
    const batch = (await rest<{ full_name: string; archived: boolean }[]>(ORG, 'GET', `/orgs/${ORG}/repos?per_page=100&page=${page}`)) ?? []
    repositories.push(...batch.filter((r) => !r.archived).map((r) => r.full_name))
    if (batch.length < 100) break
  }
  await run('repositoriesSynced', [repositories.sort()])
}

const STATUS_OPTIONS: { name: string; status: BoardStatus; color: string; description: string }[] = [
  { name: 'Backlog', status: 'backlog', color: 'GRAY', description: 'Ainda não priorizado.' },
  { name: 'Ready', status: 'ready', color: 'BLUE', description: 'Pronto para alguém pegar.' },
  { name: 'In progress', status: 'in-progress', color: 'YELLOW', description: 'Alguém está fazendo.' },
  { name: 'In review', status: 'in-review', color: 'PURPLE', description: 'Pull request em revisão.' },
  { name: 'Done', status: 'done', color: 'GREEN', description: 'Feito; vira entrega para o capitão.' },
]

/** Board column name to the Hub's status. "Todo" (GitHub's default) and unknown names are the backlog. */
export function boardStatus(name: string | null | undefined): BoardStatus {
  const key = (name ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
  if (['done', 'feito', 'concluido'].includes(key)) return 'done'
  if (['in review', 'em revisao', 'review'].includes(key)) return 'in-review'
  if (['in progress', 'em andamento', 'fazendo', 'doing'].includes(key)) return 'in-progress'
  if (['ready', 'pronto', 'a fazer'].includes(key)) return 'ready'
  return 'backlog'
}

/**
 * A new project gets its repository (from `<org>/template-squad` when it exists, or an empty one;
 * an existing repository is linked) and a Projects board linked to it, with the Hub's columns.
 */
export async function provisionProject(projectId: string) {
  const project = readState().projects.find((p) => p.id === projectId)
  if (!project?.repository || project.status !== 'provisioning') return
  const [owner, name] = project.repository.fullName.split('/')
  try {
    let repo = await rest<{ node_id: string; full_name: string; html_url: string }>(ORG, 'GET', `/repos/${owner}/${name}`)
    if (!repo) {
      if (resource<{ repositoryMode?: string }>(`intent:${projectId}`)?.repositoryMode === 'link') throw new Error('Repositório vinculado não encontrado; não será recriado.')
      const template = await rest(ORG, 'GET', `/repos/${ORG}/template-squad`)
      repo = template
        ? await rest(ORG, 'POST', `/repos/${ORG}/template-squad/generate`, { owner: ORG, name, description: project.goal, private: false })
        : await rest(ORG, 'POST', `/orgs/${ORG}/repos`, { name, description: project.goal, auto_init: true, has_projects: true })
    }
    if (!repo) throw new Error(`O GitHub não criou ${project.repository.fullName}.`)

    const { organization } = await graphql<{ organization: { id: string } }>(ORG, 'query($login: String!) { organization(login: $login) { id } }', {
      login: ORG,
    })
    // The deterministic title recovers a successful mutation whose response/DB checkpoint was lost.
    const title = `${project.name} [hub:${project.id}]`
    type Board = { id: string; number: number; url: string; title?: string }
    let board = resource<Board>(`board:${projectId}`)
    if (!board) {
      let cursor: string | null = null
      do {
        const page: { organization: { projectsV2: { nodes: Board[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } } = await graphql(ORG,
          `query($login:String!,$after:String){organization(login:$login){projectsV2(first:100,after:$after){nodes{id number url title} pageInfo{hasNextPage endCursor}}}}`, { login: ORG, after: cursor })
        board = page.organization.projectsV2.nodes.find((b) => b.title === title) ?? null
        cursor = page.organization.projectsV2.pageInfo.hasNextPage ? page.organization.projectsV2.pageInfo.endCursor : null
      } while (!board && cursor)
      if (!board) {
        const templateId = process.env.GITHUB_BOARD_TEMPLATE_ID
        if (templateId) {
          const copied = await graphql<{ copyProjectV2: { projectV2: Board } }>(ORG,
            `mutation($owner:ID!,$template:ID!,$title:String!){copyProjectV2(input:{ownerId:$owner,projectId:$template,title:$title,includeDraftIssues:false}){projectV2{id number url}}}`,
            { owner: organization.id, template: templateId, title })
          board = copied.copyProjectV2.projectV2
        } else {
          const created = await graphql<{ createProjectV2: { projectV2: Board } }>(ORG,
            `mutation($owner:ID!,$title:String!){createProjectV2(input:{ownerId:$owner,title:$title}){projectV2{id number url}}}`, { owner: organization.id, title })
          board = created.createProjectV2.projectV2
        }
      }
      saveResource(`board:${projectId}`, board)
    }
    if (!process.env.GITHUB_BOARD_TEMPLATE_ID) {
      await setStatusColumns(board.id)
      await ensureBoardFields(board.id)
    }
    // Linking shows the board in the repository's Projects tab; it needs write access to the repository's
    // contents, which the App may not have. The board works without it.
    await graphql(ORG, `mutation($p: ID!, $r: ID!) { linkProjectV2ToRepository(input: { projectId: $p, repositoryId: $r }) { repository { id } } }`, {
      p: board.id,
      r: repo.node_id,
    })
    await linkTeam(board.id, projectId)
    await reconcileAccess(projectId)
    await syncReadme(projectId, `project-${projectId}`)
    await run('projectProvisioned', [projectId, { number: board.number, url: board.url }, resource<{ actorId?: string }>(`intent:${projectId}`)?.actorId])
    await syncRepositories()
    console.log(`[github] projeto ${project.name}: ${repo.full_name} e board #${board.number}`)
  } catch (error) {
    await diverged(`O projeto ${project.name} aguarda nova tentativa de provisionamento no GitHub.`)
    throw error
  }
}

async function setStatusColumns(boardId: string) {
  const { node } = await graphql<{ node: { field: { id: string } | null } }>(
    ORG,
    `query($id: ID!) { node(id: $id) { ... on ProjectV2 { field(name: "Status") { ... on ProjectV2SingleSelectField { id } } } } }`,
    { id: boardId },
  )
  if (!node.field) throw new Error('o board não tem o campo Status')
  await graphql(
    ORG,
    `mutation($field: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
      updateProjectV2Field(input: { fieldId: $field, singleSelectOptions: $options }) { projectV2Field { ... on ProjectV2SingleSelectField { id } } }
    }`,
    { field: node.field.id, options: STATUS_OPTIONS.map(({ name, color, description }) => ({ name, color, description })) },
  )
}

async function ensureBoardFields(boardId: string) {
  const { node } = await graphql<{ node: { fields: { nodes: { name?: string }[] } } }>(ORG,
    `query($id:ID!){node(id:$id){... on ProjectV2{fields(first:100){nodes{... on ProjectV2FieldCommon{name}}}}}}`, { id: boardId })
  const fields = node.fields.nodes.map((f) => f.name)
  for (const name of ['Tipo', 'Critério']) {
    if (fields.includes(name)) continue
    await graphql(ORG,
      `mutation($p:ID!,$name:String!,$type:ProjectV2FieldType!,$options:[ProjectV2SingleSelectFieldOptionInput!]){createProjectV2Field(input:{projectId:$p,name:$name,dataType:$type,singleSelectOptions:$options}){projectV2Field{... on ProjectV2FieldCommon{id}}}}`,
      { p: boardId, name, type: name === 'Tipo' ? 'SINGLE_SELECT' : 'TEXT', options: name === 'Tipo' ? [
        { name: 'Técnica', color: 'GRAY', description: 'Exige PR merged.' },
        { name: 'Não técnica', color: 'GRAY', description: 'Documentação, design ou facilitação.' },
      ] : undefined })
  }
}

/** Projects left waiting for GitHub (a failure, or the API stopped midway) are provisioned again. */
export async function retryProvisioning() {
  if (!githubEnabled()) return
  for (const project of readState().projects.filter((p) => p.status === 'provisioning')) jobs.enqueue('provision', `provision:${project.id}`, { projectId: project.id })
}

/** An accepted application invites the member to the organization; one already in it joins now. */
export async function inviteMember(applicationId: string) {
  const state = readState()
  const application = state.applications.find((a) => a.id === applicationId)
  const project = state.projects.find((p) => p.id === application?.projectId)
  if (!application || application.status !== 'accepted' || application.githubInvite !== 'pending' || project?.status !== 'active') return
  await reconcileAccess(project.id)
  const grants = resource<Record<string, { login: string }>>(`grants:${project.id}`)
  const login = grants?.[application.userId]?.login
  if (!login) return
  const squad = state.squads.find((s) => s.id === project.squadId)!
  const membership = await rest<{ state: string }>(ORG, 'GET', `/orgs/${ORG}/teams/squad-${squad.slug}/memberships/${login}`)
  if (membership?.state === 'active') await run('inviteAccepted', [applicationId])
}

/** What the Hub does on GitHub after an action succeeded. */
export async function afterAction(call: { module: string; export: string; args: unknown[] }, output: unknown) {
  // Compatibility only; durable intents are now written by execute(), not after its commit.
  void call
  void output
}

type PullRequestPayload = {
  action: string
  repository: { full_name: string }
  pull_request: {
    number: number
    title: string
    html_url: string
    body: string | null
    merged: boolean
    user: RemoteUser
    merged_by: RemoteUser | null
  }
}

/** Issue numbers a pull request closes ("Closes #12", "fixes #3"). */
export function closedIssues(body: string | null): number[] {
  return [...(body ?? '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]))
}

async function onPullRequest(payload: PullRequestPayload) {
  const state = readState()
  const pr = payload.pull_request
  const repository = payload.repository.full_name.toLowerCase()
  const authorId = userIdByGithub(state, pr.user)

  if (repository.startsWith(`${ORG.toLowerCase()}/`)) {
    if (!authorId) return console.log(`[github] PR de teste de @${pr.user.login}, que não tem conta no Hub`)
    const test = state.entryTests.find((t) => t.userId === authorId)
    const reference = { repository: payload.repository.full_name, number: pr.number, title: pr.title, url: pr.html_url }
    if (payload.action === 'opened' || payload.action === 'reopened') {
      if (test?.status !== 'approved' && !(test?.status === 'open' && test.pullRequest.repository.toLowerCase() === repository && test.pullRequest.number === pr.number)) await run('entryTestOpened', [authorId, reference])
    }
    if (payload.action === 'closed') {
      const reviewerId = userIdByGithub(state, pr.merged_by)
      const staff = state.users.find((u) => u.id === reviewerId && ['admin', 'super-admin'].includes(u.role))
      if (!pr.merged || staff) {
        if (!test) await run('entryTestOpened', [authorId, reference])
        await run('entryTestClosed', [authorId, pr.merged, reviewerId ?? '', pr.merged_by?.login, reference])
      }
    }
  }

  if (payload.action !== 'closed' || !pr.merged || !authorId) return
  saveResource(`merged:${repository}:${pr.number}`, payload)
  const project = state.projects.find((p) => p.repository?.fullName.toLowerCase() === repository && p.status !== 'ended')
  if (!project) return
  const commits = await rest<{ author: RemoteUser | null; committer: RemoteUser | null; commit: { message: string } }[]>(ORG, 'GET', `/repos/${repository}/pulls/${pr.number}/commits?per_page=100`) ?? []
  const reviews = await rest<{ user: RemoteUser | null; state: string }[]>(ORG, 'GET', `/repos/${repository}/pulls/${pr.number}/reviews?per_page=100`) ?? []
  const people = new Set<string>()
  for (const commit of commits) {
    for (const account of [commit.author, commit.committer]) {
      const id = userIdByGithub(state, account)
      if (id && id !== authorId) people.add(id)
    }
    // GitHub's noreply trailer embeds the numeric account id; never resolve arbitrary email by login.
    for (const match of commit.commit.message.matchAll(/Co-authored-by:[^\n]*<(\d+)\+([^@>]+)@users\.noreply\.github\.com>/gi)) {
      const id = userIdByGithub(state, { id: Number(match[1]), login: match[2] })
      if (id && id !== authorId) people.add(id)
    }
  }
  const [owner, name] = repository.split('/')
  let cursor: string | null = null
  const linkedIssues = new Set(closedIssues(pr.body))
  do {
    type Attribution = { repository: { pullRequest: {
      closingIssuesReferences: { nodes: { number: number; repository: { nameWithOwner: string } }[] }
      commits: { nodes: { commit: { authors: { nodes: { user: { databaseId: number; login: string } | null }[] } } }[]; pageInfo: { hasNextPage: boolean; endCursor: string } }
    } } }
    const data: Attribution = await graphql(ORG,
      `query($owner:String!,$name:String!,$number:Int!,$after:String){repository(owner:$owner,name:$name){pullRequest(number:$number){closingIssuesReferences(first:100){nodes{number repository{nameWithOwner}}} commits(first:100,after:$after){nodes{commit{authors(first:100){nodes{user{databaseId login}}}}} pageInfo{hasNextPage endCursor}}}}}`,
      { owner, name, number: pr.number, after: cursor })
    const remote = data.repository.pullRequest
    for (const issue of remote.closingIssuesReferences.nodes) if (issue.repository.nameWithOwner.toLowerCase() === repository) linkedIssues.add(issue.number)
    for (const commit of remote.commits.nodes) for (const author of commit.commit.authors.nodes) {
      const id = author.user && userIdByGithub(state, { id: author.user.databaseId, login: author.user.login })
      if (id && id !== authorId) people.add(id)
    }
    cursor = remote.commits.pageInfo.hasNextPage ? remote.commits.pageInfo.endCursor : null
  } while (cursor)
  const reviewerIds = [...new Set(reviews.filter((r) => r.state !== 'PENDING').map((r) => userIdByGithub(state, r.user)).filter((id): id is string => !!id))]
  for (const issue of linkedIssues) {
    const item = state.boardItems.find((i) => i.projectId === project.id && i.issue.number === issue)
    if (item) await run('pullRequestMerged', [item.id, authorId, [...people], { number: pr.number, url: pr.html_url, reviewerIds }])
  }
}

type ItemNode = {
  id: string
  isArchived: boolean
  project: { number: number; owner: { login: string } }
  status: { name: string } | null
  criterion: { text?: string; name?: string } | null
  kind: { name: string } | null
  content: {
    __typename: string
    number?: number
    title?: string
    url?: string
    labels?: { nodes: { name: string }[] }
    assignees?: { nodes: { databaseId: number; login: string }[] }
  } | null
}

async function onBoardItem(payload: { action: string; projects_v2_item: { node_id: string } }) {
  if (['deleted', 'archived'].includes(payload.action)) return
  const { node } = await graphql<{ node: ItemNode | null }>(
    ORG,
    `query($id: ID!) { node(id: $id) { ... on ProjectV2Item {
      id isArchived
      project { number owner { ... on Organization { login } } }
      status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
      criterion: fieldValueByName(name: "Critério") { ... on ProjectV2ItemFieldTextValue { text } ... on ProjectV2ItemFieldSingleSelectValue { name } }
      kind: fieldValueByName(name: "Tipo") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
      content { __typename ... on Issue { number title url labels(first: 20) { nodes { name } } assignees(first: 100) { nodes { databaseId login } } } }
    } } }`,
    { id: payload.projects_v2_item.node_id },
  )
  if (!node || node.isArchived || node.content?.__typename !== 'Issue' || node.project.owner.login.toLowerCase() !== ORG.toLowerCase()) return
  const state = readState()
  const project = state.projects.find((p) => p.board?.number === node.project.number && p.status !== 'ended')
  if (!project) return
  const issue = node.content
  const labels = (issue.labels?.nodes ?? []).map((l) => l.name.toLowerCase())
  const item: Pick<BoardItem, 'issue' | 'status' | 'kind' | 'assigneeIds' | 'criterionId'> = {
    issue: { number: issue.number!, title: issue.title!, url: issue.url! },
    status: boardStatus(node.status?.name),
    kind: [...labels, node.kind?.name?.toLowerCase()].some((l) => ['non-technical', 'não técnica', 'nao tecnica'].includes(l ?? '')) ? 'non-technical' : 'technical',
    criterionId: project.acceptanceCriteria.find((c) => c.id === node.criterion?.text || c.text === (node.criterion?.text ?? node.criterion?.name))?.id ?? null,
    assigneeIds: (issue.assignees?.nodes ?? []).map((a) => userIdByGithub(state, { id: a.databaseId, login: a.login })).filter((id): id is string => !!id),
  }
  await run('boardItemSynced', [project.id, item])
  for (const row of sql.query<{ value: string }, [string]>('SELECT value FROM github_resources WHERE key LIKE ?').all(`merged:${project.repository?.fullName.toLowerCase()}:%`)) {
    await onPullRequest(JSON.parse(row.value) as PullRequestPayload)
  }
}

async function onMemberAdded(user: RemoteUser) {
  const state = readState()
  const userId = userIdByGithub(state, user)
  if (!userId) return
  for (const application of state.applications.filter((a) => a.userId === userId && a.status === 'accepted' && a.githubInvite === 'pending')) {
    await inviteMember(application.id)
  }
}

/** Dispatches one webhook delivery GitHub already signed and the API accepted. */
export async function handleWebhook(_request: Request, event: string, payload: Record<string, unknown>) {
  const action = payload.action as string | undefined
  if (event === 'pull_request') await onPullRequest(payload as unknown as PullRequestPayload)
  if (event === 'projects_v2_item') await onBoardItem(payload as { action: string; projects_v2_item: { node_id: string } })
  if (event === 'organization' && action === 'member_added') {
    await onMemberAdded((payload as { membership: { user: RemoteUser } }).membership.user)
  }
  if (event === 'membership' && action === 'added') await onMemberAdded((payload as { member: RemoteUser }).member)
  if (event === 'membership' && action === 'removed') await diverged('Uma participação no time foi removida diretamente no GitHub; reconciliação pendente.')
  if (event === 'pull_request_review') {
    const data = payload as unknown as { repository: { full_name: string }; pull_request: { number: number } }
    const pr = await rest<PullRequestPayload['pull_request']>(ORG, 'GET', `/repos/${data.repository.full_name}/pulls/${data.pull_request.number}`)
    if (pr?.merged) await onPullRequest({ action: 'closed', repository: data.repository, pull_request: pr })
  }
  if (event === 'repository' || event === 'installation' || event === 'installation_repositories') await syncRepositories()
}

/** Paginated real GitHub reconciliation, never the local mock sweep that could reopen returned work. */
export async function sweepGithub() {
  await retryProvisioning()
  await syncRepositories()
  const state = readState()
  for (const project of state.projects.filter((p) => p.status === 'active')) {
    if (project.board) {
      let cursor: string | null = null
      do {
        const page: { organization: { projectV2: { items: { nodes: { id: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } | null } } = await graphql(ORG,
          `query($login:String!,$number:Int!,$after:String){organization(login:$login){projectV2(number:$number){items(first:100,after:$after){nodes{id} pageInfo{hasNextPage endCursor}}}}}`,
          { login: ORG, number: project.board.number, after: cursor })
        const items = page.organization.projectV2?.items
        if (!items) throw new Error('Board não encontrado na organização.')
        for (const item of items.nodes) await onBoardItem({ action: 'edited', projects_v2_item: { node_id: item.id } })
        cursor = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null
      } while (cursor)
    }
    if (await inspectAccess(project.id)) await diverged(`O time do projeto ${project.name} diverge dos vínculos decididos no Hub.`)
    await reconcileAccess(project.id)
  }
  // Scan every organization repository: the entry test is not restricted to primeiro-commit.
  for (const repository of readState().githubSync.repositories) {
    for (let page = 1; ; page++) {
      const prs = await rest<PullRequestPayload['pull_request'][]>(ORG, 'GET', `/repos/${repository}/pulls?state=all&per_page=100&page=${page}`) ?? []
      for (const summary of prs) {
        const pr = await rest<PullRequestPayload['pull_request'] & { state: string }>(ORG, 'GET', `/repos/${repository}/pulls/${summary.number}`)
        if (pr) await onPullRequest({ action: pr.state === 'open' ? 'opened' : 'closed', repository: { full_name: repository }, pull_request: pr })
      }
      if (prs.length < 100) break
    }
  }
  for (const app of readState().applications.filter((a) => a.status === 'accepted' && a.githubInvite === 'pending')) await inviteMember(app.id)
}

let working = false

/** One worker per process. Claims survive restarts; the lease is renewed while the network runs. */
export async function processGithubJobs(limit = 50) {
  if (working || !githubEnabled()) return
  working = true
  try {
    for (let index = 0; index < limit; index++) {
      const job = jobs.claim()
      if (!job) break
      const heartbeat = setInterval(() => sql.query('UPDATE github_jobs SET lease_until=? WHERE id=? AND lease_token=? AND status=\'processing\'').run(Date.now() + 300_000, job.id, job.lease_token), 60_000)
      try {
        const data = JSON.parse(job.payload)
        if (job.kind === 'webhook') await handleWebhook(new Request('http://hub.internal/github'), data.event, data.payload)
        else if (job.kind === 'provision') await provisionProject(data.projectId)
        else if (job.kind === 'access') {
          await reconcileAccess(data.projectId)
          for (const app of readState().applications.filter((a) => a.projectId === data.projectId)) await inviteMember(app.id)
        }
        else if (job.kind === 'readme') await syncReadme(data.projectId, data.revision)
        else if (job.kind === 'sweep') await sweepGithub()
        else throw new Error('Job GitHub desconhecido.')
        jobs.complete(job)
      } catch {
        jobs.fail(job)
        await diverged(`Job GitHub #${job.id} falhou na tentativa ${job.attempts}; retentativa agendada.`)
      } finally {
        clearInterval(heartbeat)
      }
    }
  } finally {
    working = false
  }
}

export function startGithubWorker() {
  const tick = () => {
    if (!githubEnabled()) return
    jobs.enqueue('sweep', `sweep:periodic:${Math.floor(Date.now() / 900_000)}`, {})
    void processGithubJobs().catch(() => console.error('[github] worker aguarda recuperação.'))
  }
  tick()
  return setInterval(tick, 2000)
}
