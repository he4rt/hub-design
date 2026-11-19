import { normalizeText } from '@/lib/text'
import { track } from '@/mocks/analytics'
import { db, newId, type FeedCollection, type FeedPost, type ObjectiveProgress, type ReactionType, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export const POST_TEXT_MAX = 500
export const FEED_PAGE_SIZE = 10

export type PostInput = {
  learned: string
  applied: string
  objectiveProgress: ObjectiveProgress | null
  sharedOnFeed: boolean
  shownOnProfile: boolean
  /** Everyone sees the reaction counts; off means only the author sees them. */
  showReactionCounts: boolean
  collectionIds: string[]
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

/** Same validation and automatic moderation for a new publication and an edit. */
function checkPost(input: PostInput) {
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
}

/** Publishes in the learning diary. Every publication passes the automatic moderation. */
export function createPost(userId: string, input: PostInput) {
  return mockAction('panel-app.feed.posts.store', { userId, ...input }, () => {
    checkPost(input)

    const post: FeedPost = {
      id: newId(),
      userId,
      learned: input.learned.trim(),
      applied: input.applied.trim(),
      objectiveProgress: input.objectiveProgress!,
      learningId: null,
      sharedOnFeed: input.sharedOnFeed,
      shownOnProfile: input.shownOnProfile,
      collectionIds: ownCollectionIds(userId, input.collectionIds),
      reactions: [],
      showReactionCounts: input.showReactionCounts,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      editedAt: null,
      revisions: [],
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

/**
 * The author edits the text and where it shows. It passes the same moderation as a new
 * publication, and the previous text is kept for moderation: corrections preserve history.
 */
export function updatePost(userId: string, postId: string, input: PostInput) {
  return mockAction('panel-app.feed.posts.update', { userId, postId, ...input }, () => {
    const post = findOwnPost(userId, postId)
    checkPost(input)
    const editedAt = new Date().toISOString()
    const changedText =
      post.learned !== input.learned.trim() ||
      post.applied !== input.applied.trim() ||
      post.objectiveProgress !== input.objectiveProgress
    db.set((state) => ({
      ...state,
      feedPosts: state.feedPosts.map((p) =>
        p.id === postId
          ? {
              ...p,
              learned: input.learned.trim(),
              applied: input.applied.trim(),
              objectiveProgress: input.objectiveProgress!,
              sharedOnFeed: input.sharedOnFeed,
              shownOnProfile: input.shownOnProfile,
              showReactionCounts: input.showReactionCounts,
              collectionIds: ownCollectionIds(userId, input.collectionIds),
              // Changing only where it shows is not an edit of what was written.
              ...(changedText && {
                editedAt,
                revisions: [
                  ...p.revisions,
                  { learned: p.learned, applied: p.applied, objectiveProgress: p.objectiveProgress, replacedAt: editedAt },
                ],
              }),
            }
          : p,
      ),
    }))
    if (changedText) track('feed_post_edited', { postId })
    return { postId, editedAt: changedText ? editedAt : post.editedAt }
  })
}

/** Changes where a publication shows and who sees its reaction counts, from the card's menu. */
export function updatePostVisibility(
  userId: string,
  postId: string,
  visibility: Partial<Pick<FeedPost, 'sharedOnFeed' | 'shownOnProfile' | 'showReactionCounts'>>,
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
export function loadMorePosts(view: 'community' | 'saved', limit: number) {
  return mockAction('panel-app.feed.posts.index', { view, limit }, () => ({ limit }))
}

export const COLLECTION_NAME_MAX = 40

/** Keeps only collections that belong to the member: nobody files a post into someone else's. */
function ownCollectionIds(userId: string, ids: string[]): string[] {
  const own = new Set(db.get().feedCollections.filter((c) => c.userId === userId).map((c) => c.id))
  return [...new Set(ids)].filter((id) => own.has(id))
}

/** A reader marks or unmarks one learning reaction. Authors do not react to their own publications. */
export function toggleReaction(userId: string, postId: string, type: ReactionType) {
  return mockAction('panel-app.feed.posts.reactions.store', { userId, postId, type }, () => {
    const post = db.get().feedPosts.find((p) => p.id === postId)
    if (!post || post.deletedAt || !post.sharedOnFeed) throw new MockError('Esta publicação não existe mais.')
    if (post.userId === userId) throw new MockError('Você não reage às suas próprias publicações.')
    const had = post.reactions.some((r) => r.userId === userId && r.type === type)
    const reactions = had
      ? post.reactions.filter((r) => !(r.userId === userId && r.type === type))
      : [...post.reactions, { userId, type, createdAt: new Date().toISOString() }]
    db.set((state) => ({
      ...state,
      feedPosts: state.feedPosts.map((p) => (p.id === postId ? { ...p, reactions } : p)),
    }))
    track('feed_post_reacted', { postId, type, on: !had })
    return { on: !had }
  })
}

/** New study track ("trilha") for the member's own publications. */
export function createCollection(userId: string, name: string) {
  return mockAction('panel-app.feed.collections.store', { userId, name }, (): FeedCollection => {
    const trimmed = name.trim()
    if (!trimmed) throw new MockError('Dê um nome à trilha.', 'name')
    if (trimmed.length > COLLECTION_NAME_MAX) throw new MockError(`Use até ${COLLECTION_NAME_MAX} caracteres.`, 'name')
    const exists = db
      .get()
      .feedCollections.some((c) => c.userId === userId && normalizeText(c.name) === normalizeText(trimmed))
    if (exists) throw new MockError('Você já tem uma trilha com esse nome.', 'name')
    const collection = { id: newId(), userId, name: trimmed, createdAt: new Date().toISOString() }
    db.set((state) => ({ ...state, feedCollections: [...state.feedCollections, collection] }))
    track('feed_collection_created', { collectionId: collection.id })
    return collection
  })
}

/** Which of the member's collections a publication is in. */
export function updatePostCollections(userId: string, postId: string, collectionIds: string[]) {
  return mockAction('panel-app.feed.posts.collections.update', { userId, postId, collectionIds }, () => {
    findOwnPost(userId, postId)
    const ids = ownCollectionIds(userId, collectionIds)
    db.set((state) => ({
      ...state,
      feedPosts: state.feedPosts.map((p) => (p.id === postId ? { ...p, collectionIds: ids } : p)),
    }))
    track('feed_post_collected', { postId, count: ids.length })
    return { collectionIds: ids }
  })
}

/** Members save what others shared in the Feed; their own publications are already in "Minhas publicações". */
export function canSavePost(post: FeedPost, userId: string): boolean {
  return post.deletedAt === null && post.sharedOnFeed && post.userId !== userId
}

/** Saves a publication to read again later. Only the member sees what they saved. */
export function savePost(userId: string, postId: string) {
  return mockAction('panel-app.feed.posts.bookmarks.store', { userId, postId }, () => {
    const post = db.get().feedPosts.find((p) => p.id === postId)
    if (!post || !canSavePost(post, userId)) throw new MockError('Esta publicação não existe mais.')
    if (db.get().feedBookmarks.some((b) => b.userId === userId && b.postId === postId)) return { saved: true }
    const bookmark = { userId, postId, createdAt: new Date().toISOString() }
    db.set((state) => ({ ...state, feedBookmarks: [...state.feedBookmarks, bookmark] }))
    track('feed_post_saved', { postId, saved: true })
    return { saved: true }
  })
}

export function unsavePost(userId: string, postId: string) {
  return mockAction('panel-app.feed.posts.bookmarks.destroy', { userId, postId }, () => {
    db.set((state) => ({
      ...state,
      feedBookmarks: state.feedBookmarks.filter((b) => !(b.userId === userId && b.postId === postId)),
    }))
    track('feed_post_saved', { postId, saved: false })
    return { saved: false }
  })
}

/** Only the staff pins the community's official announcements. */
export function canPinAnnouncement(user: User): boolean {
  return user.role !== 'member'
}

/** Pins an announcement at the top of the Feed, or unpins it. */
export function setAnnouncementPinned(userId: string, announcementId: string, pinned: boolean) {
  return mockAction('panel-app.feed.announcements.update', { userId, announcementId, pinned }, () => {
    const user = db.get().users.find((u) => u.id === userId)
    if (!user || !canPinAnnouncement(user)) throw new MockError('Só a administração fixa comunicados.')
    if (!db.get().feedAnnouncements.some((a) => a.id === announcementId)) {
      throw new MockError('Este comunicado não existe mais.')
    }
    const pinnedAt = pinned ? new Date().toISOString() : null
    db.set((state) => ({
      ...state,
      feedAnnouncements: state.feedAnnouncements.map((a) => (a.id === announcementId ? { ...a, pinnedAt } : a)),
    }))
    track('feed_announcement_pinned', { announcementId, pinned })
    return { pinnedAt }
  })
}
