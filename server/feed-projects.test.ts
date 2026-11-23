import { beforeEach, expect, test } from 'bun:test'
import './runtime'
import { migrateFeed } from './database/migrate-feed'

// Persistence checks must never connect to the running prototype's database.
process.env.DB_PATH = ':memory:'
const { db } = await import('@/mocks/db')
const { createProject, updateProject, createComment, deletePost, savePost } =
  await import('@/modules/panel-app/features/community/feed/actions')
const { createDiscussion, replyToDiscussion } = await import('@/modules/panel-app/features/community/discussions/actions')
const { memberAchievements } = await import('@/mocks/achievements')
const { migrateFresh, replaceRows, sql } = await import('./database/connection')
const { writeState } = await import('./database/write-state')
const { readState } = await import('./database/read-state')
const { showState } = await import('./actions')
const { createSession, sessionCookie } = await import('./auth')

const databaseFile = sql.query<{ name: string; file: string }, []>('PRAGMA database_list').all().find((entry) => entry.name === 'main')?.file
if (databaseFile && !databaseFile.includes('/.amp/in/orb-backup/')) {
  throw new Error('Feed tests require a disposable SQLite connection, not the shared development database.')
}

const input = {
  repository: 'https://github.com/danielhe4rt/agenda-de-lives',
  pitch: 'Agenda com lembrete para as lives da comunidade.',
  shownOnProfile: false,
  showReactionCounts: false,
}
const question = {
  title: 'Como evitar N+1 na consulta da agenda?',
  category: 'question' as const,
  body: 'Tentei carregar as lives com seus autores, mas a consulta ainda faz uma busca por item. Qual caminho vocês sugerem?',
}

beforeEach(() => db.reset())

test('a Feed project only showcases the repository, preserves edits and never manufactures diary XP', async () => {
  const before = memberAchievements(db.get(), 'u1', Date.now())
  const post = await createProject('u1', input)
  const project = db.get().memberProjects.find((p) => p.id === post.projectId)!
  expect(project.repository.fullName).toBe('danielhe4rt/agenda-de-lives')
  expect(project).not.toHaveProperty('helpRequest')
  expect(project).not.toHaveProperty('intent')
  expect(post).toMatchObject({ sharedOnFeed: true, shownOnProfile: false })
  expect(memberAchievements(db.get(), 'u1', Date.now())).toEqual(before)
  await updateProject('u1', post.id, { ...input, pitch: 'Agenda de lives com lembretes e filtros por tema.' })
  expect(db.get().memberProjects.find((p) => p.id === project.id)?.revisions).toMatchObject([{ pitch: input.pitch }])
  expect(db.get().feedPosts.find((p) => p.id === post.id)?.editedAt).not.toBeNull()
  await expect(updateProject('u2', post.id, input)).rejects.toThrow('Só quem publicou')
})

test('repositories belong to the linked account, cannot be duplicated and still pass moderation', async () => {
  await expect(createProject('u2', input)).rejects.toThrow('sua conta')
  await expect(createProject('u1', { ...input, repository: 'https://example.com/agenda' })).rejects.toThrow('GitHub')
  await expect(createProject('u1', { ...input, pitch: 'Quem não usa é idiota.' })).rejects.toThrow('moderação')
  await createProject('u1', input)
  await expect(createProject('u1', { ...input, repository: 'github.com/DANIELHE4RT/agenda-de-lives/' })).rejects.toThrow('já publicou')
  expect(db.get().memberProjects).toHaveLength(4)
})

test('Feed comments and bookmarks stay separate from project questions and forum replies', async () => {
  const post = await createProject('u1', input)
  await createComment('u2', post.id, 'Gostei da ideia da agenda.')
  await savePost('u2', post.id)
  db.set((state) => ({ ...state, session: { userId: 'u1' } }))
  const discussion = await createDiscussion({ ...question, context: { type: 'post', id: post.id } })
  const another = await createDiscussion({ ...question, title: 'Como agendar os lembretes sem duplicar os avisos?', context: { type: 'post', id: post.id } })
  expect(another.id).not.toBe(discussion.id)
  db.set((state) => ({ ...state, session: { userId: 'u2' } }))
  await replyToDiscussion({ discussionId: discussion.id, body: 'Carregue os autores de uma vez e agrupe pelo identificador da live.' })
  expect(db.get().discussions.find((d) => d.id === discussion.id)?.replies).toMatchObject([{ authorId: 'u2' }])
  expect(db.get().feedComments.filter((c) => c.postId === post.id)).toMatchObject([{ body: 'Gostei da ideia da agenda.' }])
  expect(db.get().feedBookmarks.some((b) => b.postId === post.id && b.userId === 'u2')).toBe(true)
  await expect(createDiscussion({ ...question, context: { type: 'post', id: post.id } })).rejects.toThrow('publicação sua')
  await deletePost('u1', post.id)
  await expect(createComment('u2', post.id, 'Comentário depois da exclusão')).rejects.toThrow('não existe')
  await expect(replyToDiscussion({ discussionId: discussion.id, body: 'Uma resposta depois de a publicação ficar privada.' })).rejects.toThrow('não está disponível')
})

test('project questions and replies retain automatic moderation in the forum', async () => {
  db.set((state) => ({ ...state, session: { userId: 'u1' } }))
  await expect(createDiscussion({ ...question, body: 'Você é idiota, não sabe programar.', context: null })).rejects.toThrow('moderação')
  await expect(replyToDiscussion({ discussionId: 't1', body: 'Você é idiota, não sabe programar.' })).rejects.toThrow('moderação')
  expect(db.get().discussions.find((d) => d.id === 't1')?.replies).toHaveLength(2)
})

test('legacy requests move once with authors, dates and replies; private history never becomes public', async () => {
  migrateFresh()
  const state = structuredClone(db.get())
  state.discussions = state.discussions.filter((discussion) => !discussion.id.startsWith('project-help-'))
  state.feedComments.push(
    { id: 'old-answer', postId: 'pp1', userId: 'u8', body: 'Separe cancelamento tardio de falta.', createdAt: '2026-11-21T10:15:00Z', deletedAt: null },
    { id: 'deleted-answer', postId: 'pp1', userId: 'u8', body: 'Resposta excluída pelo autor.', createdAt: '2026-11-21T10:16:00Z', deletedAt: '2026-11-21T10:17:00Z' },
  )
  replaceRows(() => writeState(state))
  sql.run("ALTER TABLE member_projects ADD COLUMN intent TEXT NOT NULL DEFAULT 'showcase' CHECK (intent IN ('showcase', 'help'))")
  sql.run('ALTER TABLE member_projects ADD COLUMN help_request TEXT')
  sql.run('ALTER TABLE feed_comments ADD COLUMN is_answer INTEGER NOT NULL DEFAULT 0 CHECK (is_answer IN (0, 1))')
  sql.run("UPDATE member_projects SET intent = 'help', help_request = 'Como contar as faltas corretamente?' WHERE id IN ('mp1', 'mp3')")
  sql.run("UPDATE feed_posts SET shown_on_profile = 1 WHERE id = 'pp1'")
  sql.run("UPDATE feed_posts SET shared_on_feed = 0, shown_on_profile = 0 WHERE id = 'pp3'")
  const postCount = state.feedPosts.length

  migrateFeed(sql)
  migrateFeed(sql)
  const moved = readState()
  const discussion = moved.discussions.find((discussion) => discussion.id === 'project-help-pp1')!
  expect(discussion).toMatchObject({
    authorId: 'u9', body: 'Como contar as faltas corretamente?', createdAt: '2026-11-21T08:00:00Z',
    context: { type: 'post', id: 'pp1' }, solvedReplyId: null,
    replies: [{ authorId: 'u8', body: 'Separe cancelamento tardio de falta.', createdAt: '2026-11-21T10:15:00Z' }],
  })
  expect(moved.discussions.filter((discussion) => discussion.id.startsWith('project-help-'))).toHaveLength(2)
  expect(moved.feedPosts).toHaveLength(postCount)
  expect(moved.feedComments.find((comment) => comment.id === 'old-answer')?.deletedAt).not.toBeNull()
  expect(moved.feedComments.find((comment) => comment.id === 'deleted-answer')?.deletedAt).toBe('2026-11-21T10:17:00Z')
  expect(moved.memberProjects.find((project) => project.id === 'mp1')?.revisions).toMatchObject([{ intent: 'help', helpRequest: 'Como contar as faltas corretamente?' }])

  const request = new Request('http://hub.test/api/state')
  const visitor = await showState(request).json()
  expect(visitor.discussions.some((d: { id: string }) => d.id.startsWith('project-help-'))).toBe(false)
  expect(visitor.discussions.some((d: { id: string }) => d.id === 't1')).toBe(true)
  const memberId = createSession(request, 'web', 'u2')
  const member = await showState(new Request(request, { headers: { cookie: sessionCookie('web', memberId) } })).json()
  expect(member.discussions.some((d: { id: string }) => d.id === 'project-help-pp1')).toBe(true)
  expect(member.discussions.some((d: { id: string }) => d.id === 'project-help-pp3')).toBe(false)
  const ownerId = createSession(request, 'web', 'u8')
  const owner = await showState(new Request(request, { headers: { cookie: sessionCookie('web', ownerId) } })).json()
  expect(owner.discussions.some((d: { id: string }) => d.id === 'project-help-pp3')).toBe(true)
  db.set(() => ({ ...moved, session: { userId: 'u2' } }))
  await expect(replyToDiscussion({ discussionId: 'project-help-pp3', body: 'Tente navegar somente com o teclado e o leitor de tela.' })).rejects.toThrow('não está disponível')
})

test('an existing pre-project Feed upgrades without losing data and accepts new projects and comments', async () => {
  migrateFresh()
  const before = structuredClone(db.get())
  before.feedPosts = before.feedPosts.filter((post) => !post.projectId)
  before.memberProjects = []
  before.feedComments = []
  before.discussions = before.discussions.filter((discussion) => !discussion.id.startsWith('project-help-'))
  replaceRows(() => writeState(before))
  sql.run('DROP TABLE feed_comments')
  sql.run('ALTER TABLE feed_posts DROP COLUMN project_id')
  sql.run('DROP TABLE member_project_revisions')
  sql.run('DROP TABLE member_projects')

  migrateFeed(sql)
  migrateFeed(sql)
  const upgraded = readState()
  expect(upgraded.users).toEqual(before.users)
  expect(upgraded.feedPosts).toEqual(before.feedPosts)
  expect(upgraded.discussions).toEqual(before.discussions)

  db.set(() => ({ ...upgraded, session: { userId: 'u1' } }))
  const post = await createProject('u1', input)
  await createComment('u2', post.id, 'Gostei de ver os projetos por aqui.')
  replaceRows(() => writeState(db.get()))
  const after = readState()
  expect(after.memberProjects).toMatchObject([{ repository: { fullName: 'danielhe4rt/agenda-de-lives' } }])
  expect(after.feedComments).toMatchObject([{ postId: post.id, body: 'Gostei de ver os projetos por aqui.' }])
  expect(sql.query('PRAGMA foreign_key_check').all()).toEqual([])
})
