import { track } from '@/mocks/analytics'
import type { RecordCollection } from '@/lib/trajectory/graph'
import { findAchievement, memberAchievements } from '@/mocks/achievements'
import { db, updateUser, type Visibility } from '@/mocks/db'
import { assertProfileOwner, preserveProfileRevision, profileOf } from '@/mocks/member-profile'
import { MockError, mockAction } from '@/mocks/mock-action'

/** A 1584×396 JPEG fits well under this; anything bigger was not made by the cover picker. */
export const COVER_IMAGE_MAX_LENGTH = 400_000

/** The member sends a cover picture for the profile header, or removes it to go back to the ink band. */
export function updateProfileCover(userId: string, imageUrl: string | null) {
  return mockAction('panel-app.members.cover.update', { userId, imageUrl: imageUrl ? '(imagem)' : null }, () => {
    assertProfileOwner(userId)
    if (imageUrl !== null && (!imageUrl.startsWith('data:image/') || imageUrl.length > COVER_IMAGE_MAX_LENGTH)) {
      throw new MockError('Não foi possível usar esta imagem. Tente outra.')
    }
    const profile = profileOf(userId)
    preserveProfileRevision(userId, 'presentation', userId, 'update', { coverImageUrl: profile.coverImageUrl })
    db.set((state) => ({
      ...state,
      profiles: [...state.profiles.filter((p) => p.userId !== userId), { ...profile, coverImageUrl: imageUrl }],
    }))
    track('profile_cover_updated', { userId, removed: imageUrl === null })
    return { removed: imageUrl === null }
  })
}

/** A 400×400 JPEG fits well under this; anything bigger was not made by the photo picker. */
export const PHOTO_MAX_LENGTH = 200_000

/** The member changes their photo from the camera on their own profile; it is the account's photo. */
export function updateProfilePhoto(userId: string, photoUrl: string) {
  return mockAction('panel-app.members.photo.update', { userId, photoUrl: '(imagem)' }, () => {
    assertProfileOwner(userId)
    if (!photoUrl.startsWith('data:image/') || photoUrl.length > PHOTO_MAX_LENGTH) {
      throw new MockError('Não foi possível usar esta foto. Tente outra imagem.')
    }
    updateUser(userId, (user) => ({ ...user, photoUrl }))
    return { saved: true }
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
