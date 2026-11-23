import { track } from '@/mocks/analytics'
import type { RecordCollection } from '@/lib/trajectory/graph'
import { findAchievement, memberAchievements } from '@/mocks/achievements'
import { db, type Visibility } from '@/mocks/db'
import { assertProfileOwner, moderateProfileText, preserveProfileRevision, profileOf } from '@/mocks/member-profile'
import { MockError, mockAction } from '@/mocks/mock-action'

export const LEARNING_NOW_MAX = 80

/** What the member is learning now, answered in the bubble of their own profile. Empty clears it. */
export function updateLearningNow(userId: string, text: string) {
  return mockAction('panel-app.members.learning-now.update', { userId, text }, () => {
    assertProfileOwner(userId)
    const value = text.trim()
    if (value.length > LEARNING_NOW_MAX) {
      throw new MockError(`Use até ${LEARNING_NOW_MAX} caracteres.`)
    }
    moderateProfileText(value)
    const profile = profileOf(userId)
    if (profile.currentFocus === (value || null)) return { currentFocus: value || null }
    preserveProfileRevision(userId, 'presentation', userId, 'update', { readme: profile.readme, currentFocus: profile.currentFocus })
    db.set((state) => ({
      ...state,
      profiles: [...state.profiles.filter((p) => p.userId !== userId), { ...profile, currentFocus: value || null }],
    }))
    track('profile_focus_updated', { userId, filled: !!value })
    return { currentFocus: value || null }
  })
}


/** The member chooses who sees one trajectory record: only them, the community, or anyone. */
export function updateRecordVisibility(userId: string, collection: RecordCollection, recordId: string, visibility: Visibility) {
  return mockAction('panel-app.members.records.update', { userId, collection, recordId, visibility }, () => {
    assertProfileOwner(userId)
    if (!['knowledge', 'learnings', 'experiences', 'articles', 'evidences'].includes(collection) || !['private', 'community', 'public'].includes(visibility)) {
      throw new MockError('Escolha um registro e uma visibilidade válidos.')
    }
    const profile = db.get().profiles.find((p) => p.userId === userId)
    const previous = profile?.[collection].find((record) => record.id === recordId)
    if (!previous) throw new MockError('Este registro não existe mais.')
    if (previous.visibility === visibility) return { recordId, visibility }
    preserveProfileRevision(userId, collection, recordId, 'update', previous)
    db.set((state) => ({
      ...state,
      profiles: state.profiles.map((p) =>
        p.userId === userId
          ? { ...p, [collection]: p[collection].map((record) => (record.id === recordId ? { ...record, visibility } : record)) }
          : p,
      ),
    }))
    track('trajectory_record_updated', { userId, type: collection, recordId, visibility })
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

/** The member chooses whether an achievement the platform computed shows on the profile. */
export function updateAchievementVisibility(userId: string, key: string, shown: boolean) {
  return mockAction('panel-app.members.achievements.update', { userId, key, shown }, () => {
    if (db.get().session?.userId !== userId) throw new MockError('Só a dona ou o dono do perfil pode mudar isto.')
    const definition = findAchievement(key)
    const achievement = memberAchievements(db.get(), userId, Date.now()).find((a) => a.key === key)
    if (!definition || !achievement) throw new MockError('Esta conquista ainda não foi desbloqueada.')
    if (shown && definition.private && !achievement.originPublic) {
      throw new MockError('Publique primeiro o registro que deu esta conquista.')
    }
    db.set((state) => ({
      ...state,
      achievementChoices: [
        ...state.achievementChoices.filter((c) => !(c.userId === userId && c.key === key)),
        ...(shown ? [{ userId, key }] : []),
      ],
    }))
    return { key, shown }
  })
}
