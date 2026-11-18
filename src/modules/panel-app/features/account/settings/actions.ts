import { LINKED_PROVIDERS, SITUATIONS } from '@/lib/member-profile'
import { track } from '@/mocks/analytics'
import { db, findUser, updateUser, type City, type LinkedProvider, type Situation } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { MUNICIPALITIES } from '@/mocks/municipalities'
import { validateDevProfile, type DevProfileInput } from '@/modules/panel-app/lib/dev-profile'
import { canUnlink, linkAccount } from '@/modules/panel-app/lib/linked-accounts'

export const BIO_MAX_LENGTH = 280
/** A photo arrives resized to a small JPEG data URL; this caps it. */
const PHOTO_MAX_LENGTH = 200_000
const PORTFOLIO_PATTERN = /^https?:\/\/[^\s.]+\.[^\s]+$/

export function updateProfile(userId: string, input: { name: string; email: string }) {
  return mockAction('panel-app.settings.profile.update', input, () => {
    const name = input.name.trim()
    if (name.length < 2) throw new MockError('O nome precisa ter ao menos 2 caracteres.')
    const email = input.email.trim().toLowerCase()
    if (db.get().users.some((u) => u.email === email && u.id !== userId)) {
      throw new MockError('Este e-mail já está em uso.')
    }
    // A new e-mail has to be confirmed again.
    updateUser(userId, (u) => ({
      ...u,
      name,
      email,
      emailVerifiedAt: u.email === email ? u.emailVerifiedAt : null,
    }))
    return { userId }
  })
}

export type MemberProfileInput = DevProfileInput & {
  situation: Situation | null
  openToOpportunities: boolean
  city: City | null
  photoUrl: string | null
  bio: string
  portfolioUrl: string
}

/** Profile fields of the settings page. Fires `profile_completed` the first time it reaches 100%. */
export function updateMemberProfile(userId: string, input: MemberProfileInput) {
  return mockAction(
    'panel-app.settings.member-profile.update',
    { ...input, photoUrl: input.photoUrl ? '(imagem)' : null },
    () => {
      validateDevProfile(input)
      if (input.situation && !SITUATIONS.some((o) => o.value === input.situation)) {
        throw new MockError('Situação inválida.', 'situation')
      }
      if (input.city && !MUNICIPALITIES.some((c) => c.name === input.city?.name && c.uf === input.city.uf)) {
        throw new MockError('Escolha a cidade na lista.', 'city')
      }
      if (input.bio.length > BIO_MAX_LENGTH) {
        throw new MockError(`A bio tem no máximo ${BIO_MAX_LENGTH} caracteres.`, 'bio')
      }
      if (input.photoUrl && (!input.photoUrl.startsWith('data:image/') || input.photoUrl.length > PHOTO_MAX_LENGTH)) {
        throw new MockError('Não foi possível usar esta foto. Tente outra imagem.', 'photo')
      }
      const portfolioUrl = input.portfolioUrl.trim()
      if (portfolioUrl && !PORTFOLIO_PATTERN.test(portfolioUrl)) {
        throw new MockError('Informe um link que comece com https://', 'portfolio')
      }

      const { firstComplete } = updateUser(userId, (u) => ({
        ...u,
        objective: input.objective,
        areas: input.areas,
        startingPoint: input.startingPoint,
        languages: input.languages,
        situation: input.situation,
        openToOpportunities: input.openToOpportunities,
        city: input.city,
        photoUrl: input.photoUrl,
        bio: input.bio.trim(),
        portfolioUrl,
      }))
      if (firstComplete) track('profile_completed', { userId })
      return { completeness: findUser(userId)?.completeness.percent }
    },
  )
}

/** "Publicar meu perfil". Profiles are born private. */
export function setProfilePublished(userId: string, published: boolean) {
  return mockAction(
    published ? 'panel-app.settings.profile-publication.store' : 'panel-app.settings.profile-publication.destroy',
    { userId },
    () => {
      const user = findUser(userId)
      if (!user) throw new MockError('Conta não encontrada.')
      if (user.published === published) return { published }
      updateUser(userId, (u) => ({ ...u, published }))
      track(published ? 'profile_published' : 'profile_unpublished', { userId })
      return { published }
    },
  )
}

function providerLabel(provider: LinkedProvider): string {
  return LINKED_PROVIDERS.find((option) => option.value === provider)?.label ?? provider
}

/**
 * "Conectar" in the linked accounts. Stands in for the provider's OAuth
 * callback, which returns the handle there.
 */
export function connectAccount(userId: string, provider: LinkedProvider, handle: string) {
  return mockAction('panel-app.settings.linked-accounts.store', { provider, handle }, () => {
    const user = findUser(userId)
    if (!user) throw new MockError('Conta não encontrada.')
    const owner = db
      .get()
      .users.find((u) => u.id !== userId && u.linkedAccounts.some((a) => a.provider === provider && a.handle === handle))
    if (owner) throw new MockError(`Este ${providerLabel(provider)} já está vinculado a outra conta.`)
    if (!linkAccount(userId, provider, handle)) throw new MockError(`O ${providerLabel(provider)} já está vinculado.`)
    return { provider }
  })
}

export function disconnectAccount(userId: string, provider: LinkedProvider) {
  return mockAction('panel-app.settings.linked-accounts.destroy', { provider }, () => {
    const user = findUser(userId)
    if (!user) throw new MockError('Conta não encontrada.')
    if (!canUnlink(user, provider)) {
      throw new MockError('Esta é a única forma de entrar na sua conta. Vincule outra ou crie uma senha antes.')
    }
    updateUser(userId, (u) => ({
      ...u,
      linkedAccounts: u.linkedAccounts.filter((a) => a.provider !== provider),
      githubSuggestion: provider === 'github' ? null : u.githubSuggestion,
    }))
    return { provider }
  })
}

/** Confirms or discards the areas and languages suggested from the GitHub. */
export function resolveGithubSuggestion(userId: string, accept: boolean) {
  return mockAction(
    accept ? 'panel-app.settings.github-suggestion.update' : 'panel-app.settings.github-suggestion.destroy',
    { userId },
    () => {
      const user = findUser(userId)
      const suggestion = user?.githubSuggestion
      if (!user || !suggestion) throw new MockError('Não há sugestão do GitHub.')
      const languages = [...user.languages, ...suggestion.languages].slice(0, 5)
      const { firstComplete } = updateUser(userId, (u) => ({
        ...u,
        githubSuggestion: null,
        ...(accept ? { areas: [...u.areas, ...suggestion.areas], languages } : {}),
      }))
      if (firstComplete) track('profile_completed', { userId })
      return { accepted: accept }
    },
  )
}
