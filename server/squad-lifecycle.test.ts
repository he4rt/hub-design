import './runtime'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { db, seedState } from '@/mocks/db'
import { inviteAccepted, entryTestOpened, entryTestClosed, boardItemSynced, boardItemMoved, sweep } from '@/mocks/github'
import { acceptApplication } from '@/modules/panel-app/features/squads/squads/applications/actions'
import { acceptDelivery, returnDelivery } from '@/modules/panel-app/features/squads/squads/deliveries/actions'
import { endProject, updateProjectSettings } from '@/modules/panel-app/features/squads/squads/projects/actions'
import { freeSeats } from '@/mocks/squads'

beforeEach(() => {
  const state = structuredClone(seedState)
  state.applications = []
  state.memberships = state.memberships.filter((m) => m.projectId !== 'p1' || m.userId === 'u6')
  const project = state.projects.find((p) => p.id === 'p1')!
  project.seats = 2
  for (const userId of ['u2', 'u3']) {
    state.applications.push({ id: `app-${userId}`, userId, projectId: 'p1', status: 'pending', answers: [], notes: null, decision: null, githubInvite: 'not-needed', createdAt: new Date().toISOString() })
  }
  db.set(() => state)
})
afterEach(() => db.reset())

test('accepting reserves the last seat until the invite is confirmed exactly once', async () => {
  await acceptApplication('u6', 'app-u2')
  expect(freeSeats(db.get(), db.get().projects.find((p) => p.id === 'p1')!)).toBe(0)
  await expect(acceptApplication('u6', 'app-u3')).rejects.toThrow('lugares')
  await expect(updateProjectSettings('u6', 'p1', { seats: 1, questions: db.get().projects[0].applicationQuestions })).rejects.toThrow('lugares')
  await inviteAccepted('app-u2')
  await inviteAccepted('app-u2')
  expect(db.get().memberships.filter((m) => m.projectId === 'p1' && m.userId === 'u2' && !m.leftAt)).toHaveLength(1)
  expect(db.get().events.filter((e) => e.event === 'squad_joined' && e.props.userId === 'u2')).toHaveLength(1)
})

test('a late invitation cannot reactivate an ended project', async () => {
  await acceptApplication('u6', 'app-u2')
  await endProject('u6', 'p1')
  await expect(inviteAccepted('app-u2')).rejects.toThrow()
  expect(db.get().memberships.some((m) => m.projectId === 'p1' && m.userId === 'u2' && !m.leftAt)).toBe(false)
})

test('closing a different PR or a non-staff merge cannot approve an entry test', async () => {
  db.set((s) => ({ ...s, entryTests: [] }))
  const pr = { repository: 'he4rt-stuff/primeiro-commit', number: 70, title: 'Minha contribuição', url: 'https://github.com/he4rt-stuff/primeiro-commit/pull/70' }
  await entryTestOpened('u2', pr)
  await expect(entryTestClosed('u2', true, 'u3', undefined, pr)).rejects.toThrow('staff')
  await expect(entryTestClosed('u2', true, 'u8', undefined, { ...pr, number: 71 })).rejects.toThrow('PR')
  expect(db.get().entryTests[0].status).toBe('open')
  await entryTestClosed('u2', true, 'u8', undefined, pr)
  expect(db.get().entryTests[0].status).toBe('approved')
})

test('sweeps and replay do not resubmit returned work, and accepting keeps the earlier return', async () => {
  const criterionId = db.get().projects.find((p) => p.id === 'p1')!.acceptanceCriteria[0].id
  const { itemId, delivery } = await boardItemSynced('p1', {
    issue: { number: 999, title: 'Documentar a configuração', url: 'https://github.com/he4rt-stuff/agenda-real/issues/999' },
    kind: 'non-technical', status: 'done', assigneeIds: ['u2'], criterionId,
  })
  const reason = 'Falta explicar como recuperar o serviço depois de uma falha.'
  await returnDelivery('u6', delivery!, reason)
  await sweep()
  await boardItemMoved(itemId, 'done')
  expect(db.get().deliveries.find((d) => d.id === delivery)!.status).toBe('returned')
  await boardItemMoved(itemId, 'in-progress')
  await boardItemMoved(itemId, 'done')
  await acceptDelivery('u6', delivery!, { credits: [{ userId: 'u2', part: 'Escreveu e executou o roteiro de recuperação.' }], collaboration: 'individual', context: 'O roteiro foi executado em ambiente descartável e atende ao critério.' })
  expect(db.get().deliveries.find((d) => d.id === delivery)!.decisions).toMatchObject([
    { decision: 'returned', actorId: 'u6', reason },
    { decision: 'accepted', actorId: 'u6' },
  ])
})
