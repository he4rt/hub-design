import type { MemberProfile } from '@/mocks/db'

/** What a complete profile still lacks, so the owner sees their next step. */
export function missingProfileItems(profile: MemberProfile, hasTrajectory: boolean): string[] {
  return [
    !profile.bio && 'uma bio curta',
    !profile.currentFocus && 'o que você está aprendendo agora',
    !profile.readme && 'o texto "Sobre"',
    profile.stacks.length === 0 && 'as stacks com que você trabalha',
    !profile.experiences.some((e) => e.isPublic) && 'uma experiência registrada',
    !hasTrajectory && 'um registro publicado na trajetória',
  ].filter((item) => item !== false)
}
