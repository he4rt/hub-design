import type { RouteObject } from 'react-router'
import { AuthLayout } from '@/components/auth-layout'
import Login from './features/auth/pages/login'
import Dashboard from './features/home/pages/dashboard'
import Users from './features/setup/users/pages/index'
import { AdminLayout } from './layouts/admin-layout'

/** Mounted at `/admin`. */
export const panelAdminRoutes: RouteObject = {
  path: 'admin',
  children: [
    {
      element: <AuthLayout badge="Admin" />,
      children: [{ path: 'login', Component: Login }],
    },
    {
      Component: AdminLayout,
      children: [
        { index: true, Component: Dashboard },
        { path: 'users', Component: Users },
      ],
    },
  ],
}
