import { redirect, type RouteObject } from 'react-router'
import { AuthLayout } from '@/components/auth-layout'
import Profile from './features/account/settings/pages/profile'
import FeedEdit from './features/community/feed/pages/edit'
import FeedSaved from './features/community/feed/pages/saved'
import FeedIndex from './features/community/feed/pages/index'
import FeedProject from './features/community/feed/pages/project'
import ForgotPassword from './features/auth/pages/forgot-password'
import Login from './features/auth/pages/login'
import Onboarding from './features/auth/pages/onboarding'
import Register from './features/auth/pages/register'
import ResetPassword from './features/auth/pages/reset-password'
import UsageData from './features/auth/pages/usage-data'
import DiscussionCreate from './features/community/discussions/pages/create'
import DiscussionsIndex from './features/community/discussions/pages/index'
import DiscussionShow from './features/community/discussions/pages/show'
import AdmissionPoc from './features/squads/admission-poc/pages/show'
import CrestPoc from './features/squads/crest-poc/pages/show'
import ProjectPoc from './features/squads/project-poc/pages/show'
import MyApplications from './features/squads/applications/pages/index'
import EntryTest from './features/squads/entry-test/pages/show'
import ApplicationCreate from './features/squads/squads/applications/pages/create'
import CaptainApplications from './features/squads/squads/applications/pages/index'
import Deliveries from './features/squads/squads/deliveries/pages/index'
import Members from './features/squads/squads/members/pages/index'
import MySquads from './features/squads/squads/pages/index'
import MySquad from './features/squads/squads/pages/show'
import ProjectEdit from './features/squads/squads/projects/pages/edit'
import ValidationQueue from './features/validation/queue/pages/index'
import ValidationRecord from './features/validation/queue/pages/show'
import ValidationRequestCreate from './features/validation/requests/pages/create'
import ValidatorApplication from './features/validation/validator-application/pages/show'
import Validations from './features/validation/validations/pages/index'
import Validation from './features/validation/validations/pages/show'
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
        // The single public profile lives on the landing; old links keep working.
        {
          path: 'members/:username',
          loader: ({ params, request }) => redirect(`/members/${params.username}${new URL(request.url).search}`),
        },
        // The public project page lives on the landing; old links keep working.
        {
          path: 'squads/:squad/projects/:project',
          loader: ({ params, request }) =>
            redirect(`/squads/${params.squad}/projects/${params.project}${new URL(request.url).search}`),
        },
        { path: 'discussions', Component: DiscussionsIndex },
        // Visitors see the form and a sign-in prompt; publishing needs a session.
        { path: 'discussions/new', Component: DiscussionCreate },
        { path: 'discussions/:discussionId', Component: DiscussionShow },
      ],
    },
    {
      Component: AppLayout,
      children: [
        // The Feed is the home of the Hub.
        { index: true, Component: FeedIndex },
        { path: 'feed', loader: ({ request }) => redirect(`/app${new URL(request.url).search}`) },
        // Nova publicação opens over the home.
        { path: 'feed/new', loader: () => redirect('/app?compose=1') },
        { path: 'feed/:postId/edit', Component: FeedEdit },
        { path: 'saved', Component: FeedSaved },
        { path: 'projects/:projectId', Component: FeedProject },
        { path: 'settings/profile', Component: Profile },
        { path: 'squads/entry-test', Component: EntryTest },
        { path: 'squads/applications', Component: MyApplications },
        { path: 'squads/admission-poc', Component: AdmissionPoc },
        { path: 'squads/crest-poc', Component: CrestPoc },
        { path: 'squads/project-poc', Component: ProjectPoc },
        { path: 'validation', Component: Validations },
        { path: 'validation/requests/create', Component: ValidationRequestCreate },
        { path: 'validation/validator-application', Component: ValidatorApplication },
        { path: 'validation/queue', Component: ValidationQueue },
        { path: 'validation/queue/:request', Component: ValidationRecord },
        { path: 'validation/:validation', Component: Validation },
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
