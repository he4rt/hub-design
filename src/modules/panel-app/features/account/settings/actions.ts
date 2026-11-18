import { db } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export function updateProfile(userId: string, input: { name: string; email: string }) {
  return mockAction('panel-app.settings.profile.update', input, () => {
    const name = input.name.trim()
    if (name.length < 2) throw new MockError('O nome precisa ter ao menos 2 caracteres.')
    if (db.get().users.some((u) => u.email === input.email && u.id !== userId)) {
      throw new MockError('Este e-mail já está em uso.')
    }
    db.set((state) => ({
      ...state,
      users: state.users.map((u) => (u.id === userId ? { ...u, name, email: input.email } : u)),
    }))
    return { userId }
  })
}
