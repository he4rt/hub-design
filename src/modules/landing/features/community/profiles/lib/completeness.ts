import type { MemberProfile, User } from '@/mocks/db'

/** What a complete profile still lacks, so the owner sees their next step. */
export function missingProfileItems(user: User, profile: MemberProfile, hasTrajectory: boolean): string[] {
  return [
    !user.bio && 'uma bio curta',
    !profile.currentFocus && 'o que você está aprendendo agora',
    !profile.readme && 'o texto "Sobre"',
    user.languages.length === 0 && 'as linguagens com que você trabalha',
    !profile.experiences.some((e) => e.isPublic) && 'uma experiência registrada',
    !hasTrajectory && 'um registro publicado na trajetória',
  ].filter((item) => item !== false)
}
