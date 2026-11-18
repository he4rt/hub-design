import { useDb } from '@/mocks/db'
import { isStaff } from '@/mocks/squads'

/** The signed-in /admin user, or null. Loses access as soon as the role is no longer staff. */
export function useAdmin() {
  return useDb(
    (db) => db.users.find((user) => user.id === db.adminSession?.userId && isStaff(user)) ?? null,
  )
}
