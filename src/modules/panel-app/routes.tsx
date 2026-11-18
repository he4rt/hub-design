import type { RouteObject } from 'react-router'
import { AuthLayout } from '@/components/auth-layout'
import Profile from './features/account/settings/pages/profile'
import ForgotPassword from './features/auth/pages/forgot-password'
import Login from './features/auth/pages/login'
import Onboarding from './features/auth/pages/onboarding'
import Register from './features/auth/pages/register'
import ResetPassword from './features/auth/pages/reset-password'
import UsageData from './features/auth/pages/usage-data'
import Dashboard from './features/home/pages/dashboard'
import { AppLayout } from './layouts/app-layout'

/** Mounted at `/app`. */
export const panelAppRoutes: RouteObject = {
  path: 'app',
  children: [
    {
      Component: AuthLayout,
      children: [
        { path: 'login', Component: Login },
        { path: 'register', Component: Register },
        { path: 'forgot-password', Component: ForgotPassword },
        { path: 'reset-password/:token', Component: ResetPassword },
      ],
    },
    {
      element: <AuthLayout wide />,
      children: [
        { path: 'onboarding', Component: Onboarding },
        { path: 'usage-data', Component: UsageData },
      ],
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
