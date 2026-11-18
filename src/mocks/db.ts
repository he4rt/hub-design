import { createStore, useStore } from '@/lib/store'
import { withCompleteness } from './profile-completeness'

/** Providers that sign a member in. */
export type SocialProvider = 'discord' | 'github' | 'google'

/** Accounts a member can link in the settings; LinkedIn links but does not sign in. */
export type LinkedProvider = SocialProvider | 'linkedin'

/** Community product where the shared He4rt account was created. */
export type AccountOrigin = 'hub' | 'basement' | 'job-finder'

export type Area = 'front-end' | 'back-end' | 'full-stack' | 'mobile' | 'qa' | 'devops' | 'data-ai' | 'cybersec'

export type StartingPoint = 'beginner' | 'junior' | 'mid' | 'senior'

export type Objective = 'learn' | 'get-job' | 'grow'

export type Situation = 'working' | 'seeking' | 'studying'

export type City = { name: string; uf: string }

export type LinkedAccount = { provider: LinkedProvider; handle: string; linkedAt: string }

/** Fields that count toward the profile completeness. */
export type ProfileField =
  | 'areas'
  | 'startingPoint'
  | 'languages'
  | 'photo'
  | 'bio'
  | 'city'
  | 'situation'
  | 'github'
  | 'linkedin'
  | 'portfolio'

/** Suggestion made from the member's GitHub repositories, waiting for confirmation. */
export type GithubSuggestion = { areas: Area[]; languages: string[] }

/**
 * One account of the shared He4rt identity, used by the Hub, the Basement and
 * the Job Finder. A Basement or Job Finder account enters the Hub as is and
 * answers the Hub profile questions it has not answered yet.
 */
export type User = {
  id: string
  name: string
  email: string
  /** Null until the member confirms the e-mail; a provider that confirms it counts. */
  emailVerifiedAt: string | null
  role: 'admin' | 'member'
  origin: AccountOrigin
  linkedAccounts: LinkedAccount[]
  /** Public profile handle. */
  username: string
  /** YYYY-MM-DD, required at sign-up; nobody under 18 has an account. Never public. */
  birthDate: string
  usageNoticeAcceptedAt: string | null
  /** First time the member reached the Hub profile questions. */
  onboardingStartedAt: string | null
  /** When the member answered (or skipped) the last profile question. */
  onboardedAt: string | null
  objective: Objective | null
  areas: Area[]
  /** Private: only the member sees it. */
  startingPoint: StartingPoint | null
  languages: string[]
  situation: Situation | null
  /** Only the administration sees it. */
  openToOpportunities: boolean
  city: City | null
  photoUrl: string | null
  bio: string
  portfolioUrl: string
  /** Profiles are born private; the member publishes them in the settings. */
  published: boolean
  githubSuggestion: GithubSuggestion | null
  /** Computed by the backend on every profile write; the member never edits it. */
  completeness: { percent: number; missing: ProfileField[] }
  /** First time the completeness reached 100%. */
  profileCompletedAt: string | null
  /** "Next steps" card on the /app home. */
  profileReminder: { dismissals: number; hiddenUntil: string | null }
  createdAt: string
}

export type PasswordReset = { email: string; token: string; createdAt: string }

/** Social login of an e-mail without an account, kept in the session until the sign-up form is sent. */
export type PendingSocialSignUp = {
  provider: SocialProvider
  name: string
  email: string
  emailVerified: boolean
  handle: string
}

/** Social login that matched an account without a confirmed e-mail: linked after a password login. */
export type PendingSocialLink = { provider: SocialProvider; email: string; handle: string }

export type AnalyticsEvent = { event: string; props: Record<string, unknown>; at: string }

export type MockDb = {
  users: User[]
  /** Server-side only: passwords by user id. Accounts created by social login have none. */
  passwords: Record<string, string>
  passwordResets: PasswordReset[]
  pendingSocialSignUp: PendingSocialSignUp | null
  pendingSocialLink: PendingSocialLink | null
  /** Signed-in member of /app. */
  session: { userId: string } | null
  /** Signed-in admin of /admin; a separate entry from the member session. */
  adminSession: { userId: string } | null
  /** What PostHog would receive, newest first. */
  events: AnalyticsEvent[]
}

export const DEMO_PASSWORD = 'password'

/** Builds a user with every optional field empty and its completeness computed. */
export function makeUser(
  fields: Pick<User, 'id' | 'name' | 'email' | 'username' | 'birthDate'> & Partial<Omit<User, 'completeness'>>,
): User {
  return withCompleteness({
    emailVerifiedAt: null,
    role: 'member',
    origin: 'hub',
    linkedAccounts: [],
    usageNoticeAcceptedAt: null,
    onboardingStartedAt: null,
    onboardedAt: null,
    objective: null,
    areas: [],
    startingPoint: null,
    languages: [],
    situation: null,
    openToOpportunities: false,
    city: null,
    photoUrl: null,
    bio: '',
    portfolioUrl: '',
    published: false,
    githubSuggestion: null,
    profileCompletedAt: null,
    profileReminder: { dismissals: 0, hiddenUntil: null },
    createdAt: new Date().toISOString(),
    completeness: { percent: 0, missing: [] },
    ...fields,
  })
}

const joined = (date: string) => ({
  emailVerifiedAt: date,
  usageNoticeAcceptedAt: date,
  onboardingStartedAt: date,
  onboardedAt: date,
  createdAt: date,
})

const linked = (provider: LinkedProvider, handle: string, linkedAt: string): LinkedAccount => ({
  provider,
  handle,
  linkedAt,
})

const seed: MockDb = {
  users: [
    makeUser({
      id: 'u1',
      name: 'Daniel Reis',
      email: 'daniel@he4rt.dev',
      username: 'daniel',
      birthDate: '1996-04-12',
      role: 'admin',
      ...joined('2025-01-10T12:00:00Z'),
      linkedAccounts: [
        linked('discord', 'danielhe4rt', '2025-01-10T12:00:00Z'),
        linked('github', 'danielhe4rt', '2025-01-10T12:00:00Z'),
      ],
      objective: 'grow',
      areas: ['full-stack', 'back-end'],
      startingPoint: 'senior',
      languages: ['PHP', 'TypeScript'],
      situation: 'working',
      city: { name: 'São Paulo', uf: 'SP' },
      bio: 'Fundador da He4rt Developers. Laravel, comunidade e café.',
      published: true,
    }),
    makeUser({
      id: 'u2',
      name: 'Ana Souza',
      email: 'ana@he4rt.dev',
      username: 'ana-souza',
      birthDate: '2001-09-30',
      ...joined('2025-03-22T12:00:00Z'),
      linkedAccounts: [linked('github', 'ana-souza', '2025-03-22T12:00:00Z')],
      objective: 'get-job',
      areas: ['front-end'],
      startingPoint: 'junior',
      languages: ['JavaScript', 'TypeScript'],
      situation: 'seeking',
      openToOpportunities: true,
      city: { name: 'Recife', uf: 'PE' },
      bio: 'Front-end em formação, estudando acessibilidade e React.',
      published: true,
    }),
    makeUser({
      id: 'u3',
      name: 'Bruno Lima',
      email: 'bruno@he4rt.dev',
      username: 'bruno-lima',
      birthDate: '1999-06-01',
      ...joined('2025-06-05T12:00:00Z'),
      emailVerifiedAt: null,
      objective: 'learn',
      areas: ['back-end'],
      startingPoint: 'beginner',
      languages: ['Java'],
    }),
    makeUser({
      id: 'u4',
      name: 'Carla Mendes',
      email: 'carla@basement.dev',
      username: 'carla-mendes',
      birthDate: '2000-11-02',
      origin: 'basement',
      emailVerifiedAt: '2025-08-14T12:00:00Z',
      createdAt: '2025-08-14T12:00:00Z',
      linkedAccounts: [linked('google', 'carla.mendes', '2025-08-14T12:00:00Z')],
    }),
    makeUser({
      id: 'u5',
      name: 'Pedro Alves',
      email: 'pedro@jobfinder.dev',
      username: 'pedro-alves',
      birthDate: '1994-03-21',
      origin: 'job-finder',
      emailVerifiedAt: '2025-09-01T12:00:00Z',
      createdAt: '2025-09-01T12:00:00Z',
      // Answered in the Job Finder, which shares the identity.
      objective: 'get-job',
      areas: ['back-end'],
    }),
  ],
  passwords: { u1: DEMO_PASSWORD, u2: DEMO_PASSWORD, u3: DEMO_PASSWORD, u4: DEMO_PASSWORD, u5: DEMO_PASSWORD },
  passwordResets: [],
  pendingSocialSignUp: null,
  pendingSocialLink: null,
  session: null,
  adminSession: null,
  events: [],
}

/** The fake backend. Persisted in localStorage; reset it from the debug sidebar. */
export const db = createStore(seed, { persist: 'he4rt:mock-db:v4' })

export function useDb<S>(selector: (db: MockDb) => S): S {
  return useStore(db, selector)
}

export function findUser(userId: string): User | undefined {
  return db.get().users.find((user) => user.id === userId)
}

/**
 * Writes a user and recomputes its completeness, like a model observer would.
 * Returns the saved user and whether the profile just reached 100% for the first time.
 */
export function updateUser(userId: string, update: (user: User) => User): { firstComplete: boolean } {
  let firstComplete = false
  db.set((state) => ({
    ...state,
    users: state.users.map((user) => {
      if (user.id !== userId) return user
      const next = withCompleteness(update(user))
      if (next.completeness.percent === 100 && next.profileCompletedAt === null) {
        firstComplete = true
        return { ...next, profileCompletedAt: new Date().toISOString() }
      }
      return next
    }),
  }))
  return { firstComplete }
}

export function newId(): string {
  return crypto.randomUUID().slice(0, 8)
}
