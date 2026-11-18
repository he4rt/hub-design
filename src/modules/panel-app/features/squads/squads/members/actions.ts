import { db } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { appendLog, canManageSquad, moderate } from '@/mocks/squads'

export function updateResponsibilities(actorId: string, membershipId: string, responsibilities: string) {
  return mockAction('panel-app.squads.members.update', { membershipId, responsibilities }, () => {
    const state = db.get()
    const m = state.memberships.find((x) => x.id === membershipId && x.leftAt === null)
    if (!m) throw new MockError('Participação não encontrada.')
    if (!canManageSquad(state, m.squadId, actorId)) throw new MockError('Só o capitão edita as responsabilidades.')
    const text = responsibilities.trim()
    moderate(text)
    db.set((s) => ({
      ...s,
      memberships: s.memberships.map((x) => (x.id === membershipId ? { ...x, responsibilities: text } : x)),
    }))
  })
}

export function canLeave(captainId: string | null, userId: string): boolean {
  return captainId !== userId
}

/** The member leaves on their own; what they did stays in the log and in their history. */
export function leaveSquad(userId: string, squadId: string) {
  return mockAction('panel-app.squads.members.destroy', { squadId }, () => {
    const state = db.get()
    const squad = state.squadTeams.find((s) => s.id === squadId)
    const active = state.memberships.filter((m) => m.squadId === squadId && m.userId === userId && m.leftAt === null)
    if (!squad || active.length === 0) throw new MockError('Você não está neste squad.')
    if (!canLeave(squad.captainId, userId)) throw new MockError('O capitão sai só depois que a staff aloca outro capitão.')
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      memberships: s.memberships.map((m) => (active.includes(m) ? { ...m, leftAt: now, leftReason: 'Saiu por conta própria' } : m)),
    }))
    appendLog({ squadId, projectId: active[0].projectId, kind: 'member-left', actorId: userId, subjectId: userId })
  })
}
