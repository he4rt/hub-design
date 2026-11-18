import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { NotFound } from '@/components/not-found'
import { landingRoutes } from '@/modules/landing/routes'
import { panelAdminRoutes } from '@/modules/panel-admin/routes'
import { panelAppRoutes } from '@/modules/panel-app/routes'

export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [landingRoutes, panelAppRoutes, panelAdminRoutes, { path: '*', Component: NotFound }],
  },
])
