import { db } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export function canWithdraw(status: string): boolean {
  return status === 'pending'
}

/** The member gives up a pending application. */
export function withdrawApplication(userId: string, applicationId: string) {
  return mockAction('panel-app.squads.applications.destroy', { applicationId }, () => {
    const app = db.get().applications.find((a) => a.id === applicationId)
    if (!app || app.userId !== userId) throw new MockError('Candidatura não encontrada.')
    if (!canWithdraw(app.status)) throw new MockError('Só dá para desistir de uma candidatura aguardando o capitão.')
    db.set((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === applicationId ? { ...a, status: 'withdrawn' as const } : a)),
    }))
  })
}
