import type { Visibility } from '@/mocks/db'

/** Who is reading the profile. The owner can read it as a member or a visitor would ("Ver como"). */
export type Viewer = 'owner' | 'member' | 'visitor'

export const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: 'private', label: 'Só eu' },
  { value: 'community', label: 'Comunidade' },
  { value: 'public', label: 'Público' },
]

export const viewerOptions: { value: Viewer; label: string; param: string | null }[] = [
  { value: 'owner', label: 'Eu', param: null },
  { value: 'member', label: 'Membro', param: 'membro' },
  { value: 'visitor', label: 'Visitante', param: 'visitante' },
]

export function canSee(visibility: Visibility, viewer: Viewer): boolean {
  if (viewer === 'owner') return true
  if (viewer === 'member') return visibility !== 'private'
  return visibility === 'public'
}
