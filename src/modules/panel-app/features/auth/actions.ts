import { ageOn, MIN_AGE, PROVIDERS } from '@/lib/member-profile'
import { track } from '@/mocks/analytics'
import { db, findUser, makeUser, newId, updateUser, type SocialProvider, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { linkAccount } from '@/modules/panel-app/lib/linked-accounts'
import { validateDevProfile, type DevProfileInput } from '@/modules/panel-app/lib/dev-profile'
import { authMailGateway } from '@/modules/panel-app/lib/auth-mail'

export const PASSWORD_MIN_LENGTH = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 3 to 30 lowercase letters, digits or hyphens; no hyphen at the ends. */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

function findByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase()
  return db.get().users.find((user) => user.email.toLowerCase() === normalized)
}

/** Sends a member without the Hub profile to the questions, and records the start once. */
function beginOnboardingIfNeeded(userId: string) {
  const user = findUser(userId)
  if (!user || user.onboardedAt || user.onboardingStartedAt) return
  updateUser(userId, (u) => ({ ...u, onboardingStartedAt: new Date().toISOString() }))
  track('onboarding_started', { userId, origin: user.origin })
}

function startSession(userId: string) {
  db.set((state) => ({ ...state, session: { userId } }))
  beginOnboardingIfNeeded(userId)
  const user = findUser(userId)
  return { userId, needsOnboarding: !user || needsOnboarding(user) }
}

/**
 * Password login. Works for accounts created in the Basement or the Job
 * Finder too: the identity is shared. A social login waiting for this account
 * is linked now that the member proved it is theirs.
 */
export function login(input: { email: string; password: string }) {
  return mockAction('panel-app.session.store', { email: input.email }, () => {
    const user = findByEmail(input.email)
    if (!user || db.get().passwords[user.id] !== input.password) {
      throw new MockError('E-mail ou senha inválidos.')
    }
    const pending = db.get().pendingSocialLink
    let linked: SocialProvider | null = null
    if (pending && pending.email.toLowerCase() === user.email.toLowerCase()) {
      linkAccount(user.id, pending.provider, pending.handle)
      linked = pending.provider
    }
    db.set((state) => ({ ...state, pendingSocialLink: null }))
    return { ...startSession(user.id), linked }
  })
}

/** What the provider returns: the e-mail, whether the provider confirmed it, and the login there. */
export type SocialIdentity = { name: string; email: string; emailVerified: boolean; handle: string }

/**
 * Callback of the social login.
 * - E-mail of an account, confirmed by the provider: links the provider and signs in.
 * - E-mail of an account, not confirmed: nothing is linked; the member signs in
 *   with the password first, which links it.
 * - New e-mail: the identity waits in the session for the sign-up form.
 */
export function socialLogin(provider: SocialProvider, identity: SocialIdentity) {
  return mockAction('panel-app.social-session.store', { provider, handle: identity.handle }, () => {
    const existing = findByEmail(identity.email)
    if (!existing) {
      db.set((state) => ({ ...state, pendingSocialSignUp: { provider, ...identity }, pendingSocialLink: null }))
      return { status: 'needs-sign-up' as const }
    }
    if (!identity.emailVerified && !existing.linkedAccounts.some((a) => a.provider === provider)) {
      db.set((state) => ({
        ...state,
        pendingSocialLink: { provider, email: existing.email, handle: identity.handle },
        pendingSocialSignUp: null,
      }))
      return { status: 'needs-password' as const, email: existing.email }
    }
    linkAccount(existing.id, provider, identity.handle)
    if (identity.emailVerified && !existing.emailVerifiedAt) {
      updateUser(existing.id, (u) => ({ ...u, emailVerifiedAt: new Date().toISOString() }))
    }
    return { status: 'signed-in' as const, ...startSession(existing.id) }
  })
}

export function cancelSocialSignUp() {
  return mockAction('panel-app.social-registration.destroy', null, () => {
    db.set((state) => ({ ...state, pendingSocialSignUp: null, pendingSocialLink: null }))
  })
}

export type RegisterInput = {
  name: string
  email: string
  username: string
  password: string
  birthDate: string
  acceptedUsageNotice: boolean
}

/** Expected refusal of a sign-up under the minimum age. The page drops everything it typed. */
export const UNDERAGE_FIELD = 'underage'

/**
 * The account screen of the sign-up. Creates the account with e-mail and
 * password, or with the social login waiting in the session (then without
 * password). Under 18 nothing is created nor kept, and the event carries no
 * personal data.
 */
export function register(input: RegisterInput) {
  // Only what is safe to log: no name, e-mail, password or birth date.
  return mockAction('panel-app.registration.store', { acceptedUsageNotice: input.acceptedUsageNotice }, () => {
    const pending = db.get().pendingSocialSignUp
    const now = Date.now()

    const age = input.birthDate ? ageOn(input.birthDate, now) : Number.NaN
    if (Number.isNaN(age) || age < 0 || age > 120) {
      throw new MockError('Informe sua data de nascimento.', 'birthDate')
    }
    if (age < MIN_AGE) {
      db.set((state) => ({ ...state, pendingSocialSignUp: null }))
      track('signup_blocked_underage', { method: pending ? pending.provider : 'email' })
      throw new MockError('O He4rt Hub está disponível a partir dos 18 anos.', UNDERAGE_FIELD)
    }

    const name = input.name.trim()
    const email = (pending?.email ?? input.email).trim().toLowerCase()
    if (name.length < 2) throw new MockError('Informe seu nome.', 'name')
    if (!EMAIL_PATTERN.test(email)) throw new MockError('Informe um e-mail válido.', 'email')
    if (findByEmail(email)) throw new MockError('Este e-mail já tem conta. Entre com ela.', 'email')
    if (!USERNAME_PATTERN.test(input.username)) {
      throw new MockError('O usuário tem de 3 a 30 letras minúsculas, números ou hífens.', 'username')
    }
    if (db.get().users.some((user) => user.username === input.username)) {
      throw new MockError('Este usuário já está em uso. Escolha outro.', 'username')
    }
    if (!pending && input.password.length < PASSWORD_MIN_LENGTH) {
      throw new MockError(`A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`, 'password')
    }
    if (!input.acceptedUsageNotice) {
      throw new MockError('Para criar a conta, leia e aceite o aviso de coleta de dados.', 'acceptedUsageNotice')
    }

    const at = new Date(now).toISOString()
    const user = makeUser({
      id: newId(),
      name,
      email,
      username: input.username,
      birthDate: input.birthDate,
      emailVerifiedAt: pending?.emailVerified ? at : null,
      usageNoticeAcceptedAt: at,
      createdAt: at,
    })
    db.set((state) => ({
      ...state,
      users: [...state.users, user],
      passwords: pending ? state.passwords : { ...state.passwords, [user.id]: input.password },
      pendingSocialSignUp: null,
    }))
    track('account_created', { userId: user.id, method: pending ? pending.provider : 'email' })
    if (pending) linkAccount(user.id, pending.provider, pending.handle)
    return startSession(user.id)
  })
}

/** The GitHub comes first: it is required for everyone, as the squads' workplace and the source of evidence. */
export const ONBOARDING_STEPS = ['github', 'objective', 'areas', 'startingPoint', 'languages'] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export function hasGithub(user: User): boolean {
  return user.linkedAccounts.some((account) => account.provider === 'github')
}

/** An account enters the app only with the profile questions answered and the GitHub linked. */
export function needsOnboarding(user: User): boolean {
  return !user.onboardedAt || !hasGithub(user)
}

/** First profile question the member has not answered; the onboarding opens there. */
export function firstUnansweredStep(user: User): number {
  if (!hasGithub(user)) return 0
  if (!user.objective) return 1
  if (user.areas.length === 0) return 2
  if (!user.startingPoint) return 3
  return 4
}

/** Only the languages may be skipped. */
export const SKIPPABLE_STEPS: OnboardingStep[] = ['languages']

/**
 * Saves the answer to one profile question. The last one (answered or
 * skipped) finishes the onboarding.
 */
export function answerOnboardingStep(
  userId: string,
  step: OnboardingStep,
  answer: DevProfileInput,
  options: { skip?: boolean } = {},
) {
  return mockAction('panel-app.onboarding.update', { step, skip: options.skip ?? false, answer }, () => {
    const user = findUser(userId)
    if (!user) throw new MockError('Conta não encontrada.')
    const index = ONBOARDING_STEPS.indexOf(step)
    if (index < 0 || index > firstUnansweredStep(user)) {
      throw new MockError('Responda às etapas anteriores antes de continuar.', 'step')
    }
    if (options.skip && !SKIPPABLE_STEPS.includes(step)) throw new MockError('Esta pergunta não pode ser pulada.')
    if (step === 'github') {
      if (hasGithub(user)) return { userId, done: !!user.onboardedAt }
      // Stands in for the GitHub OAuth callback, which returns the handle.
      const owner = db
        .get()
        .users.find((u) => u.id !== userId && u.linkedAccounts.some((a) => a.provider === 'github' && a.handle === user.username))
      if (owner) throw new MockError('Este GitHub já está vinculado a outra conta.', step)
      linkAccount(userId, 'github', user.username)
      track('onboarding_step_completed', { userId, step })
      // A member who answered the questions before the GitHub became required is done now.
      return { userId, done: !!user.onboardedAt }
    }

    const value = options.skip ? (step === 'languages' ? [] : null) : answer[step]
    if (!options.skip) {
      if (step === 'objective' && !answer.objective) throw new MockError('Escolha um objetivo.', step)
      if (step === 'startingPoint' && !answer.startingPoint) throw new MockError('Escolha seu ponto de partida.', step)
      if (step === 'languages' && answer.languages.length === 0) {
        throw new MockError('Escolha ao menos uma linguagem, ou pule.', step)
      }
    }
    validateDevProfile({ ...user, [step]: value }, { requireAreas: step === 'areas' })

    const last = step === ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]
    updateUser(userId, (u) => ({ ...u, [step]: value, onboardedAt: last ? new Date().toISOString() : u.onboardedAt }))
    track(options.skip ? 'onboarding_skipped' : 'onboarding_step_completed', { userId, step })
    if (last) track('onboarding_completed', { userId })
    return { userId, done: last }
  })
}

export function logout() {
  return mockAction('panel-app.session.destroy', null, () => {
    db.set((state) => ({ ...state, session: null }))
  })
}

/**
 * "Forgot password": e-mails a reset link when the account exists. The answer
 * is the same either way, so the form does not reveal who has an account.
 */
export function sendPasswordResetLink(input: { email: string }) {
  return mockAction('panel-app.password-reset-link.store', input, () => {
    if (!EMAIL_PATTERN.test(input.email.trim())) throw new MockError('Informe um e-mail válido.', 'email')
    const user = findByEmail(input.email)
    // Resolve configuration for both branches, so an outage does not enumerate accounts.
    const mail = authMailGateway()
    if (user) {
      mail.request('password-reset', user)
      // Retire legacy short tokens. New bearer links only live in the private local mailbox.
      db.set((state) => ({ ...state, passwordResets: state.passwordResets.filter((r) => r.email !== user.email) }))
    }
    return { queued: true }
  })
}

export function resetPassword(input: { token: string; password: string; confirmation: string }) {
  return mockAction('panel-app.new-password.store', { token: '[redacted]' }, () => {
    if (input.password.length < PASSWORD_MIN_LENGTH) {
      throw new MockError(`A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`, 'password')
    }
    if (input.password !== input.confirmation) throw new MockError('As senhas não conferem.', 'confirmation')

    authMailGateway().consume('password-reset', input.token, db.get().users, (user) => {
      db.set((state) => ({
        ...state,
        passwords: { ...state.passwords, [user.id]: input.password },
        passwordResets: state.passwordResets.filter((r) => r.email !== user.email),
        session: state.session?.userId === user.id ? null : state.session,
      }))
    })
    return { reset: true }
  })
}

/** Only the signed-in member can request a message; this does not verify their address. */
export function sendEmailVerification(userId: string) {
  return mockAction('panel-app.email-verification-notification.store', { userId }, () => {
    if (db.get().session?.userId !== userId) throw new MockError('Entre na sua conta para continuar.')
    const user = findUser(userId)
    if (!user) throw new MockError('Conta não encontrada.')
    if (user.emailVerifiedAt) throw new MockError('Seu e-mail já está confirmado.')
    authMailGateway().request('email-verification', user)
    return { queued: true }
  })
}

/** Possession of a single-use link, not a browser-supplied user id, proves the identity. */
export function verifyEmail(token: string) {
  return mockAction('panel-app.email-verification.store', { token: '[redacted]' }, () => {
    authMailGateway().consume('email-verification', token, db.get().users, (user) => {
      updateUser(user.id, (u) => ({ ...u, emailVerifiedAt: u.emailVerifiedAt ?? new Date().toISOString() }))
    })
    return { verified: true }
  })
}

export function providerLabel(provider: SocialProvider): string {
  return PROVIDERS.find((option) => option.value === provider)?.label ?? provider
}
