import { db, DEMO_PASSWORD } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

export function login(input: { email: string; password: string }) {
  return mockAction('panel-app.session.store', { email: input.email }, () => {
    const user = db.get().users.find((u) => u.email === input.email)
    if (!user || input.password !== DEMO_PASSWORD) throw new MockError('E-mail ou senha inválidos.')
    db.set((state) => ({ ...state, session: { userId: user.id } }))
    return { userId: user.id }
  })
}

export function logout() {
  return mockAction('panel-app.session.destroy', null, () => {
    db.set((state) => ({ ...state, session: null }))
  })
}
