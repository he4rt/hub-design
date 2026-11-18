import { db } from '@/mocks/db'
import { sweep } from '@/mocks/github'
import { MockError, mockAction } from '@/mocks/mock-action'
import { isStaff } from '@/mocks/squads'

/** "Sincronizar agora": runs the periodic sweep and clears the divergences it reconciled. */
export function syncGithub(actorId: string) {
  return mockAction('panel-admin.system.github.sync.store', null, async () => {
    if (!isStaff(db.get().users.find((u) => u.id === actorId))) throw new MockError('Só a staff sincroniza.')
    const { created } = await sweep()
    db.set((s) => ({ ...s, githubSync: { ...s.githubSync, divergences: [] } }))
    return { created }
  })
}
