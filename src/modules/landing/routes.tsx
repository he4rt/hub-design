import type { RouteObject } from 'react-router'
import Welcome from './features/home/pages/welcome'
import { LandingLayout } from './layouts/landing-layout'

/** Mounted at `/`. */
export const landingRoutes: RouteObject = {
  Component: LandingLayout,
  children: [{ index: true, Component: Welcome }],
}
