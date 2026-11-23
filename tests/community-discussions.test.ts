import { afterEach, beforeEach, expect, test } from 'bun:test'

// Run the real action handlers against an isolated in-memory store, never SQLite or HTTP.
Object.assign(globalThis, {
  __HUB_SERVER__: true,
  window: { matchMedia: () => ({ matches: false }) },
})
const { db, seedState } = await import('../src/mocks/db')
const { createDiscussion, replyToDiscussion, setDiscussionSolution } = await import('../src/modules/panel-app/features/community/discussions/actions')
const { MockError } = await import('../src/mocks/mock-action')

const valid = { title: 'Como rodar os testes deste projeto?', category: 'question' as const, body: 'Quero entender como rodar os testes sem Docker.', context: null }

beforeEach(() => {
  const state = structuredClone(seedState)
  state.session = { userId: 'u1' }
  state.events = []
  state.discussions = [{
    id: 'discussion', authorId: 'u1', ...valid, createdAt: '2026-01-01T00:00:00.000Z', solvedReplyId: null,
    replies: [
      { id: 'reply-a', authorId: 'u2', body: 'Use o SQLite para rodar os testes.', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'reply-b', authorId: 'u1', body: 'Também funciona com o worker parado.', createdAt: '2026-01-03T00:00:00.000Z' },
    ],
  }]
  db.set(() => state)
})
afterEach(() => db.reset())

test('the author sets, replaces and clears exactly one solution; retrying is idempotent', async () => {
  const originalReplies = structuredClone(db.get().discussions[0].replies)
  await setDiscussionSolution({ discussionId: 'discussion', replyId: 'reply-a' })
  expect(db.get().discussions[0].solvedReplyId).toBe('reply-a')
  const marked = db.get()
  await setDiscussionSolution({ discussionId: 'discussion', replyId: 'reply-a' })
  expect(db.get()).toBe(marked)
  // No undocumented restriction prevents the discussion author from marking their own answer.
  await setDiscussionSolution({ discussionId: 'discussion', replyId: 'reply-b' })
  expect(db.get().discussions[0].solvedReplyId).toBe('reply-b')
  await setDiscussionSolution({ discussionId: 'discussion', replyId: null })
  expect(db.get().discussions[0].solvedReplyId).toBeNull()
  const cleared = db.get()
  await setDiscussionSolution({ discussionId: 'discussion', replyId: null })
  expect(db.get()).toBe(cleared)
  expect(db.get().discussions[0].replies).toEqual(originalReplies)
  expect(db.get().events.map(({ event, props }) => ({ event, props }))).toEqual([
    { event: 'discussion_solution_changed', props: { discussionId: 'discussion', replyId: null, userId: 'u1' } },
    { event: 'discussion_solution_changed', props: { discussionId: 'discussion', replyId: 'reply-b', userId: 'u1' } },
    { event: 'discussion_solution_changed', props: { discussionId: 'discussion', replyId: 'reply-a', userId: 'u1' } },
  ])
})

test('visitors and other members cannot set or clear the solution', async () => {
  await setDiscussionSolution({ discussionId: 'discussion', replyId: 'reply-a' })
  for (const session of [null, { userId: 'u2' }]) {
    db.set((state) => ({ ...state, session }))
    const before = structuredClone(db.get())
    for (const replyId of [null, 'reply-b']) {
      await expect(setDiscussionSolution({ discussionId: 'discussion', replyId })).rejects.toBeInstanceOf(MockError)
      expect(db.get()).toEqual(before)
    }
  }
})

test('missing discussions, missing replies and replies from another discussion do not mutate state', async () => {
  db.set((state) => ({ ...state, discussions: [...state.discussions, {
    ...state.discussions[0], id: 'other', replies: [{ ...state.discussions[0].replies[0], id: 'foreign-reply' }],
  }] }))
  const before = structuredClone(db.get())
  for (const input of [
    { discussionId: 'missing', replyId: null },
    { discussionId: 'discussion', replyId: 'missing' },
    { discussionId: 'discussion', replyId: 'foreign-reply' },
  ]) {
    await expect(setDiscussionSolution(input)).rejects.toBeInstanceOf(MockError)
    expect(db.get()).toEqual(before)
  }
})

for (const term of ['IDIOTA', 'imbecil', 'otário', 'retardado', 'lixo humano']) {
  for (const field of ['title', 'body'] as const) {
    test(`moderation blocks ${term} in discussion ${field} before writing or emitting success`, async () => {
      const before = structuredClone(db.get())
      const result = createDiscussion({ ...valid, [field]: `Como resolver isso? ${term}, tente explicar melhor.` })
      await expect(result).rejects.toMatchObject({ field })
      await expect(result).rejects.toThrow('moderação automática')
      expect(db.get()).toEqual(before)
    })
  }
  test(`moderation blocks ${term} in replies without changing the solution or emitting success`, async () => {
    await setDiscussionSolution({ discussionId: 'discussion', replyId: 'reply-a' })
    const before = structuredClone(db.get())
    await expect(replyToDiscussion({ discussionId: 'discussion', body: `Você é um ${term}, não sabe nada.` })).rejects.toMatchObject({ field: 'body' })
    expect(db.get()).toEqual(before)
  })
}

test('valid text is trimmed, stored and emits the existing creation/reply events', async () => {
  const { id } = await createDiscussion({ ...valid, title: `  ${valid.title}  `, body: `  ${valid.body}  ` })
  expect(db.get().discussions[0]).toMatchObject({ id, title: valid.title, body: valid.body, authorId: 'u1', solvedReplyId: null })
  const reply = await replyToDiscussion({ discussionId: id, body: '  Os testes funcionam com SQLite.  ' })
  expect(db.get().discussions[0].replies[0]).toMatchObject({ id: reply.id, body: 'Os testes funcionam com SQLite.', authorId: 'u1' })
  expect(db.get().events.map((event) => event.event)).toEqual(['discussion_replied', 'discussion_created'])
})

test('moderation does not block an offensive term embedded in an unrelated word', async () => {
  await createDiscussion({ ...valid, body: 'Um retardador de execução ajuda a testar temporizadores?' })
  expect(db.get().discussions).toHaveLength(2)
})

test('creation and replies still require a session and minimum text lengths', async () => {
  for (const input of [{ ...valid, title: 'Curto' }, { ...valid, category: null }, { ...valid, body: 'Curto' }]) {
    await expect(createDiscussion(input)).rejects.toBeInstanceOf(MockError)
  }
  await expect(replyToDiscussion({ discussionId: 'discussion', body: 'Curto' })).rejects.toBeInstanceOf(MockError)
  await expect(replyToDiscussion({ discussionId: 'missing', body: 'Uma resposta válida.' })).rejects.toBeInstanceOf(MockError)
  db.set((state) => ({ ...state, session: null }))
  const before = structuredClone(db.get())
  await expect(createDiscussion(valid)).rejects.toBeInstanceOf(MockError)
  await expect(replyToDiscussion({ discussionId: 'discussion', body: 'Uma resposta válida.' })).rejects.toBeInstanceOf(MockError)
  expect(db.get()).toEqual(before)
})
