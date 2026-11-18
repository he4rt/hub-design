import type { RouteObject } from 'react-router'
import Profile from './features/account/settings/pages/profile'
import Login from './features/auth/pages/login'
import Dashboard from './features/home/pages/dashboard'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'

/** Mounted at `/app`. */
export const panelAppRoutes: RouteObject = {
  path: 'app',
  children: [
    {
      Component: AuthLayout,
      children: [{ path: 'login', Component: Login }],
    },
    {
      Component: AppLayout,
      children: [
        { index: true, Component: Dashboard },
        { path: 'settings/profile', Component: Profile },
      ],
    },
  ],
}
