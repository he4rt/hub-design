import { normalizeText } from '@/lib/text'
import { track } from '@/mocks/analytics'
import { db, newId, type FeedPost, type ObjectiveProgress } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export const POST_TEXT_MAX = 500
export const FEED_PAGE_SIZE = 10

export type PostInput = {
  learned: string
  applied: string
  objectiveProgress: ObjectiveProgress | null
  sharedOnFeed: boolean
  shownOnProfile: boolean
}

export type PostField = 'learned' | 'applied' | 'objectiveProgress'

/** Same rules in the form (so nothing is sent) and in the action (the source of truth). */
export function validatePost(input: PostInput): Partial<Record<PostField, string>> {
  const errors: Partial<Record<PostField, string>> = {}
  const text = { learned: 'o que você aprendeu', applied: 'como você aplicou' } as const
  for (const field of ['learned', 'applied'] as const) {
    const value = input[field].trim()
    if (!value) errors[field] = `Conte ${text[field]}.`
    else if (value.length > POST_TEXT_MAX) errors[field] = `Use até ${POST_TEXT_MAX} caracteres.`
  }
  if (!input.objectiveProgress) errors.objectiveProgress = 'Escolha quanto isso aproximou você do objetivo.'
  return errors
}

/**
 * Stand-in for the automatic moderation service: a short list of offensive
 * terms. Returns the first term found, or null.
 */
const BLOCKED_TERMS = ['idiota', 'imbecil', 'otario', 'retardado', 'lixo humano']

function findBlockedTerm(text: string): string | null {
  const normalized = normalizeText(text)
  return BLOCKED_TERMS.find((term) => new RegExp(`\\b${term}\\b`).test(normalized)) ?? null
}

/** The author is the only one who changes or deletes a publication. */
export function canManagePost(post: FeedPost, userId: string): boolean {
  return post.userId === userId && post.deletedAt === null
}

/** Publishes in the learning diary. Every publication passes the automatic moderation. */
export function createPost(userId: string, input: PostInput) {
  return mockAction('panel-app.feed.posts.store', { userId, ...input }, () => {
    const errors = validatePost(input)
    const [field] = Object.keys(errors) as PostField[]
    if (field) throw new MockError(errors[field]!, field)

    for (const field of ['learned', 'applied'] as const) {
      const term = findBlockedTerm(input[field])
      if (term) {
        track('feed_post_blocked', { field })
        throw new MockError(
          `Barrado pela moderação automática: linguagem ofensiva ("${term}").`,
          field,
        )
      }
    }

    const post: FeedPost = {
      id: newId(),
      userId,
      learned: input.learned.trim(),
      applied: input.applied.trim(),
      objectiveProgress: input.objectiveProgress!,
      sharedOnFeed: input.sharedOnFeed,
      shownOnProfile: input.shownOnProfile,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    }
    db.set((state) => ({ ...state, feedPosts: [...state.feedPosts, post] }))
    const props = { postId: post.id, sharedOnFeed: post.sharedOnFeed, shownOnProfile: post.shownOnProfile }
    track('feed_post_created', props)
    track('trajectory_record_added', { type: 'feed_post', recordId: post.id })
    return post
  })
}

function findOwnPost(userId: string, postId: string): FeedPost {
  const post = db.get().feedPosts.find((p) => p.id === postId)
  if (!post || post.deletedAt) throw new MockError('Esta publicação não existe mais.')
  if (!canManagePost(post, userId)) throw new MockError('Só quem publicou pode mudar esta publicação.')
  return post
}

/** Changes where a publication shows. The text itself is never edited. */
export function updatePostVisibility(
  userId: string,
  postId: string,
  visibility: Partial<Pick<FeedPost, 'sharedOnFeed' | 'shownOnProfile'>>,
) {
  return mockAction('panel-app.feed.posts.update', { userId, postId, ...visibility }, () => {
    findOwnPost(userId, postId)
    db.set((state) => ({
      ...state,
      feedPosts: state.feedPosts.map((p) => (p.id === postId ? { ...p, ...visibility } : p)),
    }))
    track('feed_post_visibility_changed', { postId, ...visibility })
    return visibility
  })
}

/** Gone for every member at once; kept for moderation and audit. */
export function deletePost(userId: string, postId: string) {
  return mockAction('panel-app.feed.posts.destroy', { userId, postId }, () => {
    findOwnPost(userId, postId)
    const deletedAt = new Date().toISOString()
    db.set((state) => ({
      ...state,
      feedPosts: state.feedPosts.map((p) => (p.id === postId ? { ...p, deletedAt } : p)),
    }))
    track('feed_post_deleted', { postId })
    return { deletedAt }
  })
}

/** "Carregar mais": the next page of the Feed, which the page then shows from the store. */
export function loadMorePosts(view: 'community' | 'mine', limit: number) {
  return mockAction('panel-app.feed.posts.index', { view, limit }, () => ({ limit }))
}
