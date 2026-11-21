import type { User } from '@/mocks/db'
import { first, insert, now, sql, update } from './database/connection'

/*
 * Sessions, like Laravel's session guards. The member area (/app) and the administration (/admin)
 * are separate guards with separate cookies: signing in to one never signs in to the other.
 * Sessions live in the `sessions` table; the cookie only carries the random session id. Who signs
 * in is decided by the actions (src/modules/.../auth/actions.ts), which run on the API.
 */

export type Guard = 'web' | 'admin'

export type SessionRow = { id: string; guard: Guard; user_id: string | null; last_activity_at: string }

const COOKIES: Record<Guard, string> = { web: 'hub_session', admin: 'hub_admin_session' }
const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000

export function sessionCookie(guard: Guard, id: string | null): string {
  const value = id ? `${COOKIES[guard]}=${id}; Max-Age=${SESSION_IDLE_MS / 1000}` : `${COOKIES[guard]}=; Max-Age=0`
  return `${value}; Path=/; HttpOnly; SameSite=Lax`
}

/** The guard's session of this request, touched on every read; an idle one expires. */
export function currentSession(request: Request, guard: Guard): SessionRow | undefined {
  const id = new Bun.CookieMap(request.headers.get('cookie') ?? '').get(COOKIES[guard])
  if (!id) return undefined
  const session = first<SessionRow>('SELECT * FROM sessions WHERE id = $id AND guard = $guard', { id, guard })
  if (!session) return undefined
  if (Date.now() - Date.parse(session.last_activity_at) > SESSION_IDLE_MS) {
    deleteSession(id)
    return undefined
  }
  update('sessions', { id }, { last_activity_at: now() })
  return session
}

/** A new random session id; a guest session (no user) holds a social login waiting for the sign-up. */
export function createSession(request: Request, guard: Guard, userId: string | null): string {
  const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  insert('sessions', {
    id,
    guard,
    user_id: userId,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: request.headers.get('user-agent'),
    created_at: now(),
    last_activity_at: now(),
  })
  return id
}

export function deleteSession(id: string) {
  sql.query('DELETE FROM sessions WHERE id = $id').run({ id })
}

export function isStaff(user: User | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'super-admin'
}
