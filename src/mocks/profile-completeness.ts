import type { ProfileField, User } from './db'

/**
 * Weight of each field in the profile completeness, in points out of 100, in
 * the order the missing fields are listed. Name, e-mail, username and birth
 * date are required at sign-up and the objective is asked first, so they do
 * not count.
 */
export const COMPLETENESS_WEIGHTS: Record<ProfileField, number> = {
  areas: 15,
  languages: 10,
  github: 10,
  startingPoint: 10,
  bio: 10,
  photo: 10,
  city: 10,
  situation: 10,
  linkedin: 8,
  portfolio: 7,
}

/** Something a member does in the Hub that needs some profile fields first. */
export type ProfileAction = 'join-squad' | 'apply-job'

/** Example requirements; the real ones come with the squads and job board stages. */
export const ACTION_REQUIREMENTS: Record<ProfileAction, ProfileField[]> = {
  'join-squad': ['areas', 'languages', 'github', 'bio'],
  'apply-job': ['areas', 'city', 'situation', 'linkedin', 'photo'],
}

export function isFilled(user: User, field: ProfileField): boolean {
  switch (field) {
    case 'areas':
      return user.areas.length > 0
    case 'languages':
      return user.languages.length > 0
    case 'startingPoint':
      return user.startingPoint !== null
    case 'situation':
      return user.situation !== null
    case 'city':
      return user.city !== null
    case 'photo':
      return user.photoUrl !== null
    case 'bio':
      return user.bio.trim() !== ''
    case 'portfolio':
      return user.portfolioUrl !== ''
    case 'github':
    case 'linkedin':
      return user.linkedAccounts.some((account) => account.provider === field)
  }
}

/** Whether the member may do the action, and which fields are still missing for it. */
export function canDo(user: User, action: ProfileAction): { allowed: boolean; missing: ProfileField[] } {
  const missing = ACTION_REQUIREMENTS[action].filter((field) => !isFilled(user, field))
  return { allowed: missing.length === 0, missing }
}

/** Actions a field is required for. */
export function actionsUnlockedBy(field: ProfileField): ProfileAction[] {
  return (Object.keys(ACTION_REQUIREMENTS) as ProfileAction[]).filter((action) =>
    ACTION_REQUIREMENTS[action].includes(field),
  )
}

/** Recomputed by the backend on every write to a user. */
export function withCompleteness(user: User): User {
  const fields = Object.keys(COMPLETENESS_WEIGHTS) as ProfileField[]
  const missing = fields.filter((field) => !isFilled(user, field))
  const percent = 100 - missing.reduce((sum, field) => sum + COMPLETENESS_WEIGHTS[field], 0)
  return { ...user, completeness: { percent, missing } }
}
