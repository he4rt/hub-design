import { db } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { isStaff } from '@/mocks/squads'

/** Admin entry, separate from the member login: its own session, and only the staff gets in. */
export function login(input: { email: string; password: string }) {
  return mockAction('panel-admin.session.store', { email: input.email }, () => {
    const email = input.email.trim().toLowerCase()
    const user = db.get().users.find((u) => u.email.toLowerCase() === email)
    if (!user || db.get().passwords[user.id] !== input.password) throw new MockError('E-mail ou senha inválidos.')
    if (!isStaff(user)) throw new MockError('Esta entrada é só da administração. Membros entram pelo Hub.')
    db.set((state) => ({ ...state, adminSession: { userId: user.id } }))
    return { userId: user.id }
  })
}

export function logout() {
  return mockAction('panel-admin.session.destroy', null, () => {
    db.set((state) => ({ ...state, adminSession: null }))
  })
}
