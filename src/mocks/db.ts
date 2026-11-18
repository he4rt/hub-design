import { createStore, useStore } from '@/lib/store'

export type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  createdAt: string
}

export type MockDb = {
  users: User[]
  /** Signed-in user of /app. */
  session: { userId: string } | null
}

export const DEMO_PASSWORD = 'password'

const seed: MockDb = {
  users: [
    { id: 'u1', name: 'Daniel Reis', email: 'daniel@he4rt.dev', role: 'admin', createdAt: '2025-01-10' },
    { id: 'u2', name: 'Ana Souza', email: 'ana@he4rt.dev', role: 'member', createdAt: '2025-03-22' },
    { id: 'u3', name: 'Bruno Lima', email: 'bruno@he4rt.dev', role: 'member', createdAt: '2025-06-05' },
  ],
  session: null,
}

/** The fake backend. Persisted in localStorage; reset it from the debug sidebar. */
export const db = createStore(seed, { persist: 'he4rt:mock-db' })

export function useDb<S>(selector: (db: MockDb) => S): S {
  return useStore(db, selector)
}

export function newId(): string {
  return crypto.randomUUID().slice(0, 8)
}
