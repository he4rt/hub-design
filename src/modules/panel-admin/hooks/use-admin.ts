import { useDb } from '@/mocks/db'

/** The signed-in /admin user, or null. Loses access as soon as the role is no longer admin. */
export function useAdmin() {
  return useDb(
    (db) => db.users.find((user) => user.id === db.adminSession?.userId && user.role === 'admin') ?? null,
  )
}
