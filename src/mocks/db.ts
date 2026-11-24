import { createStore, useStore } from '@/lib/store'
import { withCompleteness } from './profile-completeness'
import { REPOSITORIES } from './repositories'
import { squadsSeed } from './squads-seed'

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
export type LanguageLevel = 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native'
export type SpokenLanguage = { language: string; level: LanguageLevel }

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
  /** Staff are `admin` and `super-admin`; captain and validator are not roles but per-squad and per-enablement. */
  role: UserRole
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
  /** Spoken languages (idiomas) with the member's level, shown in the profile's Sobre. */
  spokenLanguages: SpokenLanguage[]
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
  /** "Next steps" card beside the Feed, the /app home. */
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

export type UserRole = 'member' | 'admin' | 'super-admin'

/** A project team in the He4rt organization on GitHub. Never deleted, only inactive. */
export type Squad = {
  id: string
  slug: string
  name: string
  description: string
  /** Null is a vacancy: a squad without a captain. */
  captainId: string | null
  status: 'active' | 'inactive'
  createdAt: string
}

export type AcceptanceCriterion = { id: string; text: string }
export type EvaluationCriterion = { id: string; competency: string; description: string }
export type ApplicationQuestion = { id: string; text: string; required: boolean }

/** A project is born in the Hub with its goal and criteria; the GitHub App creates the repository and board. */
export type Project = {
  id: string
  squadId: string
  slug: string
  name: string
  goal: string
  acceptanceCriteria: AcceptanceCriterion[]
  evaluationCriteria: EvaluationCriterion[]
  stack: string[]
  expectedLevel: StartingPoint[]
  /** Counts every active member, the captain included. */
  seats: number
  /** Derived by the API for viewers who cannot read other people's pending invitations. */
  reservedSeats?: number
  applicationQuestions: ApplicationQuestion[]
  repository: { fullName: string; url: string } | null
  board: { number: number; url: string } | null
  status: 'provisioning' | 'active' | 'ended'
  startedAt: string | null
  endedAt: string | null
}

export type SquadMembership = {
  id: string
  squadId: string
  projectId: string
  userId: string
  /** What this member answered for, as the captain registered it. */
  responsibilities: string
  joinedAt: string
  leftAt: string | null
  leftReason: string | null
  /**
   * The member chose to show this participation on their public profile. Off when it starts:
   * the squad log keeps it either way, but nothing private is published by itself.
   */
  shownOnProfile: boolean
}

/** One per member: a pull request to a He4rt repository, merged by someone from the staff. */
export type EntryTest = {
  userId: string
  pullRequest: { repository: string; number: number; url: string; title: string }
  status: 'open' | 'approved' | 'closed'
  /** GitHub handle of the staff member who merged it. */
  reviewer: string | null
  openedAt: string
  approvedAt: string | null
}

export type ApplicationNotes = { strengths: string; improvements: string; authorId: string; updatedAt: string }

export type SquadApplication = {
  id: string
  projectId: string
  userId: string
  answers: { questionId: string; answer: string }[]
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
  /** Seen by the member, the captain and the staff. */
  notes: ApplicationNotes | null
  decision: { reason: string; nextSteps: string; decidedBy: string; decidedAt: string } | null
  githubInvite: 'not-needed' | 'pending' | 'accepted'
  createdAt: string
}

export type BoardStatus = 'backlog' | 'ready' | 'in-progress' | 'in-review' | 'done'
export type WorkKind = 'technical' | 'non-technical'

/** Read-only copy of an item on the project's GitHub board. */
export type BoardItem = {
  id: string
  projectId: string
  issue: { number: number; title: string; url: string }
  status: BoardStatus
  kind: WorkKind
  criterionId: string | null
  assigneeIds: string[]
  pullRequests: { number: number; url: string; merged: boolean; authorId: string; coAuthorIds: string[]; reviewerIds?: string[] }[]
  updatedAt: string
}

export type Evidence = { kind: 'commit' | 'pull-request' | 'review'; ref: string; url: string; authorId: string }

/** A board item the captain checks against the acceptance criteria and credits to who did it. */
export type SquadDelivery = {
  id: string
  projectId: string
  boardItemId: string
  title: string
  kind: WorkKind
  criterionId: string | null
  status: 'pending' | 'accepted' | 'returned'
  collaboration: 'individual' | 'pair' | 'group'
  credits: { userId: string; part: string }[]
  /** The captain's note; the validator reads it. */
  context: string
  evidence: Evidence[]
  returnedReason: string | null
  decidedBy: string | null
  decidedAt: string | null
  /** Append-only decisions; resubmitting or accepting never erases an earlier return. */
  decisions?: { id: string; decision: 'accepted' | 'returned'; actorId: string; reason: string; at: string }[]
  createdAt: string
}

export type SquadLogKind =
  | 'project-started'
  | 'project-ended'
  | 'member-joined'
  | 'member-left'
  | 'member-removed'
  | 'member-reassigned'
  | 'captain-changed'
  | 'delivery-accepted'

/** Permanent record of what the squad did, project by project. */
export type SquadLogEntry = {
  id: string
  squadId: string
  projectId: string | null
  kind: SquadLogKind
  actorId: string
  subjectId: string | null
  /** Reference to what the entry is about, such as a delivery title. */
  detail: string | null
  reason: string | null
  at: string
}

export type GithubSync = {
  /** Repositories of the organization, kept current by the GitHub App; projects create or link one. */
  repositories: string[]
  lastWebhookAt: string | null
  lastSweepAt: string | null
  divergences: { id: string; description: string; detectedAt: string }[]
}

export type ValidatorApplication = {
  id: string
  userId: string
  summary: string
  links: string[]
  jobTitle: string
  company: string
  showEmployer: boolean
  status: 'pending' | 'approved' | 'declined'
  decision: { reason: string; decidedBy: string; decidedAt: string } | null
  createdAt: string
}

export type Validator = {
  userId: string
  approvedAt: string
  jobTitle: string
  company: string
  /** The validator agreed to show job title and company on validations. */
  showEmployer: boolean
  suspension: { reason: string; by: string; at: string } | null
  lastAssignedAt: string | null
}

export type ValidationRequest = {
  id: string
  memberId: string
  projectId: string
  deliveryIds: string[]
  /** Id of one of the project's evaluation criteria. */
  criterionId: string
  status: 'queued' | 'assigned' | 'recorded' | 'cancelled'
  validatorId: string | null
  assignedAt: string | null
  conflicts: { validatorId: string; description: string; at: string }[]
  /** Set when a request goes back to the queue (conflict, suspension); it then goes to the front. */
  requeuedAt?: string | null
  /** A correction after a contestation: the new validation points to this one. */
  supersedesId?: string | null
  createdAt: string
}

export type ValidationPoint = { text: string; evidenceRef: string }
export type ImprovementPoint = ValidationPoint & { suggestion: string }

/** Record of what a validator saw. Immutable once recorded; a correction is a new record. */
export type Validation = {
  id: string
  requestId: string
  memberId: string
  validatorId: string
  /** Snapshot at record time; job title and company only when the validator allowed it. */
  validator: { name: string; jobTitle: string | null; company: string | null }
  projectId: string
  competency: string
  context: string
  contribution: string
  strengths: ValidationPoint[]
  improvements: ImprovementPoint[]
  conflictOfInterest: { declared: boolean; description: string }
  insufficientEvidence: boolean
  status: 'draft' | 'in-review' | 'recorded'
  review: { reviewerId: string; decision: 'approved' | 'returned'; note: string; at: string } | null
  recordedAt: string | null
  published: boolean
  publishedAt: string | null
  supersedesId: string | null
}

export type Contestation = {
  id: string
  validationId: string
  openedBy: string
  reason: string
  status: 'open' | 'upheld' | 'corrected'
  decision: { by: string; note: string; at: string } | null
  createdAt: string
}

export type AnalyticsEvent = { event: string; props: Record<string, unknown>; at: string }

/** Who sees a trajectory record: only the member, signed-in members, or anyone with the link. */
export type Visibility = 'private' | 'community' | 'public'

/*
 * Public profile records. Every record has a `visibility` the member chose: it shows on the public
 * profile only when the member chose to publish it.
 */

export type DeclaredKnowledge = {
  id: string
  competency: string
  level: 'basic' | 'intermediate' | 'advanced'
  declaredAt: string
  visibility: Visibility
}

export type LearningRecord = {
  id: string
  title: string
  description: string | null
  origin: 'member' | 'basement'
  completedAt: string
  visibility: Visibility
}

export type ExperienceRecord = {
  id: string
  role: string
  organization: string
  description: string | null
  startedAt: string
  endedAt: string | null
  visibility: Visibility
}

/** An article the member wrote outside the Hub, such as on dev.to. */
export type Article = {
  id: string
  title: string
  summary: string | null
  url: string
  source: 'dev.to'
  publishedAt: string
  visibility: Visibility
}

/** Commit, pull request, or repository the member picked to show on their profile. */
export type TechnicalEvidence = {
  id: string
  kind: 'commit' | 'pull-request' | 'repository'
  repository: string
  /** Short commit hash or pull request number; null for a repository. */
  ref: string | null
  title: string
  /** In the member's words: the problem, what they changed, and the result. Short enough for a card. */
  context: string
  url: string
  date: string
  /** Squad project this evidence belongs to; null for the member's own repositories. */
  projectId: string | null
  visibility: Visibility
}

/** Public profile of a member (Fundação stage: no squads, validations, or XP yet). */
/**
 * Trajectory records of a member. Identity (name, photo, bio, which is the profile's "Sobre", areas, languages, links) lives only
 * in `User`, the shared He4rt account; nothing here copies it.
 */
export type MemberProfile = {
  userId: string
  /** Picture on top of the profile header, as a data URL; null shows the ink band. */
  coverImageUrl: string | null
  knowledge: DeclaredKnowledge[]
  learnings: LearningRecord[]
  experiences: ExperienceRecord[]
  articles: Article[]
  evidences: TechnicalEvidence[]
}

/** Highest kind of evidence a member had in the Hub. Never a seniority, never goes down. */
export type JourneyStage = 'member' | 'prepared' | 'practicing' | 'delivered' | 'validated'

export type MemberJourney = {
  stage: JourneyStage
  /** Highest stage the member published; what visitors see. */
  publicStage: JourneyStage
  /** Captain, validator, or entry test reviewer. */
  contributor: boolean
}

/**
 * Achievement a member unlocked (docs/achievements/entities.md). Computed by the platform from the
 * facts (src/mocks/achievements.ts), never stored nor edited; only the member's choice to show it is.
 */
export type MemberAchievement = {
  id: string
  userId: string
  /** Key in the catalog of src/mocks/achievements.ts. */
  key: string
  /** When the fact happened, not when the check ran. */
  unlockedAt: string
  source: 'platform' | 'administration'
  grantReason: string | null
  /** For a private achievement: whether the record that unlocked it is published. */
  originPublic: boolean
  /** The member chose to show it on the public profile. */
  isPublic: boolean
  revokedAt: string | null
}

export type ProfileRevision = {
  id: string
  userId: string
  actorId: string
  collection: 'presentation' | 'knowledge' | 'learnings' | 'experiences' | 'articles' | 'evidences'
  recordId: string
  operation: 'update' | 'delete'
  snapshot: Record<string, unknown>
  at: string
}

export type DiscussionCategory = 'question' | 'technical' | 'learning'

/** What a discussion is about: a squad, a squad project, or one of the author's diary publications. */
export type DiscussionContext = { type: 'squad' | 'project' | 'post'; id: string }

export type DiscussionReply = { id: string; authorId: string; body: string; createdAt: string }

/** Forum discussion. Questions and answers live here, apart from the trajectory on the profile. */
export type Discussion = {
  id: string
  title: string
  category: DiscussionCategory
  authorId: string
  body: string
  createdAt: string
  context: DiscussionContext | null
  replies: DiscussionReply[]
  /** Reply the author marked as the one that solved the question. */
  solvedReplyId: string | null
}

/** Learning reactions to a publication. Never XP, never an order for the Feed. */
export type ReactionType = 'helped' | 'learning-too' | 'want-to-learn' | 'inspiring'

export type PostReaction = { userId: string; type: ReactionType; createdAt: string }

/**
 * Study track: a member's own line of publications about one theme, such as
 * "IA aplicada", showing how they evolve in it. The interface says "trilha".
 */
export type FeedCollection = { id: string; userId: string; name: string; createdAt: string }

/**
 * Short comment on a publication, for members who can read it in the Feed. No replies and no
 * reactions on comments. Deleting one hides it for everyone and keeps it for moderation.
 */
export type FeedComment = {
  id: string
  postId: string
  userId: string
  body: string
  createdAt: string
  deletedAt: string | null
  /** Set when the staff removed it; then `deletedAt` is set too. */
  removal: Removal | null
}

/**
 * The staff took a publication or comment down, with a reason. The author sees the reason; the
 * other members just stop seeing it; who removed it stays with the administration.
 */
export type Removal = { reason: string; removedBy: string; removedAt: string }

/** A publication a member saved to read again, like a bookmark. Only that member sees it. */
export type FeedBookmark = { userId: string; postId: string; createdAt: string }

/**
 * Official publication of the community: written by the staff, signed by He4rt Developers.
 * Pinned ones open the Feed, newest pin first; the staff pins and unpins them.
 */
export type FeedAnnouncement = {
  id: string
  /** Staff member who wrote it; readers only see He4rt Developers. */
  authorId: string
  title: string
  body: string
  createdAt: string
  pinnedAt: string | null
}

/**
 * Strip at the top of the home: a notice of the community or a partner's announcement,
 * always labeled as one or the other. The newest active one shows.
 */
export type HomeBanner = {
  id: string
  kind: 'notice' | 'partner'
  /** Name of the partner, for `partner` banners. */
  partner: string | null
  text: string
  link: { label: string; url: string } | null
  active: boolean
  createdAt: string
}

/** How much a learning got the member closer to the objective. A label, never a score. */
export type ObjectiveProgress = 'none' | 'little' | 'a-lot' | 'very-much'

/**
 * Publication of the learning diary. It is a record of its author's trajectory:
 * it always exists for the author, and goes to the community Feed or the public
 * profile only when the author chooses. The author can edit the text; each edit keeps the
 * previous version for moderation, and members see when it was last edited.
 */
export type FeedPost = {
  id: string
  userId: string
  learned: string
  applied: string
  objectiveProgress: ObjectiveProgress
  /** Learning record of the author's trajectory this publication belongs to, when they chose one. */
  learningId: string | null
  /**
   * Set when the publication shares one of the author's projects: its text lives in the project,
   * `learned` and `applied` stay empty and `objectiveProgress` is unused. It is not a diary entry, so
   * the trajectory, the profile's diary and the diary achievements leave it out.
   */
  projectId: string | null
  /** Members see it in the Feed. On by default in the form. */
  sharedOnFeed: boolean
  /** Visitors see it in the public profile, when the profile is published. Off by default. */
  shownOnProfile: boolean
  /** Collections of the author; a publication can be in several or none. */
  collectionIds: string[]
  reactions: PostReaction[]
  /** Everyone sees how many reactions this publication got; off means only the author sees them. */
  showReactionCounts: boolean
  createdAt: string
  /** Deleted by the author or removed by the staff: gone for every member, kept for moderation and audit. */
  deletedAt: string | null
  /** Set when the staff removed it; then `deletedAt` is set too. */
  removal: Removal | null
  /** Last time the author edited the text; members see it on the card. */
  editedAt: string | null
  /** Earlier versions of the text, oldest first, seen only by moderation. */
  revisions: (Pick<FeedPost, 'learned' | 'applied' | 'objectiveProgress'> & { replacedAt: string })[]
}

/** Legacy intentions are kept only in the moderation history. New questions live in the forum. */
export type ProjectIntent = 'showcase' | 'help'

/** What the He4rt GitHub App last read from a member's repository. */
export type RepositoryRead = {
  name: string
  description: string | null
  language: string | null
  license: string | null
  /** Last push to the default branch. */
  pushedAt: string
  /** Root files the Hub reads; null when the repository does not have one. Markdown, as on GitHub. */
  files: { product: string | null; metrics: string | null; readme: string | null }
}

/**
 * A member's own project ("projeto pessoal"), shared in the Feed from one of their GitHub repositories.
 * Not the squad's `Project`, which the staff creates. The preview leads straight to GitHub;
 * questions are forum discussions linked to the publication.
 * Reactions, comments and bookmarks live in the publication that shares it (`FeedPost.projectId`).
 */
export type MemberProject = {
  id: string
  userId: string
  repository: { fullName: string; url: string }
  /** What the author tells the community about it. */
  pitch: string
  read: RepositoryRead
  /** Unavailable when the repository was deleted or made private: the last read stays. */
  repositoryStatus: 'available' | 'unavailable'
  readAt: string
  createdAt: string
  revisions: { intent: ProjectIntent; pitch: string; helpRequest: string | null; replacedAt: string }[]
}

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
  /** Newest last; read through the Feed, which sorts them. */
  feedPosts: FeedPost[]
  feedCollections: FeedCollection[]
  feedBookmarks: FeedBookmark[]
  /** Oldest first, as they read under the publication. */
  feedComments: FeedComment[]
  feedAnnouncements: FeedAnnouncement[]
  memberProjects: MemberProject[]
  homeBanners: HomeBanner[]
  /** What PostHog would receive, newest first. */
  events: AnalyticsEvent[]
  profiles: MemberProfile[]
  profileRevisions: ProfileRevision[]
  /** Achievements each member chose to show on the profile. */
  achievementChoices: { userId: string; key: string }[]
  discussions: Discussion[]
  squads: Squad[]
  projects: Project[]
  memberships: SquadMembership[]
  entryTests: EntryTest[]
  applications: SquadApplication[]
  boardItems: BoardItem[]
  deliveries: SquadDelivery[]
  squadLog: SquadLogEntry[]
  githubSync: GithubSync
  validatorApplications: ValidatorApplication[]
  validators: Validator[]
  validationRequests: ValidationRequest[]
  /** Computed by the API for active validators; queue counts do not disclose other members' requests. */
  validationQueueSize?: number
  validations: Validation[]
  contestations: Contestation[]
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
    spokenLanguages: [],
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

const post = (
  id: string,
  userId: string,
  createdAt: string,
  fields: Pick<FeedPost, 'learned' | 'applied' | 'objectiveProgress'> & Partial<FeedPost>,
): FeedPost => ({
  id,
  userId,
  createdAt,
  learningId: null,
  projectId: null,
  sharedOnFeed: true,
  shownOnProfile: false,
  collectionIds: [],
  reactions: [],
  showReactionCounts: false,
  deletedAt: null,
  removal: null,
  editedAt: null,
  revisions: [],
  ...fields,
})

const reacted = (userId: string, type: ReactionType, createdAt: string): PostReaction => ({ userId, type, createdAt })

/** Onboarded member with a published profile and the GitHub linked under the same handle. */
function member({
  since,
  ...fields
}: Pick<User, 'id' | 'name' | 'username' | 'bio' | 'areas' | 'languages'> &
  Partial<User> & { since: string }): User {
  return makeUser({
    email: `${fields.username}@he4rt.dev`,
    birthDate: '1997-05-20',
    ...joined(since),
    linkedAccounts: [linked('github', fields.username, since)],
    objective: 'grow',
    published: true,
    ...fields,
  })
}

const seed: MockDb = {
  users: [
    makeUser({
      id: 'u1',
      name: 'Daniel Reis',
      email: 'daniel@he4rt.dev',
      username: 'daniel',
      birthDate: '1996-04-12',
      role: 'super-admin',
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
      areas: ['back-end', 'front-end'],
      startingPoint: 'junior',
      languages: ['PHP', 'SQL', 'TypeScript', 'Shell'],
      spokenLanguages: [{ language: 'Português', level: 'native' }, { language: 'Inglês', level: 'intermediate' }],
      situation: 'seeking',
      openToOpportunities: true,
      city: { name: 'Recife', uf: 'PE' },
      portfolioUrl: 'https://ana-souza.dev',
      bio:
        'Passei quatro anos no suporte técnico de um provedor de internet e foi lá que comecei a automatizar tarefas com scripts em Bash.\n\nHoje estudo PHP e Laravel e faço sistemas pequenos para comércios do bairro. Quero trabalhar com back-end em um time que revise código junto.\n\nGosto de entender por que algo quebrou antes de corrigir. É o que mais aparece nas minhas notas do diário.',
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
      linkedAccounts: [linked('github', 'pedro-alves', '2025-09-01T12:00:00Z')],
    }),
    member({
      id: 'u8',
      name: 'Marina Duarte',
      username: 'marina-duarte',
      since: '2025-01-15T12:00:00Z',
      role: 'admin',
      startingPoint: 'senior',
      areas: ['devops'],
      languages: ['Python'],
      bio: 'Staff da He4rt. Cuida dos repositórios da organização.',
    }),
    member({
      id: 'u9',
      name: 'Diego Ramos',
      username: 'diego-ramos',
      since: '2025-05-02T12:00:00Z',
      startingPoint: 'senior',
      areas: ['back-end'],
      languages: ['PHP', 'TypeScript'],
      bio: 'Engenheiro de software. Valida trabalho de squads.',
    }),
    member({
      id: 'u10',
      name: 'Letícia Prado',
      username: 'leticia-prado',
      since: '2025-07-09T12:00:00Z',
      startingPoint: 'mid',
      areas: ['front-end'],
      languages: ['TypeScript'],
      bio: 'Front-end, acessibilidade e testes.',
    }),
    member({
      id: 'u11',
      name: 'Gustavo Nogueira',
      username: 'gustavo-nogueira',
      since: '2026-02-11T12:00:00Z',
      startingPoint: 'beginner',
      areas: ['back-end'],
      languages: ['PHP'],
      bio: 'Estudando Laravel e procurando o primeiro projeto em time.',
    }),
    makeUser({
      id: 'u6',
      name: 'Rafael Costa',
      email: 'rafael@he4rt.dev',
      username: 'rafael-costa',
      birthDate: '1993-02-17',
      ...joined('2025-02-03T12:00:00Z'),
      objective: 'grow',
      areas: ['back-end'],
      startingPoint: 'senior',
      languages: ['PHP', 'Go'],
      situation: 'working',
      bio:
        'Trabalho com back-end há nove anos, a maior parte em PHP e Go.\n\nComo capitão do squad Loja Comunitária, organizo as entregas e reviso os pull requests. Como validador, leio o trabalho de quem está em outros squads.',
      published: true,
      linkedAccounts: [linked('github', 'rafael-costa', '2025-02-03T12:00:00Z')],
    }),
    makeUser({
      id: 'u7',
      name: 'Júlia Martins',
      email: 'julia@he4rt.dev',
      username: 'julia-martins',
      birthDate: '2002-07-08',
      ...joined('2025-11-20T12:00:00Z'),
      objective: 'get-job',
      areas: ['front-end'],
      startingPoint: 'junior',
      languages: ['TypeScript'],
      situation: 'studying',
      linkedAccounts: [linked('github', 'julia-martins', '2025-11-20T12:00:00Z')],
    }),
  ],
  passwords: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`u${i + 1}`, DEMO_PASSWORD])),
  passwordResets: [],
  pendingSocialSignUp: null,
  pendingSocialLink: null,
  session: null,
  adminSession: null,
  feedPosts: [
    post('j4', 'u2', '2026-04-20T21:00:00Z', {
      learned: 'Ainda não entendi como ler o EXPLAIN do MySQL.',
      applied: 'Uma consulta de relatório continua lenta; anotei para estudar índices.',
      objectiveProgress: 'none',
      learningId: 'a2',
      sharedOnFeed: false,
    }),
    post('j2', 'u2', '2026-05-03T19:30:00Z', {
      learned: 'Escrever testes antes de refatorar mostra o comportamento atual, inclusive os bugs.',
      applied: 'Testei o cálculo de frete antes de mexer nele e encontrei dois bugs antigos: peso arredondado errado e CEP de outro estado ignorado.',
      objectiveProgress: 'a-lot',
      learningId: 'a3',
      shownOnProfile: true,
    }),
    post('j1', 'u2', '2026-08-12T20:15:00Z', {
      learned: 'Tarefas lentas, como enviar e-mail, não devem rodar dentro da requisição do usuário.',
      applied: 'Movi o envio de e-mail do checkout de um cliente para uma fila com três tentativas e aprendi a olhar a failed_jobs antes de culpar o SMTP.',
      objectiveProgress: 'very-much',
      learningId: 'a2',
      shownOnProfile: true,
    }),
    post('p1', 'u1', '2026-10-02T13:10:00Z', {
      learned: 'Filas no Laravel com retry e backoff: um job que falha não precisa derrubar o resto.',
      applied: 'Mudei o envio de e-mails do Hub para uma fila com 3 tentativas e espera crescente.',
      objectiveProgress: 'a-lot',
    }),
    post('p2', 'u2', '2026-10-20T18:42:00Z', {
      learned: 'Como o leitor de tela anuncia mudanças com aria-live, e quando polite basta.',
      applied: 'Coloquei a mensagem de erro do meu formulário de contato numa região aria-live.',
      objectiveProgress: 'very-much',
      shownOnProfile: true,
      collectionIds: ['c2'],
      reactions: [reacted('u1', 'helped', '2026-10-21T10:00:00Z'), reacted('u3', 'want-to-learn', '2026-10-22T10:00:00Z')],
      editedAt: '2026-10-21T09:10:00Z',
      revisions: [
        {
          learned: 'Como o leitor de tela anuncia mudanças com aria-live.',
          applied: 'Coloquei a mensagem de erro do meu formulário de contato numa região aria-live.',
          objectiveProgress: 'very-much',
          replacedAt: '2026-10-21T09:10:00Z',
        },
      ],
    }),
    post('p3', 'u3', '2026-10-28T22:05:00Z', {
      learned: 'A diferença entre interface e classe abstrata em Java, na prática.',
      applied: 'Refiz o exercício de pagamentos com uma interface e duas implementações.',
      objectiveProgress: 'little',
    }),
    post('p4', 'u2', '2026-11-04T11:30:00Z', {
      learned: 'Ainda não entendi bem quando usar useEffect. Li a página "You might not need an effect".',
      applied: 'Tirei dois efeitos que só copiavam props para state no meu projeto de estudo.',
      objectiveProgress: 'little',
      sharedOnFeed: false,
      collectionIds: ['c1'],
    }),
    post('p5', 'u1', '2026-11-12T09:15:00Z', {
      learned: 'Índices compostos no MySQL: a ordem das colunas muda quais consultas o índice atende.',
      applied: 'Inverti a ordem de um índice e a consulta de membros caiu de 900ms para 12ms.',
      objectiveProgress: 'a-lot',
    }),
    post('p6', 'u2', '2026-11-16T20:00:00Z', {
      learned: 'Testes de componente com Testing Library: buscar pelo papel e não pela classe.',
      applied: 'Reescrevi os testes do meu formulário para usar getByRole.',
      objectiveProgress: 'none',
      shownOnProfile: true,
      collectionIds: ['c1'],
      showReactionCounts: true,
      reactions: [
        reacted('u1', 'helped', '2026-11-17T09:00:00Z'),
        reacted('u3', 'learning-too', '2026-11-17T12:00:00Z'),
        reacted('u4', 'helped', '2026-11-18T08:00:00Z'),
      ],
    }),
    // Publications that share members' projects; their text lives in memberProjects.
    post('pp3', 'u8', '2026-11-16T10:00:00Z', { learned: '', applied: '', objectiveProgress: 'none', projectId: 'mp3' }),
    post('pp2', 'u2', '2026-11-19T20:00:00Z', {
      learned: '',
      applied: '',
      objectiveProgress: 'none',
      projectId: 'mp2',
      shownOnProfile: true,
      reactions: [reacted('u9', 'inspiring', '2026-11-20T09:00:00Z'), reacted('u3', 'want-to-learn', '2026-11-20T11:00:00Z')],
    }),
    post('pp1', 'u9', '2026-11-21T08:00:00Z', {
      learned: '',
      applied: '',
      objectiveProgress: 'none',
      projectId: 'mp1',
      reactions: [reacted('u8', 'learning-too', '2026-11-21T09:00:00Z')],
    }),
  ],
  feedCollections: [
    { id: 'c1', userId: 'u2', name: 'Testes no front-end', createdAt: '2026-11-04T11:30:00Z' },
    { id: 'c2', userId: 'u2', name: 'Acessibilidade', createdAt: '2026-10-20T18:42:00Z' },
  ],
  feedBookmarks: [{ userId: 'u2', postId: 'p5', createdAt: '2026-11-13T08:00:00Z' }],
  feedComments: [
    {
      id: 'fc1',
      postId: 'p6',
      userId: 'u3',
      body: 'Boa! Eu ainda uso classe nos meus testes. Vou trocar.',
      createdAt: '2026-11-17T12:05:00Z',
      deletedAt: null,
      removal: null,
    },
    {
      id: 'fc2',
      postId: 'p6',
      userId: 'u1',
      body: 'O getByRole também ajuda na acessibilidade: se o teste não acha o botão, o leitor de tela também não acha.',
      createdAt: '2026-11-18T09:30:00Z',
      deletedAt: null,
      removal: null,
    },
  ],
  memberProjects: [
    {
      id: 'mp1',
      userId: 'u9',
      repository: { fullName: 'diego-ramos/fila-zero', url: 'https://github.com/diego-ramos/fila-zero' },
      pitch: 'Comecei o Fila Zero para acabar com a fila na porta da clínica da minha mãe. Hoje três clínicas usam.',
      read: REPOSITORIES['diego-ramos/fila-zero'],
      repositoryStatus: 'available',
      readAt: '2026-11-21T08:00:00Z',
      createdAt: '2026-11-21T08:00:00Z',
      revisions: [],
    },
    {
      id: 'mp2',
      userId: 'u2',
      repository: { fullName: 'ana-souza/caderno-de-estudos', url: 'https://github.com/ana-souza/caderno-de-estudos' },
      pitch: 'Fiz o caderno que eu queria ter quando comecei: anotação por tema e um lembrete para revisar no dia certo.',
      read: REPOSITORIES['ana-souza/caderno-de-estudos'],
      repositoryStatus: 'available',
      readAt: '2026-11-19T20:00:00Z',
      createdAt: '2026-11-19T20:00:00Z',
      revisions: [],
    },
    {
      id: 'mp3',
      userId: 'u8',
      repository: { fullName: 'marina-duarte/acessa-form', url: 'https://github.com/marina-duarte/acessa-form' },
      pitch: 'Componentes de formulário que funcionam com leitor de tela, para usar nos projetos dos squads.',
      read: REPOSITORIES['marina-duarte/acessa-form'],
      repositoryStatus: 'available',
      readAt: '2026-11-16T10:00:00Z',
      createdAt: '2026-11-16T10:00:00Z',
      revisions: [],
    },
  ],
  feedAnnouncements: [
    {
      id: 'an1',
      authorId: 'u1',
      title: 'O Feed agora é a página inicial do Hub',
      body: 'Compartilhe aprendizados e divulgue seus projetos. Para tirar dúvidas ou pedir uma opinião sobre o código, abra uma discussão no Fórum e vincule seu projeto.',
      createdAt: '2026-11-18T12:00:00Z',
      pinnedAt: '2026-11-18T12:00:00Z',
    },
  ],
  homeBanners: [
    {
      id: 'b1',
      kind: 'notice',
      partner: null,
      text: 'O material do teste de entrada dos squads está publicado.',
      link: { label: 'Ver o teste de entrada', url: '/app/squads/entry-test' },
      active: true,
      createdAt: '2026-11-17T12:00:00Z',
    },
    {
      // Placeholder for layout only: never a real partner in seed data.
      id: 'b2',
      kind: 'partner',
      partner: 'Empresa Exemplo',
      text: 'Anúncio de exemplo de um parceiro da comunidade.',
      link: { label: 'Saiba mais', url: 'https://example.com' },
      active: false,
      createdAt: '2026-11-10T12:00:00Z',
    },
  ],
  events: [],
  profileRevisions: [],
  profiles: [
    {
      userId: 'u2',
      coverImageUrl: null,
      knowledge: [
        { id: 'k1', competency: 'PHP', level: 'intermediate', declaredAt: '2025-03-25', visibility: 'public' },
        { id: 'k2', competency: 'SQL', level: 'basic', declaredAt: '2025-03-25', visibility: 'public' },
        { id: 'k3', competency: 'Laravel', level: 'basic', declaredAt: '2025-11-02', visibility: 'public' },
        { id: 'k4', competency: 'React', level: 'basic', declaredAt: '2026-06-14', visibility: 'community' },
      ],
      learnings: [
        {
          id: 'a1',
          title: 'Fundamentos de PHP',
          description: 'Sintaxe, orientação a objetos e Composer.',
          origin: 'basement',
          completedAt: '2025-05-20',
          visibility: 'public',
        },
        {
          id: 'a2',
          title: 'Laravel do zero',
          description: 'Rotas, Eloquent, filas e testes com Pest.',
          origin: 'basement',
          completedAt: '2025-10-30',
          visibility: 'public',
        },
        {
          id: 'a3',
          title: 'Leitura de "Refatoração", de Martin Fowler',
          description: 'Anotei os padrões que mais uso nos meus projetos.',
          origin: 'member',
          completedAt: '2026-03-08',
          visibility: 'public',
        },
        {
          id: 'a4',
          title: 'Docker para quem desenvolve',
          description: null,
          origin: 'basement',
          completedAt: '2026-07-19',
          visibility: 'private',
        },
      ],
      experiences: [
        {
          id: 'e1',
          role: 'Analista de suporte técnico',
          organization: 'Provedor de internet regional',
          description: 'Atendimento de nível 2 e scripts em Bash para diagnóstico de conexões.',
          startedAt: '2021-02-01',
          endedAt: '2025-08-31',
          visibility: 'public',
        },
        {
          id: 'e2',
          role: 'Desenvolvedora freelancer',
          organization: 'Projetos próprios',
          description: 'Sites e sistemas pequenos em Laravel para comércios do bairro.',
          startedAt: '2025-09-01',
          endedAt: null,
          visibility: 'public',
        },
      ],
      articles: [
        {
          id: 'r1',
          title: 'Como uma fila no Laravel destravou o checkout de um cliente',
          summary: 'O envio de e-mail travava a compra. O que mudei, o que deu errado e como passei a ler o failed_jobs.',
          url: 'https://dev.to/ana-souza-dev/fila-laravel-checkout',
          source: 'dev.to',
          publishedAt: '2026-08-14',
          visibility: 'public',
        },
        {
          id: 'r2',
          title: 'Pest para quem nunca escreveu um teste',
          summary: 'Testei o cálculo de frete antes de refatorar e encontrei dois bugs antigos.',
          url: 'https://dev.to/ana-souza-dev/pest-primeiros-testes',
          source: 'dev.to',
          publishedAt: '2026-05-10',
          visibility: 'public',
        },
        {
          id: 'r3',
          title: 'Anotações sobre EXPLAIN no MySQL',
          summary: null,
          url: 'https://dev.to/ana-souza-dev/explain-mysql',
          source: 'dev.to',
          publishedAt: '2026-04-22',
          visibility: 'private',
        },
      ],
      evidences: [
        {
          id: 'v1',
          kind: 'pull-request',
          repository: 'ana-souza-dev/loja-bairro',
          ref: '12',
          title: 'Move o envio de e-mail do checkout para uma fila',
          context: 'O checkout travava quando o servidor de e-mail demorava. Movi o envio para uma fila com retry, e a compra deixou de esperar.',
          url: 'https://github.com/ana-souza-dev/loja-bairro/pull/12',
          date: '2026-08-10',
          projectId: null,
          visibility: 'public',
        },
        {
          id: 'v2',
          kind: 'commit',
          repository: 'ana-souza-dev/frete-calc',
          ref: '3f9c2a1',
          title: 'Adiciona testes do cálculo de frete antes da refatoração',
          context: 'Escrevi testes com Pest antes de refatorar o cálculo de frete. Eles acharam dois bugs antigos, que corrigi primeiro.',
          url: 'https://github.com/ana-souza-dev/frete-calc/commit/3f9c2a1',
          date: '2026-05-02',
          projectId: null,
          visibility: 'public',
        },
        {
          id: 'v3',
          kind: 'repository',
          repository: 'ana-souza-dev/scripts-suporte',
          ref: null,
          title: 'Scripts de diagnóstico de conexão',
          context: 'Scripts em Bash que eu criei no suporte para diagnosticar a conexão dos clientes. Foi onde comecei a programar.',
          url: 'https://github.com/ana-souza-dev/scripts-suporte',
          date: '2023-06-15',
          projectId: null,
          visibility: 'public',
        },
        {
          id: 'v4',
          kind: 'commit',
          repository: 'ana-souza-dev/docker-estudos',
          ref: '9b01e7c',
          title: 'Primeiro docker-compose com PHP e MySQL',
          context: 'Ambiente de estudo do curso de Docker.',
          url: 'https://github.com/ana-souza-dev/docker-estudos/commit/9b01e7c',
          date: '2026-07-15',
          projectId: null,
          visibility: 'private',
        },
        {
          id: 'v5',
          kind: 'pull-request',
          repository: 'he4rt/loja-comunitaria',
          ref: '34',
          title: 'Envia os e-mails do pedido por uma fila com retry',
          context: 'Levei para a loja do squad a fila que fiz no checkout de um cliente. Os pedidos não travam mais quando o e-mail falha.',
          url: 'https://github.com/he4rt/loja-comunitaria/pull/34',
          date: '2026-10-18',
          projectId: 'p1',
          visibility: 'public',
        },
      ],
    },
    {
      userId: 'u3',
      coverImageUrl: null,
      knowledge: [{ id: 'k5', competency: 'HTML e CSS', level: 'basic', declaredAt: '2026-10-28', visibility: 'public' }],
      learnings: [],
      experiences: [],
      articles: [],
      evidences: [],
    },
    {
      userId: 'u6',
      coverImageUrl: null,
      knowledge: [],
      learnings: [],
      experiences: [
        {
          id: 'e9',
          role: 'Engenheiro de software',
          organization: 'Empresa Exemplo',
          description: null,
          startedAt: '2022-04-01',
          endedAt: null,
          visibility: 'public',
        },
      ],
      articles: [],
      evidences: [],
    },
  ],
  achievementChoices: [
    ...['git-init', 'remote-added', 'profile-complete', 'first-record', 'basement-student', 'dear-diary', 'on-display', 'merged', 'in-squad', 'first-delivery', 'technical-delivery', 'pair-programming', 'one-year-hub'].map((key) => ({ userId: 'u2', key })),
    ...['git-init', 'remote-added', 'in-squad', 'captain', 'code-review', 'one-year-hub'].map((key) => ({ userId: 'u6', key })),
    ...['validator', 'first-validation-given'].map((key) => ({ userId: 'u9', key })),
  ],
  discussions: [
    {
      id: 'project-help-pp1',
      title: 'Como medir as faltas no Fila Zero?',
      category: 'question',
      authorId: 'u9',
      body: 'Quero medir quem falta sem avisar, mas não sei se a consulta de check-in está contando certo. Alguém pode olhar a consulta e o painel de métricas?',
      createdAt: '2026-11-21T08:00:00Z',
      context: { type: 'post', id: 'pp1' },
      replies: [
        {
          id: 'project-comment-fc3', authorId: 'u8',
          body: 'Olhei a consulta: ela conta como falta quem cancelou depois do horário. Vale separar cancelamento tardio de falta.',
          createdAt: '2026-11-21T10:15:00Z',
        },
        {
          id: 'project-comment-fc4', authorId: 'u9',
          body: 'Faz sentido! Vou abrir uma issue para isso. Obrigado, Marina.',
          createdAt: '2026-11-21T11:02:00Z',
        },
      ],
      solvedReplyId: null,
    },
    {
      id: 'project-help-pp3',
      title: 'Como testar o select do Acessa Form com leitor de tela?',
      category: 'question',
      authorId: 'u8',
      body: 'Preciso de alguém que use leitor de tela no dia a dia para testar a mensagem de erro do select.',
      createdAt: '2026-11-16T10:00:00Z',
      context: { type: 'post', id: 'pp3' },
      replies: [],
      solvedReplyId: null,
    },
    {
      id: 't1',
      title: 'Como ser avisada quando a fila do Laravel para?',
      category: 'question',
      authorId: 'u2',
      body: 'Movi os e-mails de um checkout para uma fila com retry e aprendi a olhar a tabela failed_jobs. O que ainda não sei: como descobrir que o worker parou antes de o cliente reclamar. Vocês usam alguma notificação?',
      createdAt: '2026-08-13T14:20:00Z',
      context: { type: 'post', id: 'j1' },
      replies: [
        {
          id: 'r1',
          authorId: 'u6',
          body: 'Para job que falhou, o Queue::failing no AppServiceProvider já resolve: ele recebe o JobFailed e você manda o aviso. Para fila parada, o Horizon tem limite de espera por fila e avisa por e-mail ou Slack quando a espera passa dele.',
          createdAt: '2026-08-13T18:02:00Z',
        },
        {
          id: 'r2',
          authorId: 'u2',
          body: 'Configurei o limite de espera do Horizon em 60 segundos e parei o worker para testar. O aviso chegou em um minuto. Vou registrar isso na trajetória.',
          createdAt: '2026-08-15T11:40:00Z',
        },
      ],
      solvedReplyId: 'r1',
    },
    {
      id: 't2',
      title: 'Como testar a integração com os Correios sem deixar o teste lento?',
      category: 'question',
      authorId: 'u2',
      body: 'Testei o cálculo de frete com Pest e achei dois bugs. Agora quero testar a chamada aos Correios, mas cada teste leva segundos e às vezes a API cai.',
      createdAt: '2026-05-04T21:10:00Z',
      context: { type: 'post', id: 'j2' },
      replies: [
        {
          id: 'r3',
          authorId: 'u7',
          body: 'No Laravel, o Http::fake() devolve uma resposta fixa sem sair para a rede. Guardo uma resposta real dos Correios num arquivo e uso ela no fake.',
          createdAt: '2026-05-06T09:30:00Z',
        },
      ],
      solvedReplyId: null,
    },
    {
      id: 't3',
      title: 'Fila ou evento síncrono para os e-mails do pedido?',
      category: 'technical',
      authorId: 'u6',
      body: 'Antes de começar a entrega dos e-mails, quero alinhar: mandamos na mesma requisição, com evento síncrono, ou já usamos fila? A fila exige worker no ambiente de demonstração.',
      createdAt: '2026-10-10T13:00:00Z',
      context: { type: 'project', id: 'p1' },
      replies: [
        {
          id: 'r4',
          authorId: 'u2',
          body: 'Fila. Num cliente meu o checkout travava quando o servidor de e-mail demorava. O worker roda no mesmo container com o Supervisor.',
          createdAt: '2026-10-10T16:45:00Z',
        },
        {
          id: 'r5',
          authorId: 'u7',
          body: 'Concordo. Só peço uma mensagem na tela dizendo que o e-mail pode levar alguns minutos.',
          createdAt: '2026-10-12T10:05:00Z',
        },
      ],
      solvedReplyId: null,
    },
    {
      id: 't4',
      title: 'Como rodar o projeto localmente no Windows?',
      category: 'question',
      authorId: 'u3',
      body: 'Clonei a loja-comunitaria, mas o docker compose up para no container do PHP com erro de fim de linha no entrypoint.sh. Alguém já passou por isso?',
      createdAt: '2026-11-16T22:15:00Z',
      context: { type: 'project', id: 'p1' },
      replies: [],
      solvedReplyId: null,
    },
    {
      id: 't5',
      title: 'Ideias para o próximo projeto da Loja Comunitária',
      category: 'technical',
      authorId: 'u6',
      body: 'O checkout deve fechar em dezembro. Para o próximo projeto, pensei em um painel para o comerciante acompanhar os pedidos. Outras ideias?',
      createdAt: '2026-11-05T12:00:00Z',
      context: { type: 'squad', id: 's1' },
      replies: [
        {
          id: 'r6',
          authorId: 'u7',
          body: 'Painel faz sentido. Dá para começar só com a lista de pedidos do dia e o status de cada um.',
          createdAt: '2026-11-06T08:20:00Z',
        },
      ],
      solvedReplyId: null,
    },
    {
      id: 't6',
      title: 'Como vocês organizam as anotações de estudo?',
      category: 'learning',
      authorId: 'u1',
      body: 'Vejo muita gente perdendo o que estudou porque as anotações ficam espalhadas. Como vocês guardam o que aprenderam para conseguir mostrar depois?',
      createdAt: '2026-09-20T15:00:00Z',
      context: null,
      replies: [
        {
          id: 'r7',
          authorId: 'u2',
          body: 'Uma nota por coisa que apliquei de verdade: o que aprendi, onde usei e o que ainda não sei. O que não apliquei fica numa lista de estudo, separado.',
          createdAt: '2026-09-21T10:00:00Z',
        },
      ],
      solvedReplyId: null,
    },
  ],
  ...squadsSeed,
}

/** The seed, also loaded into the API's database. */
export const seedState = seed

/**
 * What the signed-in user can see, as the API sent it (src/mocks/api.ts). Starts as the seed until
 * the first state arrives; reset it from the debug sidebar.
 */
export const db = createStore(seed)

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
