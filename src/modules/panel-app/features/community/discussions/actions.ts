import { track } from '@/mocks/analytics'
import { canReadDiscussion } from '@/lib/discussions'
import { findBlockedTerm } from '@/lib/moderation'
import { db, newId, type Discussion, type DiscussionCategory, type DiscussionContext, type FeedPost } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export const TITLE_MIN_LENGTH = 10
export const BODY_MIN_LENGTH = 20
export const REPLY_MIN_LENGTH = 10

function sessionUserId(message: string): string {
  const userId = db.get().session?.userId
  if (!userId) throw new MockError(message)
  return userId
}

/**
 * Only the author links a discussion to a publication, and only to one others can read (in the
 * Feed or on the profile): nobody opens a debate on someone else's notes, and nothing private
 * reaches the forum.
 */
export function canLinkPost(userId: string | null, post: FeedPost): boolean {
  return post.userId === userId && post.deletedAt === null && (post.sharedOnFeed || post.shownOnProfile)
}

function contextExists(context: DiscussionContext): boolean {
  const state = db.get()
  if (context.type === 'squad') return state.squads.some((squad) => squad.id === context.id)
  if (context.type === 'project') return state.projects.some((project) => project.id === context.id)
  return true
}

export type CreateDiscussionInput = {
  title: string
  category: DiscussionCategory | null
  body: string
  context: DiscussionContext | null
}

/** Opens a discussion in the forum. Visitors read; opening one needs a session. */
export function createDiscussion(input: CreateDiscussionInput) {
  return mockAction('panel-app.discussions.store', input, () => {
    const authorId = sessionUserId('Entre na sua conta para abrir uma discussão.')
    const title = input.title.trim()
    const body = input.body.trim()
    if (title.length < TITLE_MIN_LENGTH) {
      throw new MockError(`O título precisa de pelo menos ${TITLE_MIN_LENGTH} caracteres.`, 'title')
    }
    if (!input.category) throw new MockError('Escolha uma categoria.', 'category')
    if (body.length < BODY_MIN_LENGTH) {
      throw new MockError(`Conte um pouco mais: pelo menos ${BODY_MIN_LENGTH} caracteres.`, 'body')
    }
    if (findBlockedTerm(title) || findBlockedTerm(body)) {
      throw new MockError('Barrado pela moderação automática: linguagem ofensiva.')
    }
    if (input.context && !contextExists(input.context)) {
      throw new MockError('Esse squad ou projeto não existe mais.', 'context')
    }
    const linkedPost = db.get().feedPosts.find((post) => post.id === input.context?.id)
    if (input.context?.type === 'post' && !(linkedPost && canLinkPost(authorId, linkedPost))) {
      throw new MockError('Só dá para ligar a discussão a uma publicação sua compartilhada no Feed ou no perfil.', 'context')
    }

    const discussion: Discussion = {
      id: newId(),
      title,
      category: input.category,
      authorId,
      body,
      createdAt: new Date().toISOString(),
      context: input.context,
      replies: [],
      solvedReplyId: null,
    }
    db.set((state) => ({ ...state, discussions: [discussion, ...state.discussions] }))
    track('discussion_created', {
      discussionId: discussion.id,
      category: discussion.category,
      contextType: discussion.context?.type ?? null,
    })
    return { id: discussion.id }
  })
}

/** Answers a discussion. No likes or votes: the author marks the reply that solved it. */
export function replyToDiscussion(input: { discussionId: string; body: string }) {
  return mockAction('panel-app.discussions.replies.store', input, () => {
    const authorId = sessionUserId('Entre na sua conta para responder.')
    const discussion = db.get().discussions.find((candidate) => candidate.id === input.discussionId)
    if (!discussion || !canReadDiscussion(db.get(), discussion, authorId)) {
      throw new MockError('Esta discussão não está disponível.')
    }
    const body = input.body.trim()
    if (body.length < REPLY_MIN_LENGTH) {
      throw new MockError(`Escreva pelo menos ${REPLY_MIN_LENGTH} caracteres.`, 'body')
    }
    if (findBlockedTerm(body)) {
      throw new MockError('Barrado pela moderação automática: linguagem ofensiva.', 'body')
    }

    const reply = { id: newId(), authorId, body, createdAt: new Date().toISOString() }
    db.set((state) => ({
      ...state,
      discussions: state.discussions.map((candidate) =>
        candidate.id === discussion.id ? { ...candidate, replies: [...candidate.replies, reply] } : candidate,
      ),
    }))
    track('discussion_replied', { discussionId: discussion.id, isAuthor: authorId === discussion.authorId })
    return { id: reply.id }
  })
}
