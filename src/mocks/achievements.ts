import type { JourneyStage, MemberAchievement, MemberJourney, MockDb } from './db'

/*
 * Achievement catalog (docs/achievements/spec.md). Backend configuration, the
 * same for every member, so it lives outside the persisted mock state.
 */

export type AchievementGroup =
  | 'arrival'
  | 'trajectory'
  | 'diary'
  | 'entry-test'
  | 'squads'
  | 'validation'
  | 'community'
  | 'tenure'
  | 'market'
  | 'manual'

export type AchievementDefinition = {
  /** Stable id, such as `git-init`. */
  key: string
  /** Position in the catalog, 1 to 86. */
  number: number
  group: AchievementGroup
  name: string
  /** How it unlocks, in the member's words. */
  description: string
  /** Event that triggers the check; null for derived and manual ones. */
  event: string | null
  stage: 'foundation' | 'squads' | 'jobs' | 'manual' | 'later'
  /** Milestone the access checklist repeats. Never read by access rules. */
  access: 'floor' | 'job' | 'decision' | 'none'
  /** Follows the visibility of the record that unlocked it. */
  private: boolean
  /** Granted by the administration only. */
  manual: boolean
  /** Short mark drawn on the medal. */
  glyph: string
}

type Options = Partial<Pick<AchievementDefinition, 'event' | 'stage' | 'access' | 'private' | 'manual'>>

function def(
  number: number,
  key: string,
  group: AchievementGroup,
  glyph: string,
  name: string,
  description: string,
  options: Options = {},
): AchievementDefinition {
  return {
    key,
    number,
    group,
    glyph,
    name,
    description,
    event: null,
    stage: 'foundation',
    access: 'none',
    private: false,
    manual: false,
    ...options,
  }
}

const squads = { stage: 'squads' } as const
const manual = { stage: 'manual', manual: true } as const

export const achievementCatalog: AchievementDefinition[] = [
  // 1. Arrival and identity
  def(1, 'git-init', 'arrival', 'init', 'git init', 'Concluiu as perguntas do cadastro.', { event: 'onboarding_completed' }),
  def(2, 'profile-complete', 'arrival', '100%', 'Perfil completo', 'Completou o perfil pela primeira vez.', { event: 'profile_completed' }),
  def(3, 'remote-added', 'arrival', 'gh', 'Remote adicionado', 'Vinculou a conta do GitHub.', { event: 'account_linked' }),
  def(4, 'accounts-in-order', 'arrival', 'g+in', 'Contas em ordem', 'Vinculou o GitHub e o LinkedIn.', { event: 'account_linked' }),
  def(5, 'email-verified', 'arrival', '@', 'E-mail confirmado', 'Confirmou o e-mail da conta.', { event: 'email_verified' }),
  def(6, 'page-live', 'arrival', 'www', 'Página no ar', 'Publicou o perfil pela primeira vez.', { event: 'profile_published' }),
  def(7, 'about-me', 'arrival', 'md', 'Sobre mim', 'Escreveu o texto "Sobre" do perfil.', { event: 'profile_about_saved' }),
  def(8, 'living-resume', 'arrival', 'url', 'Currículo vivo', 'Copiou o link do perfil público pela primeira vez.', { event: 'profile_link_copied' }),
  def(9, 'objective-set', 'arrival', '→', 'Objetivo definido', 'Escolheu o objetivo e uma área.', { event: 'onboarding_step_completed' }),

  // 2. Trajectory
  def(10, 'first-record', 'trajectory', 'c1', 'Primeiro commit da trajetória', 'Fez o primeiro registro na trajetória.', { event: 'trajectory_record_added' }),
  def(11, 'studying', 'trajectory', 'std', 'Estudando', 'Registrou a primeira aprendizagem.', { event: 'trajectory_record_added', private: true }),
  def(12, 'basement-student', 'trajectory', 'bsm', 'Aluno da Basement', 'Concluiu o primeiro curso na Basement.', { event: 'trajectory_record_added', private: true }),
  def(13, 'experience-logged', 'trajectory', 'exp', 'Experiência no log', 'Registrou a primeira experiência.', { event: 'trajectory_record_added' }),
  def(14, 'author', 'trajectory', 'art', 'Autor', 'Levou o primeiro artigo para a trajetória.', { event: 'trajectory_record_added' }),
  def(15, 'with-proof', 'trajectory', '#', 'Com prova', 'Ligou a primeira evidência técnica a um registro.', { event: 'trajectory_record_added' }),
  def(16, 'course-to-squad', 'trajectory', '⇢', 'Do curso ao squad', 'Fez um curso e teve uma entrega aceita na mesma competência.', { ...squads, access: 'job', private: true }),
  def(17, 'full-strength', 'trajectory', '▲4', 'Força máxima', 'Uma competência declarada, registrada, demonstrada e validada.', { ...squads, access: 'job', private: true }),
  def(18, 'five-records', 'trajectory', '5/5', 'Os cinco registros', 'Tem os cinco tipos de registro na trajetória.', { ...squads, private: true }),
  def(19, 'three-fronts', 'trajectory', '3x', 'Em três frentes', 'Tem evidência em três competências diferentes.', { ...squads, access: 'job' }),
  def(20, 'positive-diff', 'trajectory', '+', 'Diff positivo', 'Uma competência subiu de força na trajetória.', squads),
  def(21, 'three-months-trajectory', 'trajectory', '3m', 'Três meses de trajetória', 'Fez registros em três meses diferentes.', { access: 'decision' }),
  def(22, 'one-year-trajectory', 'trajectory', '1a', 'Um ano de trajetória', 'Tem registros com um ano de distância.', { access: 'decision' }),
  def(23, 'release-tag', 'trajectory', 'tag', 'Tag de release', 'Marcou um ponto da trajetória como marco.', { event: 'trajectory_milestone_tagged', stage: 'later' }),

  // 3. Diary
  def(24, 'dear-diary', 'diary', '✎', 'Querido diário', 'Fez a primeira publicação no diário.', { event: 'feed_post_created' }),
  def(25, 'shared-learning', 'diary', '↗', 'Compartilhou o que aprendeu', 'Compartilhou uma publicação no Feed.', { event: 'feed_post_created' }),
  def(26, 'on-display', 'diary', '◰', 'Na vitrine', 'Mostrou uma publicação no perfil público.', { event: 'feed_post_visibility_changed' }),
  def(27, 'linked-to-trajectory', 'diary', '⛓', 'Ligado à trajetória', 'Ligou uma publicação a um registro de aprendizagem.', { event: 'feed_post_created' }),
  def(28, 'after-class', 'diary', 'aula', 'Depois da aula', 'Escreveu sobre um curso da Basement.', { event: 'feed_post_created' }),
  def(29, 'applied-in-squad', 'diary', 'sq✎', 'Aplicado no squad', 'Escreveu sobre uma entrega aceita no squad.', { event: 'feed_post_created', ...squads }),
  def(30, 'seven-posts', 'diary', '7', 'Sete publicações', 'Fez sete publicações no diário.', { event: 'feed_post_created' }),
  def(31, 'seven-weeks-diary', 'diary', '7s', 'Sete semanas de diário', 'Publicou no diário em sete semanas diferentes.'),
  def(32, 'six-months-diary', 'diary', '6m', 'Seis meses de diário', 'Publicou no diário em seis meses diferentes.'),
  def(33, 'what-i-dont-know', 'diary', '?', 'O que ainda não sei', 'Registrou o que ainda não sabe numa publicação.', { event: 'feed_post_created', stage: 'later' }),

  // 4. Preparation and entry test
  def(34, 'pr-opened', 'entry-test', 'PR', 'Pull request aberto', 'Abriu o pull request do teste de entrada.', { event: 'squad_test_submitted', ...squads }),
  def(35, 'merged', 'entry-test', '⑂', 'Merged', 'Teve o teste de entrada aprovado.', { event: 'squad_test_approved', ...squads, access: 'floor' }),
  def(36, 'second-try', 'entry-test', 'PR2', 'Segunda tentativa', 'Foi aprovado no teste de entrada depois de uma tentativa fechada.', { event: 'squad_test_approved', ...squads, private: true }),
  def(37, 'he4rt-open-source', 'entry-test', 'oss', 'Open source He4rt', 'Teve um PR merged num repositório da He4rt fora de squad.', { event: 'org_pr_merged', ...squads, access: 'decision' }),
  def(38, 'maintainer', 'entry-test', 'mnt', 'Mantenedor', 'Mantém um repositório da organização He4rt.', manual),

  // 5. Squads
  def(39, 'applicant', 'squads', 'apl', 'Candidato', 'Se candidatou a um squad pela primeira vez.', { event: 'squad_application_submitted', ...squads, private: true }),
  def(40, 'came-back-stronger', 'squads', '↻', 'Voltei mais forte', 'Entrou num squad depois de uma recusa.', { event: 'squad_application_decided', ...squads, private: true }),
  def(41, 'in-squad', 'squads', 'sq', 'No squad', 'Entrou no primeiro squad.', { event: 'squad_joined', ...squads, access: 'floor' }),
  def(42, 'first-delivery', 'squads', '✓', 'Primeira entrega', 'Teve a primeira entrega aceita.', { event: 'delivery_accepted', ...squads, access: 'floor' }),
  def(43, 'technical-delivery', 'squads', '</>', 'Entrega técnica', 'Teve uma entrega técnica aceita.', { event: 'delivery_accepted', ...squads, access: 'job' }),
  def(44, 'beyond-code', 'squads', 'doc', 'Além do código', 'Teve uma entrega não técnica aceita.', { event: 'delivery_accepted', ...squads, access: 'job' }),
  def(45, 'solo', 'squads', '1', 'Solo', 'Teve uma entrega individual aceita.', { event: 'delivery_accepted', ...squads, access: 'job' }),
  def(46, 'pair-programming', 'squads', '2', 'Pair programming', 'Teve uma entrega em dupla aceita.', { event: 'delivery_accepted', ...squads }),
  def(47, 'team-work', 'squads', 'n', 'Em time', 'Teve uma entrega em grupo aceita.', { event: 'delivery_accepted', ...squads }),
  def(48, 'code-review', 'squads', 'rev', 'Code review creditado', 'Revisou uma entrega aceita no squad.', { event: 'delivery_accepted', ...squads, access: 'job' }),
  def(49, 'returned-and-accepted', 'squads', '↩✓', 'Devolvida e aceita', 'Ajustou uma entrega devolvida até ela ser aceita.', { event: 'delivery_accepted', ...squads, private: true }),
  def(50, 'readme-credit', 'squads', 'rdm', 'Nome no README', 'Foi creditado no README de um projeto.', { event: 'readme_credit_merged', ...squads }),
  def(51, 'criteria-met', 'squads', '3✓', 'Critérios cumpridos', 'Cumpriu três critérios de aceite do mesmo projeto.', { ...squads, access: 'job' }),
  def(52, 'project-shipped', 'squads', '🏁', 'Projeto entregue', 'Teve entrega num projeto que foi encerrado.', { event: 'squad_project_closed', ...squads, access: 'job' }),
  def(53, 'start-to-finish', 'squads', 'a→z', 'Do início ao fim', 'Acompanhou um projeto do começo ao fim.', { ...squads, access: 'job' }),
  def(54, 'second-project', 'squads', 'p2', 'Segundo projeto', 'Teve entregas aceitas em dois projetos.', { ...squads, access: 'job' }),
  def(55, 'two-stacks', 'squads', '2st', 'Duas stacks', 'Teve entregas aceitas em stacks diferentes.', { ...squads, access: 'job' }),
  def(56, 'thirty-days-squad', 'squads', '30d', 'Trinta dias de squad', 'Seguiu entregando por 30 dias no squad.', { ...squads, access: 'floor' }),
  def(57, 'three-months-squad', 'squads', '3m', 'Três meses de squad', 'Teve entregas em três meses diferentes do mesmo squad.', { ...squads, access: 'job' }),
  def(58, 'six-months-practice', 'squads', '6m', 'Seis meses de prática', 'Teve entregas em seis meses diferentes.', { ...squads, access: 'job' }),
  def(59, 'first-week', 'squads', '14d', 'Primeira semana', 'Teve a primeira entrega aceita até 14 dias depois de entrar.', squads),

  // 6. Validation received
  def(60, 'asked-validation', 'validation', 'req', 'Pedi validação', 'Pediu a primeira validação.', { event: 'validation_requested', ...squads, private: true }),
  def(61, 'validated', 'validation', '✔', 'Validado', 'Recebeu a primeira validação.', { event: 'validation_recorded', ...squads, access: 'floor', private: true }),
  def(62, 'open-portfolio', 'validation', 'pub', 'Portfólio aberto', 'Publicou a primeira validação no perfil.', { event: 'validation_published', ...squads, private: true }),
  def(63, 'two-competencies', 'validation', '2c', 'Duas competências', 'Tem validações em duas competências.', { event: 'validation_recorded', ...squads, access: 'job', private: true }),
  def(64, 'two-perspectives', 'validation', '2v', 'Dois olhares', 'Foi validado por duas pessoas diferentes.', { event: 'validation_recorded', ...squads, access: 'job', private: true }),
  def(65, 'reinforced-evidence', 'validation', 'ev+', 'Evidência reforçada', 'Voltou com mais evidência e foi validado na mesma competência.', { event: 'validation_recorded', ...squads, private: true }),
  def(66, 'improvement-worked', 'validation', '↑', 'Ponto de melhoria trabalhado', 'Evoluiu num ponto de melhoria de uma validação anterior.', { event: 'validation_recorded', ...squads, access: 'job', private: true }),
  def(67, 'validated-as-declared', 'validation', 'd=v', 'Validado no que declarou', 'Foi validado numa competência que tinha declarado.', { ...squads, private: true }),

  // 7. Community contribution
  def(68, 'captain', 'community', 'cap', 'Capitão', 'Conduz um squad como capitão.', { event: 'squad_captain_assigned', ...squads, access: 'job' }),
  def(69, 'captain-shipped', 'community', 'cap✓', 'Capitão de projeto entregue', 'Conduziu um projeto até o encerramento.', { event: 'squad_project_closed', ...squads, access: 'job' }),
  def(70, 'first-of-the-team', 'community', '1º', 'Primeira entrega da turma', 'Alguém do squad dele teve a primeira entrega aceita.', { event: 'delivery_accepted', ...squads }),
  def(71, 'feedback-worked', 'community', 'fb', 'Retorno que funcionou', 'Alguém que ele recusou voltou e entrou num squad.', { event: 'squad_application_decided', ...squads, private: true }),
  def(72, 'validator', 'community', 'val', 'Validador', 'Foi habilitado como validador.', { event: 'validator_application_decided', ...squads }),
  def(73, 'first-validation-given', 'community', 'v1', 'Primeira validação feita', 'Registrou a primeira validação.', { event: 'validation_recorded', ...squads }),
  def(74, 'no-training-wheels', 'community', '5/5', 'Sem rodinhas', 'Saiu da revisão obrigatória de validações.', { event: 'validation_review_decided', ...squads }),
  def(75, 'first-commit-reviewer', 'community', 'lgtm', 'Revisor de primeiro commit', 'Revisou o teste de entrada de alguém.', { event: 'squad_test_approved', ...squads }),
  def(76, 'helped-someone', 'community', 'co', 'Ajudou alguém', 'Foi creditado no aprendizado de outro membro.', { event: 'trajectory_helper_credited', stage: 'later' }),

  // 8. Tenure
  def(77, 'one-month-hub', 'tenure', '1m', 'Um mês de Hub', 'Completou um mês no Hub.', { access: 'decision' }),
  def(78, 'six-months-hub', 'tenure', '6m', 'Seis meses de Hub', 'Completou seis meses no Hub.', { access: 'decision' }),
  def(79, 'one-year-hub', 'tenure', '1a', 'Um ano de Hub', 'Completou um ano no Hub.', { access: 'decision' }),
  def(80, 'he4rt-before-hub', 'tenure', '<3', 'He4rt antes do Hub', 'Já fazia parte da comunidade antes do Hub.', manual),
  def(81, 'one-year-evidence', 'tenure', '1a✓', 'Um ano com evidência', 'Tem evidências com um ano de distância.', { ...squads, access: 'job' }),

  // 9. Basement, Job Finder and market
  def(82, 'ready-to-apply', 'market', 'jf', 'Pronto para candidatura', 'Concluiu a preparação no Job Finder.', { event: 'jobfinder_prep_completed', stage: 'jobs', private: true }),
  def(83, 'first-application', 'market', 'cv', 'Primeira candidatura', 'Se candidatou a uma vaga do mural.', { event: 'job_applied', stage: 'jobs', private: true }),
  def(84, 'went-to-market', 'market', '🚀', 'Saiu para o mercado', 'Conseguiu o primeiro emprego na área.', manual),

  // 10. Granted by the administration
  def(85, 'he4rt-event', 'manual', 'evt', 'Evento He4rt', 'Entregou algo num evento ou hackathon da comunidade.', manual),
  def(86, 'community-to-community', 'manual', '♥', 'Da comunidade para a comunidade', 'Contribuiu com a comunidade fora do Hub.', manual),
]

export function findAchievement(key: string): AchievementDefinition | undefined {
  return achievementCatalog.find((achievement) => achievement.key === key)
}

/*
 * What the platform computes from the facts in the mock (docs/achievements/entities.md): the
 * journey stage and the unlocked achievements. Nothing here is stored or edited by hand; the
 * member only chooses which achievements show on the profile. Commits outside He4rt never count.
 */

/** The earliest of a list of ISO dates, or null. */
function first(dates: (string | null | undefined)[]): string | null {
  return dates.filter((date): date is string => !!date).sort()[0] ?? null
}

/** The nth earliest date, counting from 1. */
function nth(dates: (string | null | undefined)[], n: number): string | null {
  return dates.filter((date): date is string => !!date).sort()[n - 1] ?? null
}

function addMonths(iso: string, months: number): string {
  const date = new Date(iso)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString()
}

type Facts = ReturnType<typeof factsOf>

function factsOf(state: MockDb, userId: string) {
  const user = state.users.find((u) => u.id === userId)
  const profile = state.profiles.find((p) => p.userId === userId)
  const github = user?.linkedAccounts.find((a) => a.provider === 'github')
  const posts = state.feedPosts.filter((p) => p.userId === userId && p.projectId === null && p.deletedAt === null)
  const memberships = state.memberships.filter((m) => m.userId === userId)
  const accepted = state.deliveries.filter((d) => d.status === 'accepted' && d.credits.some((c) => c.userId === userId))
  const validations = state.validations
    .filter((v) => v.memberId === userId && v.status === 'recorded')
    .filter((v, _, all) => !all.some((other) => other.supersedesId === v.id))
  const test = state.entryTests.find((t) => t.userId === userId)
  const captainOf = state.squads.filter((s) => s.captainId === userId)
  const validator = state.validators.find((v) => v.userId === userId && v.suspension === null)
  const reviewed = state.entryTests.filter((t) => t.status === 'approved' && github && t.reviewer === github.handle)
  return { user, profile, github, posts, memberships, accepted, validations, test, captainOf, validator, reviewed }
}

/** One rule per achievement the mock has facts for: when it happened, and whether that fact is public. */
const rules: Record<string, (f: Facts, state: MockDb, userId: string) => { at: string | null; public?: boolean }> = {
  'git-init': (f) => ({ at: f.user?.onboardedAt ?? null }),
  'profile-complete': (f) => ({ at: f.user?.profileCompletedAt ?? null }),
  'remote-added': (f) => ({ at: f.github?.linkedAt ?? null }),
  'accounts-in-order': (f) => {
    const linkedin = f.user?.linkedAccounts.find((a) => a.provider === 'linkedin')
    return { at: f.github && linkedin ? [f.github.linkedAt, linkedin.linkedAt].sort()[1] : null }
  },
  'email-verified': (f) => ({ at: f.user?.emailVerifiedAt ?? null }),
  'objective-set': (f) => ({ at: f.user?.objective && f.user.areas.length > 0 ? f.user.onboardedAt : null }),
  'first-record': (f) => ({
    at: first([
      ...(f.profile?.knowledge.map((k) => k.declaredAt) ?? []),
      ...(f.profile?.learnings.map((l) => l.completedAt) ?? []),
      ...(f.profile?.experiences.map((e) => e.startedAt) ?? []),
      ...f.posts.map((p) => p.createdAt),
    ]),
  }),
  studying: (f) => ({
    at: first(f.profile?.learnings.map((l) => l.completedAt) ?? []),
    public: f.profile?.learnings.some((l) => l.visibility === 'public'),
  }),
  'basement-student': (f) => {
    const courses = f.profile?.learnings.filter((l) => l.origin === 'basement') ?? []
    return { at: first(courses.map((l) => l.completedAt)), public: courses.some((l) => l.visibility === 'public') }
  },
  'experience-logged': (f) => ({ at: first(f.profile?.experiences.map((e) => e.startedAt) ?? []) }),
  author: (f) => ({ at: first(f.profile?.articles.map((a) => a.publishedAt) ?? []) }),
  'with-proof': (f) => ({ at: first(f.profile?.evidences.filter((e) => e.projectId !== null).map((e) => e.date) ?? []) }),
  'dear-diary': (f) => ({ at: first(f.posts.map((p) => p.createdAt)) }),
  'shared-learning': (f) => ({ at: first(f.posts.filter((p) => p.sharedOnFeed).map((p) => p.createdAt)) }),
  'on-display': (f) => ({ at: first(f.posts.filter((p) => p.shownOnProfile).map((p) => p.createdAt)) }),
  'linked-to-trajectory': (f) => ({ at: first(f.posts.filter((p) => p.learningId).map((p) => p.createdAt)) }),
  'seven-posts': (f) => ({ at: nth(f.posts.map((p) => p.createdAt), 7) }),
  'pr-opened': (f) => ({ at: f.test?.openedAt ?? null }),
  merged: (f) => ({ at: f.test?.approvedAt ?? null }),
  applicant: (_, state, userId) => ({ at: first(state.applications.filter((a) => a.userId === userId).map((a) => a.createdAt)), public: false }),
  'in-squad': (f) => ({ at: first(f.memberships.map((m) => m.joinedAt)) }),
  'first-delivery': (f) => ({ at: first(f.accepted.map((d) => d.decidedAt)) }),
  'technical-delivery': (f) => ({ at: first(f.accepted.filter((d) => d.kind === 'technical').map((d) => d.decidedAt)) }),
  'beyond-code': (f) => ({ at: first(f.accepted.filter((d) => d.kind === 'non-technical').map((d) => d.decidedAt)) }),
  solo: (f) => ({ at: first(f.accepted.filter((d) => d.collaboration === 'individual').map((d) => d.decidedAt)) }),
  'pair-programming': (f) => ({ at: first(f.accepted.filter((d) => d.collaboration === 'pair').map((d) => d.decidedAt)) }),
  'team-work': (f) => ({ at: first(f.accepted.filter((d) => d.collaboration === 'group').map((d) => d.decidedAt)) }),
  'code-review': (_, state, userId) => ({
    at: first(
      state.deliveries
        .filter((d) => d.status === 'accepted' && d.evidence.some((e) => e.kind === 'review' && e.authorId === userId))
        .map((d) => d.decidedAt),
    ),
  }),
  'asked-validation': (_, state, userId) => ({
    at: first(state.validationRequests.filter((r) => r.memberId === userId).map((r) => r.createdAt)),
    public: false,
  }),
  validated: (f) => ({ at: first(f.validations.map((v) => v.recordedAt)), public: f.validations.some((v) => v.published) }),
  'open-portfolio': (f) => ({ at: first(f.validations.map((v) => v.publishedAt)), public: true }),
  'two-competencies': (f) => {
    const firstOf = [...new Set(f.validations.map((v) => v.competency))].map((c) =>
      first(f.validations.filter((v) => v.competency === c).map((v) => v.recordedAt)),
    )
    return { at: nth(firstOf, 2), public: new Set(f.validations.filter((v) => v.published).map((v) => v.competency)).size >= 2 }
  },
  'two-perspectives': (f) => {
    const firstOf = [...new Set(f.validations.map((v) => v.validatorId))].map((id) =>
      first(f.validations.filter((v) => v.validatorId === id).map((v) => v.recordedAt)),
    )
    return { at: nth(firstOf, 2), public: new Set(f.validations.filter((v) => v.published).map((v) => v.validatorId)).size >= 2 }
  },
  captain: (f) => ({
    at: first(
      f.captainOf.map(
        (squad) => first(f.memberships.filter((m) => m.squadId === squad.id).map((m) => m.joinedAt)) ?? squad.createdAt,
      ),
    ),
  }),
  validator: (f) => ({ at: f.validator?.approvedAt ?? null }),
  'first-validation-given': (_, state, userId) => ({
    at: first(state.validations.filter((v) => v.validatorId === userId && v.status === 'recorded').map((v) => v.recordedAt)),
  }),
  'first-commit-reviewer': (f) => ({ at: first(f.reviewed.map((t) => t.approvedAt)) }),
}

const tenure: [string, number][] = [
  ['one-month-hub', 1],
  ['six-months-hub', 6],
  ['one-year-hub', 12],
]

/** The member's unlocked achievements, computed now; `isPublic` is the member's own choice. */
export function memberAchievements(state: MockDb, userId: string, now: number): MemberAchievement[] {
  const facts = factsOf(state, userId)
  const shown = new Set(state.achievementChoices.filter((c) => c.userId === userId).map((c) => c.key))
  const unlocked: { key: string; at: string; public: boolean }[] = []
  for (const [key, rule] of Object.entries(rules)) {
    const { at, public: isPublicFact } = rule(facts, state, userId)
    if (at) unlocked.push({ key, at, public: isPublicFact ?? true })
  }
  for (const [key, months] of tenure) {
    const at = facts.user && addMonths(facts.user.createdAt, months)
    if (at && Date.parse(at) <= now) unlocked.push({ key, at, public: true })
  }
  return unlocked.map(({ key, at, public: originPublic }) => ({
    id: `${userId}-${key}`,
    userId,
    key,
    unlockedAt: at,
    source: 'platform',
    grantReason: null,
    originPublic,
    isPublic: shown.has(key),
    revokedAt: null,
  }))
}

const STAGE_ORDER: JourneyStage[] = ['member', 'prepared', 'practicing', 'delivered', 'validated']

/**
 * Highest kind of evidence the member has in the Hub, computed from squads and validation, and
 * the highest one visitors can see. Never a seniority, never goes down.
 */
export function memberJourney(state: MockDb, userId: string): MemberJourney {
  const f = factsOf(state, userId)
  const shownProjects = new Set(f.memberships.filter((m) => m.shownOnProfile).map((m) => m.projectId))
  const reached = (stages: boolean[]) => STAGE_ORDER[stages.lastIndexOf(true)]
  return {
    stage: reached([true, f.test?.status === 'approved', f.memberships.length > 0, f.accepted.length > 0, f.validations.length > 0]),
    publicStage: reached([
      true,
      f.test?.status === 'approved',
      shownProjects.size > 0,
      f.accepted.some((d) => shownProjects.has(d.projectId)),
      f.validations.some((v) => v.published),
    ]),
    contributor: f.captainOf.length > 0 || !!f.validator || f.reviewed.length > 0,
  }
}
