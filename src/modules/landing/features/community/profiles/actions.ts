import { track } from '@/mocks/analytics'
import { db, type MemberProfile, type Visibility } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export const LEARNING_NOW_MAX = 80

/** What the member is learning now, answered in the bubble of their own profile. Empty clears it. */
export function updateLearningNow(userId: string, text: string) {
  return mockAction('panel-app.members.learning-now.update', { userId, text }, () => {
    if (db.get().session?.userId !== userId) throw new MockError('Só a dona ou o dono do perfil pode trocar isto.')
    const value = text.trim()
    if (value.length > LEARNING_NOW_MAX) {
      throw new MockError(`Use até ${LEARNING_NOW_MAX} caracteres.`)
    }
    db.set((state) => ({
      ...state,
      profiles: state.profiles.map((p) => (p.userId === userId ? { ...p, currentFocus: value || null } : p)),
    }))
    return { currentFocus: value || null }
  })
}

export type RecordCollection = keyof Pick<MemberProfile, 'knowledge' | 'learnings' | 'experiences' | 'articles' | 'evidences'>

/** The member chooses who sees one trajectory record: only them, the community, or anyone. */
export function updateRecordVisibility(userId: string, collection: RecordCollection, recordId: string, visibility: Visibility) {
  return mockAction('panel-app.members.records.update', { userId, collection, recordId, visibility }, () => {
    if (db.get().session?.userId !== userId) throw new MockError('Só a dona ou o dono do perfil pode mudar isto.')
    const profile = db.get().profiles.find((p) => p.userId === userId)
    if (!profile?.[collection].some((record) => record.id === recordId)) throw new MockError('Este registro não existe mais.')
    db.set((state) => ({
      ...state,
      profiles: state.profiles.map((p) =>
        p.userId === userId
          ? { ...p, [collection]: p[collection].map((record) => (record.id === recordId ? { ...record, visibility } : record)) }
          : p,
      ),
    }))
    return { recordId, visibility }
  })
}

/**
 * Takes a publication out of the member's saved ones. Saved publications live on the owner's
 * profile; only the member who saved one removes it.
 */
export function unsavePost(userId: string, postId: string) {
  return mockAction('panel-app.feed.posts.bookmarks.destroy', { userId, postId }, () => {
    if (db.get().session?.userId !== userId) throw new MockError('Só quem salvou pode tirar dos salvos.')
    db.set((state) => ({
      ...state,
      feedBookmarks: state.feedBookmarks.filter((b) => !(b.userId === userId && b.postId === postId)),
    }))
    track('feed_post_saved', { postId, saved: false })
    return { saved: false }
  })
}
