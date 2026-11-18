import { redirect, type RouteObject } from 'react-router'
import { AuthLayout } from '@/components/auth-layout'
import PublicProfile from './features/account/public-profile/pages/show'
import Profile from './features/account/settings/pages/profile'
import FeedCreate from './features/community/feed/pages/create'
import FeedEdit from './features/community/feed/pages/edit'
import FeedIndex from './features/community/feed/pages/index'
import ForgotPassword from './features/auth/pages/forgot-password'
import Login from './features/auth/pages/login'
import Onboarding from './features/auth/pages/onboarding'
import Register from './features/auth/pages/register'
import ResetPassword from './features/auth/pages/reset-password'
import UsageData from './features/auth/pages/usage-data'
import DiscussionCreate from './features/community/discussions/pages/create'
import DiscussionsIndex from './features/community/discussions/pages/index'
import DiscussionShow from './features/community/discussions/pages/show'
import SquadShow from './features/development/squads/pages/show'
import ProjectShow from './features/development/squads/projects/pages/show'
import MyApplications from './features/squads/applications/pages/index'
import EntryTest from './features/squads/entry-test/pages/show'
import ApplicationCreate from './features/squads/squads/applications/pages/create'
import CaptainApplications from './features/squads/squads/applications/pages/index'
import Deliveries from './features/squads/squads/deliveries/pages/index'
import Members from './features/squads/squads/members/pages/index'
import MySquads from './features/squads/squads/pages/index'
import MySquad from './features/squads/squads/pages/show'
import ProjectEdit from './features/squads/squads/projects/pages/edit'
import { AppLayout } from './layouts/app-layout'
import { PublicLayout } from './layouts/public-layout'

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
      // Readable without login: visitors only read, every action needs a session.
      Component: PublicLayout,
      children: [
        { path: 'members/:handle', Component: PublicProfile },
        { path: 'squads/:squadSlug', Component: SquadShow },
        { path: 'squads/:squadSlug/projects/:projectSlug', Component: ProjectShow },
        { path: 'discussions', Component: DiscussionsIndex },
        // Visitors see the form and a sign-in prompt; publishing needs a session.
        { path: 'discussions/new', Component: DiscussionCreate },
        { path: 'discussions/:discussionId', Component: DiscussionShow },
      ],
    },
    {
      Component: AppLayout,
      children: [
        // The Feed is the home of the Hub; `wide` lets its three columns use the screen.
        { index: true, Component: FeedIndex, handle: { wide: true } },
        { path: 'feed', loader: ({ request }) => redirect(`/app${new URL(request.url).search}`) },
        { path: 'feed/new', Component: FeedCreate },
        { path: 'feed/:postId/edit', Component: FeedEdit },
        { path: 'settings/profile', Component: Profile },
        { path: 'squads/entry-test', Component: EntryTest },
        { path: 'squads/applications', Component: MyApplications },
        { path: 'squads', Component: MySquads },
        { path: 'squads/:squad', Component: MySquad },
        { path: 'squads/:squad/applications', Component: CaptainApplications },
        { path: 'squads/:squad/deliveries', Component: Deliveries },
        { path: 'squads/:squad/members', Component: Members },
        { path: 'squads/:squad/projects/:project/edit', Component: ProjectEdit },
        { path: 'squads/:squad/projects/:project/applications/create', Component: ApplicationCreate },
      ],
    },
  ],
}
