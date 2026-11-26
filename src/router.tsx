import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { NotFound } from '@/components/not-found'
import { designLabRoutes } from '@/modules/design-lab/routes'
import { landingRoutes, profileRoute } from '@/modules/landing/routes'
import { panelAdminRoutes } from '@/modules/panel-admin/routes'
import { panelAppRoutes } from '@/modules/panel-app/routes'
import { ProfileLayout } from '@/profile-layout'

export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      landingRoutes,
      { Component: ProfileLayout, children: [profileRoute] },
      panelAppRoutes,
      panelAdminRoutes,
      designLabRoutes,
      { path: '*', Component: NotFound },
    ],
  },
])
