import { db, newId, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

const FIRST_NAMES = ['Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João']
const LAST_NAMES = ['Alves', 'Costa', 'Moura', 'Nunes', 'Rocha', 'Teixeira']

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function fakeUser(): User {
  const first = pick(FIRST_NAMES)
  const id = newId()
  return {
    id,
    name: `${first} ${pick(LAST_NAMES)}`,
    email: `${first.toLowerCase()}.${id}@he4rt.dev`,
    role: 'member',
    createdAt: new Date().toISOString().slice(0, 10),
  }
}

export function createUsers(count: number) {
  return mockAction('panel-admin.users.create', { count }, () => {
    const users = Array.from({ length: count }, fakeUser)
    db.set((state) => ({ ...state, users: [...state.users, ...users] }))
    return { ids: users.map((user) => user.id) }
  })
}

export function deleteUser(userId: string) {
  return mockAction('panel-admin.users.delete', { userId }, () => {
    const user = db.get().users.find((u) => u.id === userId)
    if (!user) throw new MockError('Usuário não encontrado.')
    if (user.role === 'admin') throw new MockError('Administradores não podem ser removidos.')
    db.set((state) => ({
      ...state,
      users: state.users.filter((u) => u.id !== userId),
      session: state.session?.userId === userId ? null : state.session,
    }))
  })
}
