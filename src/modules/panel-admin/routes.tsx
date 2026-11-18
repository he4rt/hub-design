import type { RouteObject } from 'react-router'
import { AuthLayout } from '@/components/auth-layout'
import Login from './features/auth/pages/login'
import Dashboard from './features/home/pages/dashboard'
import Users from './features/setup/users/pages/index'
import EntryTests from './features/squads/entry-tests/pages/index'
import SquadCreate from './features/squads/squads/pages/create'
import Squads from './features/squads/squads/pages/index'
import Squad from './features/squads/squads/pages/show'
import ProjectCreate from './features/squads/squads/projects/pages/create'
import Github from './features/system/github/pages/show'
import Contestations from './features/validation/contestations/pages/index'
import ValidationQueue from './features/validation/queue/pages/index'
import Reviews from './features/validation/reviews/pages/index'
import Validators from './features/validation/validators/pages/index'
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
        { path: 'squads', Component: Squads },
        { path: 'squads/create', Component: SquadCreate },
        { path: 'squads/entry-tests', Component: EntryTests },
        { path: 'squads/:squad', Component: Squad },
        { path: 'squads/:squad/projects/create', Component: ProjectCreate },
        { path: 'system/github', Component: Github },
        { path: 'validation/validators', Component: Validators },
        { path: 'validation/queue', Component: ValidationQueue },
        { path: 'validation/reviews', Component: Reviews },
        { path: 'validation/contestations', Component: Contestations },
      ],
    },
  ],
}
