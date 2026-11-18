import { LOGIN_PROVIDERS } from '@/lib/member-profile'
import { track } from '@/mocks/analytics'
import { db, findUser, updateUser, type Area, type GithubSuggestion, type LinkedProvider, type User } from '@/mocks/db'

/** Stands in for reading the member's public repositories on GitHub. */
function suggestFromGithub(user: User): GithubSuggestion | null {
  const areas: Area[] = ['back-end', 'devops']
  const languages = ['Go', 'Python', 'Shell']
  const newAreas = areas.filter((area) => !user.areas.includes(area))
  const newLanguages = languages.filter((language) => !user.languages.includes(language))
  return newAreas.length || newLanguages.length ? { areas: newAreas, languages: newLanguages } : null
}

/**
 * Links an account to the member, backend side. Linking the GitHub leaves a
 * suggestion of areas and languages for the member to confirm or discard.
 * Returns false when it was already linked.
 */
export function linkAccount(userId: string, provider: LinkedProvider, handle: string): boolean {
  const user = findUser(userId)
  if (!user || user.linkedAccounts.some((account) => account.provider === provider)) return false
  const { firstComplete } = updateUser(userId, (u) => ({
    ...u,
    linkedAccounts: [...u.linkedAccounts, { provider, handle, linkedAt: new Date().toISOString() }],
    githubSuggestion: provider === 'github' ? suggestFromGithub(u) : u.githubSuggestion,
  }))
  track('account_linked', { userId, provider })
  if (firstComplete) track('profile_completed', { userId })
  return true
}

/** Ways the member can still sign in: a password or a social provider. */
export function signInMethods(user: User): number {
  const hasPassword = db.get().passwords[user.id] !== undefined
  const providers = user.linkedAccounts.filter((account) => LOGIN_PROVIDERS.includes(account.provider)).length
  return providers + (hasPassword ? 1 : 0)
}

/** Shared by the action and the settings, so "Desconectar" never shows for the only login. */
export function canUnlink(user: User, provider: LinkedProvider): boolean {
  const linked = user.linkedAccounts.some((account) => account.provider === provider)
  if (!linked) return false
  return !LOGIN_PROVIDERS.includes(provider) || signInMethods(user) > 1
}
