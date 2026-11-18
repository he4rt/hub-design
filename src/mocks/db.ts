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

/*
 * Public profile records. Every record has `isPublic`: it shows on the public
 * profile only when the member chose to publish it.
 */

export type DeclaredKnowledge = {
  id: string
  competency: string
  level: 'basic' | 'intermediate' | 'advanced'
  declaredAt: string
  isPublic: boolean
}

export type LearningRecord = {
  id: string
  title: string
  description: string | null
  origin: 'member' | 'basement'
  completedAt: string
  isPublic: boolean
}

export type ExperienceRecord = {
  id: string
  role: string
  organization: string
  description: string | null
  startedAt: string
  endedAt: string | null
  isPublic: boolean
}

/** An article the member wrote outside the Hub, such as on dev.to. */
export type Article = {
  id: string
  title: string
  summary: string | null
  url: string
  source: 'dev.to'
  publishedAt: string
  isPublic: boolean
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
  isPublic: boolean
}

/**
 * Learning journal post (the Feed): what the member learned and how they applied it.
 * Every post belongs to a learning record and shows inside it, like the body of a commit message.
 */
export type JournalPost = {
  id: string
  title: string
  publishedAt: string
  learned: string
  applied: string
  body: string
  learningId: string
  isPublic: boolean
}

/** Public profile of a member (Fundação stage: no squads, validations, or XP yet). */
export type MemberProfile = {
  userId: string
  handle: string
  bio: string | null
  /** Longer "Sobre mim", shown as the profile's README. Paragraphs are separated by a blank line. */
  readme: string | null
  currentFocus: string | null
  areas: string[]
  stacks: string[]
  links: { id: string; label: string; url: string }[]
  knowledge: DeclaredKnowledge[]
  learnings: LearningRecord[]
  experiences: ExperienceRecord[]
  articles: Article[]
  evidences: TechnicalEvidence[]
  journalPosts: JournalPost[]
  /**
   * Journey stage milestones. Declared in the seed until squads and validation have member
   * records in the mock; then the backend computes them (docs/achievements/entities.md).
   */
  journey: MemberJourney
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

/** Achievement a member unlocked (docs/achievements/entities.md). Computed by the platform, never edited. */
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

/** A project team in the He4rt organization on GitHub, led by a captain. Never closed, only inactive. */
export type Squad = {
  id: string
  slug: string
  name: string
  description: string
  captainId: string
  status: 'active' | 'inactive'
}

/** A member's place in a squad project, kept apart from what the team did. */
export type ProjectParticipant = {
  userId: string
  role: string
  /** What this member answered for, as the captain registered it. */
  responsibilities: string
  joinedAt: string
  /** The member chose to show this participation on their public profile. */
  shownOnProfile: boolean
}

/** Commit or pull request in the project's repository, with its author. */
export type ProjectEvidence = {
  id: string
  kind: 'commit' | 'pull-request'
  /** Short commit hash or pull request number. */
  ref: string
  title: string
  authorId: string
  date: string
  url: string
}

/** Work the squad accepted or is reviewing, credited to the members who did it. */
export type Delivery = {
  id: string
  title: string
  description: string
  memberIds: string[]
  status: 'accepted' | 'in-review'
  date: string
  evidenceIds: string[]
}

/** One project of a squad: the squad log keeps it for good, project by project. */
export type SquadProject = {
  id: string
  squadId: string
  slug: string
  name: string
  description: string
  /** Repository under the He4rt organization, such as `he4rt/loja-comunitaria`. */
  repository: string
  startedAt: string
  endedAt: string | null
  participants: ProjectParticipant[]
  deliveries: Delivery[]
  evidences: ProjectEvidence[]
}

export type DiscussionCategory = 'question' | 'technical' | 'learning'

/** What a discussion is about: a squad, a squad project, or one of the author's journal posts. */
export type DiscussionContext = { type: 'squad' | 'project' | 'journal-post'; id: string }

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

/** How much a learning got the member closer to the objective. A label, never a score. */
export type ObjectiveProgress = 'none' | 'little' | 'a-lot' | 'very-much'

/**
 * Publication of the learning diary. It is a record of its author's trajectory:
 * it always exists for the author, and goes to the community Feed or the public
 * profile only when the author chooses. The text is never edited.
 */
export type FeedPost = {
  id: string
  userId: string
  learned: string
  applied: string
  objectiveProgress: ObjectiveProgress
  /** Members see it in the Feed. On by default in the form. */
  sharedOnFeed: boolean
  /** Visitors see it in the public profile, when the profile is published. Off by default. */
  shownOnProfile: boolean
  createdAt: string
  /** Deleted by the author: gone for every member, kept for moderation and audit. */
  deletedAt: string | null
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
  /** What PostHog would receive, newest first. */
  events: AnalyticsEvent[]
  profiles: MemberProfile[]
  squads: Squad[]
  projects: SquadProject[]
  discussions: Discussion[]
  memberAchievements: MemberAchievement[]
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

const post = (
  id: string,
  userId: string,
  createdAt: string,
  fields: Pick<FeedPost, 'learned' | 'applied' | 'objectiveProgress'> & Partial<FeedPost>,
): FeedPost => ({ id, userId, createdAt, sharedOnFeed: true, shownOnProfile: false, deletedAt: null, ...fields })

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
      bio: 'Capitão do squad Loja Comunitária.',
      published: true,
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
    }),
  ],
  passwords: {
    u1: DEMO_PASSWORD,
    u2: DEMO_PASSWORD,
    u3: DEMO_PASSWORD,
    u4: DEMO_PASSWORD,
    u5: DEMO_PASSWORD,
    u6: DEMO_PASSWORD,
    u7: DEMO_PASSWORD,
  },
  passwordResets: [],
  pendingSocialSignUp: null,
  pendingSocialLink: null,
  session: null,
  adminSession: null,
  feedPosts: [
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
    }),
  ],
  events: [],
  profiles: [
    {
      userId: 'u2',
      handle: 'ana-souza',
      bio: 'Quatro anos no suporte técnico, onde comecei a automatizar tarefas com scripts. Hoje estudo PHP e Laravel e faço sistemas pequenos para comércios do bairro.',
      readme:
        'Passei quatro anos no suporte técnico de um provedor de internet e foi lá que comecei a automatizar tarefas com scripts em Bash.\n\nHoje estudo PHP e Laravel e faço sistemas pequenos para comércios do bairro. Quero trabalhar com back-end em um time que revise código junto.\n\nGosto de entender por que algo quebrou antes de corrigir. É o que mais aparece nas minhas notas do diário.',
      currentFocus: 'Filas e testes de integração em Laravel',
      areas: ['Back-end', 'Front-end'],
      stacks: ['PHP', 'Laravel', 'MySQL', 'TypeScript', 'React', 'Docker'],
      links: [
        { id: 'l1', label: 'GitHub', url: 'https://github.com/ana-souza-dev' },
        { id: 'l2', label: 'dev.to', url: 'https://dev.to/ana-souza-dev' },
        { id: 'l3', label: 'LinkedIn', url: 'https://www.linkedin.com/in/ana-souza-dev' },
      ],
      knowledge: [
        { id: 'k1', competency: 'PHP', level: 'intermediate', declaredAt: '2025-03-25', isPublic: true },
        { id: 'k2', competency: 'SQL', level: 'basic', declaredAt: '2025-03-25', isPublic: true },
        { id: 'k3', competency: 'Laravel', level: 'basic', declaredAt: '2025-11-02', isPublic: true },
        { id: 'k4', competency: 'React', level: 'basic', declaredAt: '2026-06-14', isPublic: true },
      ],
      learnings: [
        {
          id: 'a1',
          title: 'Fundamentos de PHP',
          description: 'Sintaxe, orientação a objetos e Composer.',
          origin: 'basement',
          completedAt: '2025-05-20',
          isPublic: true,
        },
        {
          id: 'a2',
          title: 'Laravel do zero',
          description: 'Rotas, Eloquent, filas e testes com Pest.',
          origin: 'basement',
          completedAt: '2025-10-30',
          isPublic: true,
        },
        {
          id: 'a3',
          title: 'Leitura de "Refatoração", de Martin Fowler',
          description: 'Anotei os padrões que mais uso nos meus projetos.',
          origin: 'member',
          completedAt: '2026-03-08',
          isPublic: true,
        },
        {
          id: 'a4',
          title: 'Docker para quem desenvolve',
          description: null,
          origin: 'basement',
          completedAt: '2026-07-19',
          isPublic: false,
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
          isPublic: true,
        },
        {
          id: 'e2',
          role: 'Desenvolvedora freelancer',
          organization: 'Projetos próprios',
          description: 'Sites e sistemas pequenos em Laravel para comércios do bairro.',
          startedAt: '2025-09-01',
          endedAt: null,
          isPublic: true,
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
          isPublic: true,
        },
        {
          id: 'r2',
          title: 'Pest para quem nunca escreveu um teste',
          summary: 'Testei o cálculo de frete antes de refatorar e encontrei dois bugs antigos.',
          url: 'https://dev.to/ana-souza-dev/pest-primeiros-testes',
          source: 'dev.to',
          publishedAt: '2026-05-10',
          isPublic: true,
        },
        {
          id: 'r3',
          title: 'Anotações sobre EXPLAIN no MySQL',
          summary: null,
          url: 'https://dev.to/ana-souza-dev/explain-mysql',
          source: 'dev.to',
          publishedAt: '2026-04-22',
          isPublic: false,
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
          isPublic: true,
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
          isPublic: true,
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
          isPublic: true,
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
          isPublic: false,
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
          isPublic: true,
        },
      ],
      journalPosts: [
        {
          id: 'j1',
          title: 'Entendi filas no Laravel quebrando um sistema',
          publishedAt: '2026-08-12',
          learned: 'Tarefas lentas, como enviar e-mail, não devem rodar dentro da requisição do usuário.',
          applied: 'Movi o envio de e-mail do checkout de um cliente para uma fila com retry.',
          body: 'O checkout de uma loja travava sempre que o servidor de e-mail demorava. Movi o envio para uma fila com três tentativas e aprendi a olhar a tabela failed_jobs antes de culpar o SMTP. O que ainda não sei: como ser avisada quando a fila para. É o próximo passo.',
          learningId: 'a2',
          isPublic: true,
        },
        {
          id: 'j2',
          title: 'Primeiros testes com Pest num projeto real',
          publishedAt: '2026-05-03',
          learned: 'Escrever testes antes de refatorar mostra o comportamento atual, inclusive os bugs.',
          applied: 'Testei o cálculo de frete antes de mexer nele e encontrei dois bugs antigos.',
          body: 'Comecei com três casos de frete que eu sabia calcular de cabeça. Dois falharam: o código arredondava errado o peso e ignorava o CEP de outro estado. Corrigi os dois antes de refatorar. Ainda não sei testar a integração com os Correios sem deixar o teste lento.',
          learningId: 'a3',
          isPublic: true,
        },
        {
          id: 'j4',
          title: 'Dúvida sobre índices no MySQL',
          publishedAt: '2026-04-20',
          learned: 'Ainda não entendi como ler o EXPLAIN.',
          applied: 'Uma consulta de relatório continua lenta.',
          body: 'Uma consulta de relatório estava lenta e não entendi o resultado do EXPLAIN.',
          learningId: 'a2',
          isPublic: false,
        },
      ],
      journey: { stage: 'delivered', publicStage: 'delivered', contributor: false },
    },
    {
      userId: 'u3',
      handle: 'bruno-lima',
      bio: null,
      readme: null,
      currentFocus: null,
      areas: ['Front-end'],
      stacks: ['HTML', 'CSS'],
      links: [],
      knowledge: [{ id: 'k5', competency: 'HTML e CSS', level: 'basic', declaredAt: '2026-10-28', isPublic: true }],
      learnings: [],
      experiences: [],
      articles: [],
      evidences: [],
      journalPosts: [],
      journey: { stage: 'member', publicStage: 'member', contributor: false },
    },
  ],
  squads: [
    {
      id: 's1',
      slug: 'loja-comunitaria',
      name: 'Loja Comunitária',
      description: 'Loja virtual aberta para comércios de bairro, mantida pela comunidade.',
      captainId: 'u6',
      status: 'active',
    },
    {
      id: 's2',
      slug: 'agenda-he4rt',
      name: 'Agenda He4rt',
      description: 'Agenda dos eventos e calls da comunidade.',
      captainId: 'u1',
      status: 'inactive',
    },
  ],
  projects: [
    {
      id: 'p1',
      squadId: 's1',
      slug: 'checkout',
      name: 'Checkout e pedidos',
      description:
        'Fluxo de compra da loja: carrinho, cálculo de frete, pagamento simulado e e-mails do pedido. Cada entrega passa por revisão de outro membro antes de entrar.',
      repository: 'he4rt/loja-comunitaria',
      startedAt: '2026-09-07',
      endedAt: null,
      participants: [
        {
          userId: 'u6',
          role: 'Capitão',
          responsibilities: 'Organiza as entregas, registra o contexto de cada uma e revisa os pull requests.',
          joinedAt: '2026-09-07',
          shownOnProfile: true,
        },
        {
          userId: 'u2',
          role: 'Back-end',
          responsibilities: 'Fila dos e-mails do pedido e testes do fluxo de compra.',
          joinedAt: '2026-09-14',
          shownOnProfile: true,
        },
        {
          userId: 'u7',
          role: 'Front-end',
          responsibilities: 'Carrinho e acessibilidade das telas de compra.',
          joinedAt: '2026-09-14',
          shownOnProfile: false,
        },
        {
          userId: 'u3',
          role: 'Front-end',
          responsibilities: 'Cálculo de frete na tela do checkout.',
          joinedAt: '2026-10-26',
          shownOnProfile: false,
        },
      ],
      deliveries: [
        {
          id: 'd1',
          title: 'E-mails do pedido por uma fila',
          description: 'O pedido é confirmado na hora, e os e-mails saem por uma fila com três tentativas.',
          memberIds: ['u2'],
          status: 'accepted',
          date: '2026-10-20',
          evidenceIds: ['pe1', 'pe2'],
        },
        {
          id: 'd2',
          title: 'Carrinho navegável pelo teclado',
          description: 'Carrinho usável só com teclado e com leitor de tela, revisado com o NVDA.',
          memberIds: ['u7'],
          status: 'accepted',
          date: '2026-10-28',
          evidenceIds: ['pe3'],
        },
        {
          id: 'd3',
          title: 'Frete calculado no checkout',
          description: 'O frete aparece assim que o CEP é digitado, usando o cálculo testado da Ana.',
          memberIds: ['u3', 'u2'],
          status: 'in-review',
          date: '2026-11-12',
          evidenceIds: ['pe4'],
        },
      ],
      evidences: [
        {
          id: 'pe5',
          kind: 'commit',
          ref: 'c07e1b2',
          title: 'Configura o CI com Pest e Pint',
          authorId: 'u6',
          date: '2026-09-08',
          url: 'https://github.com/he4rt/loja-comunitaria/commit/c07e1b2',
        },
        {
          id: 'pe1',
          kind: 'pull-request',
          ref: '34',
          title: 'Envia os e-mails do pedido por uma fila com retry',
          authorId: 'u2',
          date: '2026-10-18',
          url: 'https://github.com/he4rt/loja-comunitaria/pull/34',
        },
        {
          id: 'pe2',
          kind: 'commit',
          ref: 'a41c9e0',
          title: 'Testa o envio de e-mail com a fila falhando',
          authorId: 'u2',
          date: '2026-10-17',
          url: 'https://github.com/he4rt/loja-comunitaria/commit/a41c9e0',
        },
        {
          id: 'pe3',
          kind: 'pull-request',
          ref: '29',
          title: 'Carrinho navegável por teclado e leitor de tela',
          authorId: 'u7',
          date: '2026-10-27',
          url: 'https://github.com/he4rt/loja-comunitaria/pull/29',
        },
        {
          id: 'pe4',
          kind: 'pull-request',
          ref: '41',
          title: 'Calcula o frete na tela do checkout',
          authorId: 'u3',
          date: '2026-11-11',
          url: 'https://github.com/he4rt/loja-comunitaria/pull/41',
        },
      ],
    },
    {
      id: 'p0',
      squadId: 's1',
      slug: 'catalogo',
      name: 'Catálogo de produtos',
      description: 'Cadastro e busca de produtos para os comércios publicarem o que vendem.',
      repository: 'he4rt/loja-comunitaria',
      startedAt: '2026-03-02',
      endedAt: '2026-07-31',
      participants: [
        {
          userId: 'u6',
          role: 'Capitão',
          responsibilities: 'Organizou as entregas e revisou os pull requests.',
          joinedAt: '2026-03-02',
          shownOnProfile: true,
        },
        {
          userId: 'u7',
          role: 'Front-end',
          responsibilities: 'Busca de produtos e listagem por categoria.',
          joinedAt: '2026-03-09',
          shownOnProfile: false,
        },
      ],
      deliveries: [
        {
          id: 'd0',
          title: 'Busca de produtos por nome e categoria',
          description: 'Busca com filtro por categoria, sem recarregar a página.',
          memberIds: ['u7'],
          status: 'accepted',
          date: '2026-06-18',
          evidenceIds: ['pe0'],
        },
      ],
      evidences: [
        {
          id: 'pe0',
          kind: 'pull-request',
          ref: '12',
          title: 'Busca de produtos com filtro por categoria',
          authorId: 'u7',
          date: '2026-06-16',
          url: 'https://github.com/he4rt/loja-comunitaria/pull/12',
        },
      ],
    },
    {
      id: 'p9',
      squadId: 's2',
      slug: 'calendario',
      name: 'Calendário de eventos',
      description: 'Página com as calls diárias e os eventos da comunidade, com lembrete por e-mail.',
      repository: 'he4rt/agenda',
      startedAt: '2025-08-04',
      endedAt: '2025-12-15',
      participants: [
        {
          userId: 'u1',
          role: 'Capitão',
          responsibilities: 'Organizou as entregas e revisou os pull requests.',
          joinedAt: '2025-08-04',
          shownOnProfile: true,
        },
        {
          userId: 'u6',
          role: 'Back-end',
          responsibilities: 'Lembretes por e-mail e importação dos eventos.',
          joinedAt: '2025-08-11',
          shownOnProfile: true,
        },
      ],
      deliveries: [
        {
          id: 'd9',
          title: 'Lembrete por e-mail antes de cada call',
          description: 'Lembrete enviado uma hora antes, com o link da call.',
          memberIds: ['u6'],
          status: 'accepted',
          date: '2025-11-03',
          evidenceIds: ['pe9'],
        },
      ],
      evidences: [
        {
          id: 'pe9',
          kind: 'pull-request',
          ref: '7',
          title: 'Envia lembrete por e-mail uma hora antes da call',
          authorId: 'u6',
          date: '2025-11-01',
          url: 'https://github.com/he4rt/agenda/pull/7',
        },
      ],
    },
  ],
  memberAchievements: [
    ...achievementSeed('u2', [
      ['git-init', '2025-03-22', true],
      ['objective-set', '2025-03-22', true],
      ['remote-added', '2025-03-22', true],
      ['accounts-in-order', '2025-04-02', true],
      ['email-verified', '2025-03-22', false],
      ['page-live', '2025-04-02', true],
      ['about-me', '2025-04-02', true],
      ['profile-complete', '2025-04-05', true],
      ['living-resume', '2025-04-05', false],
      ['first-record', '2025-03-25', true],
      ['studying', '2025-05-20', true],
      ['basement-student', '2025-05-20', true],
      ['experience-logged', '2025-03-25', true],
      ['author', '2026-05-10', true],
      ['with-proof', '2026-05-02', true],
      ['three-months-trajectory', '2025-11-02', true],
      ['one-year-trajectory', '2026-05-20', true],
      ['dear-diary', '2026-04-20', true],
      ['shared-learning', '2026-05-03', true],
      ['on-display', '2026-05-03', true],
      ['linked-to-trajectory', '2026-05-03', true],
      ['after-class', '2026-08-12', false],
      ['pr-opened', '2026-08-28', true],
      ['merged', '2026-09-02', true],
      ['second-try', '2026-09-02', false, false],
      ['applicant', '2026-09-05', false],
      ['in-squad', '2026-09-14', true],
      ['first-delivery', '2026-10-20', true],
      ['technical-delivery', '2026-10-20', true],
      ['solo', '2026-10-20', true],
      ['readme-credit', '2026-10-22', true],
      ['thirty-days-squad', '2026-10-20', true],
      ['course-to-squad', '2026-10-20', true],
      ['first-week', '2026-09-28', false],
      ['one-month-hub', '2025-04-22', true],
      ['six-months-hub', '2025-09-22', true],
      ['one-year-hub', '2026-03-22', true],
    ]),
    {
      id: 'ma-u2-event',
      userId: 'u2',
      key: 'he4rt-event',
      unlockedAt: '2026-07-12',
      source: 'administration',
      grantReason: 'Entregou a fila de inscrições no Hacktoberfest He4rt 2026.',
      originPublic: true,
      isPublic: true,
      revokedAt: null,
    },
    ...achievementSeed('u3', [['git-init', '2025-06-05', true]]),
  ],
  discussions: [
    {
      id: 't1',
      title: 'Como ser avisada quando a fila do Laravel para?',
      category: 'question',
      authorId: 'u2',
      body: 'Movi os e-mails de um checkout para uma fila com retry e aprendi a olhar a tabela failed_jobs. O que ainda não sei: como descobrir que o worker parou antes de o cliente reclamar. Vocês usam alguma notificação?',
      createdAt: '2026-08-13T14:20:00Z',
      context: { type: 'journal-post', id: 'j1' },
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
      context: { type: 'journal-post', id: 'j2' },
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
}

/** Seed helper: `[key, unlockedAt, isPublic, originPublic = true]` per achievement. */
function achievementSeed(userId: string, rows: [string, string, boolean, boolean?][]): MemberAchievement[] {
  return rows.map(([key, unlockedAt, isPublic, originPublic = true]) => ({
    id: `ma-${userId}-${key}`,
    userId,
    key,
    unlockedAt,
    source: 'platform',
    grantReason: null,
    originPublic,
    isPublic,
    revokedAt: null,
  }))
}

/** The fake backend. Persisted in localStorage; reset it from the debug sidebar. */
export const db = createStore(seed, { persist: 'he4rt:mock-db:v7' })

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
