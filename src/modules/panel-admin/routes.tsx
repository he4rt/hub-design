import type { RouteObject } from 'react-router'
import Dashboard from './features/home/pages/dashboard'
import Users from './features/setup/users/pages/index'
import { AdminLayout } from './layouts/admin-layout'

/** Mounted at `/admin`. */
export const panelAdminRoutes: RouteObject = {
  path: 'admin',
  Component: AdminLayout,
  children: [
    { index: true, Component: Dashboard },
    { path: 'users', Component: Users },
  ],
}
