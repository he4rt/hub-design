import { db } from '@/mocks/db'
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
