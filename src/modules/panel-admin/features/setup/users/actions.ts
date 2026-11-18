import { db, makeUser, newId, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { isStaff } from '@/mocks/squads'

const FIRST_NAMES = ['Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João']
const LAST_NAMES = ['Alves', 'Costa', 'Moura', 'Nunes', 'Rocha', 'Teixeira']

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function fakeUser(): User {
  const first = pick(FIRST_NAMES)
  const id = newId()
  const now = new Date().toISOString()
  return makeUser({
    id,
    name: `${first} ${pick(LAST_NAMES)}`,
    email: `${first.toLowerCase()}.${id}@he4rt.dev`,
    username: `${first.toLowerCase()}-${id}`,
    birthDate: '1998-01-01',
    emailVerifiedAt: now,
    usageNoticeAcceptedAt: now,
    onboardedAt: now,
    areas: ['full-stack'],
    languages: ['JavaScript'],
    createdAt: now,
  })
}

export function createUsers(count: number) {
  return mockAction('panel-admin.users.store', { count }, () => {
    const users = Array.from({ length: count }, fakeUser)
    db.set((state) => ({ ...state, users: [...state.users, ...users] }))
    return { ids: users.map((user) => user.id) }
  })
}

/** Shared by the action and the UI, so the delete button only shows when the action accepts it. */
export function canDeleteUser(user: User): boolean {
  return !isStaff(user)
}

export function deleteUser(userId: string) {
  return mockAction('panel-admin.users.destroy', { userId }, () => {
    const user = db.get().users.find((u) => u.id === userId)
    if (!user) throw new MockError('Usuário não encontrado.')
    if (!canDeleteUser(user)) throw new MockError('Pessoas da staff não podem ser removidas.')
    db.set((state) => ({
      ...state,
      users: state.users.filter((u) => u.id !== userId),
      session: state.session?.userId === userId ? null : state.session,
    }))
  })
}
