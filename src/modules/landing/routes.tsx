import type { RouteObject } from 'react-router'
import Profile from './features/community/profiles/pages/show'
import Welcome from './features/home/pages/welcome'
import SquadProject from './features/squads/squads/projects/pages/show'
import Squads from './features/squads/squads/pages/index'
import Squad from './features/squads/squads/pages/show'
import { LandingLayout } from './layouts/landing-layout'

/**
 * The public profile, mounted by the router in the layout of whoever reads it: the app's for a
 * signed-in member, the landing's for a visitor. Same URL for both.
 */
export const profileRoute: RouteObject = { path: 'members/:username', Component: Profile }

/** Mounted at `/`. */
export const landingRoutes: RouteObject = {
  Component: LandingLayout,
  children: [
    { index: true, Component: Welcome },
    { path: 'squads', Component: Squads },
    { path: 'squads/:squad', Component: Squad },
    { path: 'squads/:squad/projects/:project', Component: SquadProject },
  ],
}
