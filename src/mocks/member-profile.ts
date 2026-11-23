import { normalizeText } from '@/lib/text'
import { db, newId, type MemberProfile, type ProfileRevision } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'

export function assertProfileOwner(userId: string) {
  if (db.get().session?.userId !== userId || !db.get().users.some((user) => user.id === userId)) {
    throw new MockError('Só a dona ou o dono do perfil pode mudar isto.')
  }
}

/** Same local moderation vocabulary as the diary; not an external moderation service. */
export function moderateProfileText(value: string) {
  const normalized = normalizeText(value)
  if (['idiota', 'imbecil', 'otario', 'retardado', 'lixo humano'].some((term) => new RegExp(`\\b${term}\\b`).test(normalized))) {
    throw new MockError('Barrado pela moderação automática: revise a linguagem ofensiva antes de salvar.')
  }
}

export function profileOf(userId: string): MemberProfile {
  return db.get().profiles.find((profile) => profile.userId === userId) ?? {
    userId, readme: null, currentFocus: null, coverImageUrl: null, knowledge: [], learnings: [], experiences: [], articles: [], evidences: [],
  }
}

/** Prior content remains private even when the current record is public or deleted. */
export function preserveProfileRevision(userId: string, collection: ProfileRevision['collection'], recordId: string, operation: ProfileRevision['operation'], snapshot: Record<string, unknown>) {
  const revision: ProfileRevision = { id: newId(), userId, actorId: userId, collection, recordId, operation, snapshot: structuredClone(snapshot), at: new Date().toISOString() }
  db.set((state) => ({ ...state, profileRevisions: [...state.profileRevisions, revision] }))
}
