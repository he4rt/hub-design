import { useDb } from '@/mocks/db'

/** The signed-in /app user, or null. */
export function useAccount() {
  return useDb((db) => db.users.find((user) => user.id === db.session?.userId) ?? null)
}
