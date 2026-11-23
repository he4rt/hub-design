import { track } from '@/mocks/analytics'
import { db, type Removal } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { isStaff, requireText } from '@/mocks/squads'

function staff(actorId: string) {
  if (!isStaff(db.get().users.find((u) => u.id === actorId))) throw new MockError('Só a staff faz isso.')
}

/** The author reads the reason, so it is required, long enough to explain and moderated like any text. */
function removal(actorId: string, reason: string): Removal {
  const text = requireText(reason, 20, 'Explique o motivo em pelo menos 20 caracteres. O autor vai ler.', 'reason')
  return { reason: text, removedBy: actorId, removedAt: new Date().toISOString() }
}

/** The staff takes a publication down: gone for every member; the author sees it removed, with the reason. */
export function removePost(actorId: string, postId: string, reason: string) {
  return mockAction('panel-admin.posts.destroy', { actorId, postId, reason }, () => {
    staff(actorId)
    const post = db.get().feedPosts.find((p) => p.id === postId)
    if (!post || post.deletedAt) throw new MockError('Esta publicação já saiu do Feed.')
    const removed = removal(actorId, reason)
    db.set((s) => ({
      ...s,
      feedPosts: s.feedPosts.map((p) => (p.id === postId ? { ...p, deletedAt: removed.removedAt, removal: removed } : p)),
    }))
    track('feed_post_removed', { postId })
    return removed
  })
}

/** Same for a comment: it leaves the conversation; its author sees it removed, with the reason. */
export function removeComment(actorId: string, commentId: string, reason: string) {
  return mockAction('panel-admin.posts.comments.destroy', { actorId, commentId, reason }, () => {
    staff(actorId)
    const comment = db.get().feedComments.find((c) => c.id === commentId)
    if (!comment || comment.deletedAt) throw new MockError('Este comentário já saiu do Feed.')
    const removed = removal(actorId, reason)
    db.set((s) => ({
      ...s,
      feedComments: s.feedComments.map((c) => (c.id === commentId ? { ...c, deletedAt: removed.removedAt, removal: removed } : c)),
    }))
    track('feed_comment_removed', { commentId })
    return removed
  })
}
