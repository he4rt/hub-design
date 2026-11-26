import { useDb } from '@/mocks/db'
import { AppLayout } from './app-layout'
import { PublicLayout } from './public-layout'

/**
 * Layout of the Forum, chosen by who reads it, like the public profile: a signed-in member reads it
 * inside the Hub, with its sidebar; a visitor reads it with the public top bar and signs in to take part.
 * The Forum pages keep their own width and padding.
 */
export function ForumLayout() {
  const signedIn = useDb((db) => db.session !== null)
  return signedIn ? <AppLayout fullWidth /> : <PublicLayout />
}
