import { useDb } from '@/mocks/db'
import { LandingLayout } from '@/modules/landing/layouts/landing-layout'
import { AppLayout } from '@/modules/panel-app/layouts/app-layout'

/**
 * Layout of the public profile, chosen by who reads it: a signed-in member reads it inside the Hub,
 * with its navigation; a visitor, on the public site. It composes two modules, so it lives beside
 * the router.
 */
export function ProfileLayout() {
  const signedIn = useDb((db) => db.session !== null)
  return signedIn ? <AppLayout fullWidth /> : <LandingLayout />
}
