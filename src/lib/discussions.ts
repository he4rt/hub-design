import type { Discussion, MockDb } from '@/mocks/db'

/** Personal-project conversations inherit the publication's member access, never its public-profile opt-in. */
export function canReadDiscussion(state: MockDb, discussion: Discussion, userId: string | null): boolean {
  if (discussion.context?.type !== 'post') return true
  const post = state.feedPosts.find((post) => post.id === discussion.context?.id)
  if (!post?.projectId) return true
  return userId !== null && (post.userId === userId || (!post.deletedAt && post.sharedOnFeed))
}
