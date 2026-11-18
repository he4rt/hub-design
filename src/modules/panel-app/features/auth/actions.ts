import { ageOn, MIN_AGE, PROVIDERS } from '@/lib/member-profile'
import { track } from '@/mocks/analytics'
import { db, findUser, makeUser, newId, updateUser, type SocialProvider, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { linkAccount } from '@/modules/panel-app/lib/linked-accounts'
import { validateDevProfile, type DevProfileInput } from '@/modules/panel-app/lib/dev-profile'

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
  return { userId, needsOnboarding: !findUser(userId)?.onboardedAt }
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

export const ONBOARDING_STEPS = ['objective', 'areas', 'startingPoint', 'languages'] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** First profile question the member has not answered; the onboarding opens there. */
export function firstUnansweredStep(user: User): number {
  if (!user.objective) return 0
  if (user.areas.length === 0) return 1
  if (!user.startingPoint) return 2
  return 3
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
    if (options.skip && !SKIPPABLE_STEPS.includes(step)) throw new MockError('Esta pergunta não pode ser pulada.')

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
    if (user) {
      const reset = { email: user.email, token: newId(), createdAt: new Date().toISOString() }
      db.set((state) => ({ ...state, passwordResets: [...state.passwordResets, reset] }))
    }
    return { sent: true }
  })
}

export function resetPassword(input: { token: string; password: string; confirmation: string }) {
  return mockAction('panel-app.new-password.store', { token: input.token }, () => {
    const reset = db.get().passwordResets.find((r) => r.token === input.token)
    const user = reset && findByEmail(reset.email)
    if (!user) throw new MockError('Este link expirou ou já foi usado. Peça um novo.')
    if (input.password.length < PASSWORD_MIN_LENGTH) {
      throw new MockError(`A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`, 'password')
    }
    if (input.password !== input.confirmation) throw new MockError('As senhas não conferem.', 'confirmation')

    db.set((state) => ({
      ...state,
      passwords: { ...state.passwords, [user.id]: input.password },
      passwordResets: state.passwordResets.filter((r) => r.email !== user.email),
    }))
    return { userId: user.id }
  })
}

export function providerLabel(provider: SocialProvider): string {
  return PROVIDERS.find((option) => option.value === provider)?.label ?? provider
}
