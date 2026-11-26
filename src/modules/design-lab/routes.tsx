import type { RouteObject } from 'react-router'
import Feed from './tecnico/feed'
import Tecnico from './tecnico/page'
import Profile from './tecnico/profile'
import Events from './tecnico/events'
import Saved from './tecnico/saved'
import Trajectory from './tecnico/trajectory'

/**
 * Mounted at `/design-lab`: the "Técnico × Traçado" proof of concept. Temporary: remove this module
 * and its line in `src/router.tsx` once the identity moves into the app.
 */
export const designLabRoutes: RouteObject = {
  path: 'design-lab',
  children: [
    { index: true, Component: Tecnico },
    { path: 'tecnico', Component: Tecnico },
    { path: 'feed', Component: Feed },
    { path: 'perfil', Component: Profile },
    { path: 'trajetoria', Component: Trajectory },
    { path: 'salvos', Component: Saved },
    { path: 'eventos', Component: Events },
  ],
}
