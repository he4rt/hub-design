import { achievementCatalog, type AchievementDefinition, type AchievementGroup } from '@/mocks/achievements'
import type { MemberAchievement } from '@/mocks/db'

export type ShownAchievement = {
  achievement: MemberAchievement
  definition: AchievementDefinition
  /** Why only the owner sees it; null when visitors see it too. */
  privateReason: string | null
}

export const groupLabels: Record<AchievementGroup, string> = {
  arrival: 'Chegada e identidade',
  trajectory: 'Trajetória',
  diary: 'Diário',
  'entry-test': 'Teste de entrada',
  squads: 'Squads',
  validation: 'Validação',
  community: 'Contribuição para a comunidade',
  tenure: 'Tempo de casa',
  market: 'Mercado',
  manual: 'Concedidas pela administração',
}

/**
 * What the reader may see: others get only what the member chose to show (and, for a private
 * achievement, whose origin is public); the owner sees every unlocked one, marked. Catalog order.
 */
export function shownAchievements(achievements: MemberAchievement[], isOwner: boolean): ShownAchievement[] {
  return achievementCatalog.flatMap((definition) => {
    const achievement = achievements.find((item) => item.key === definition.key && item.revokedAt === null)
    if (!achievement) return []
    const privateReason =
      definition.private && !achievement.originPublic
        ? 'Ela vem de um registro privado e aparece no perfil quando você publicar esse registro.'
        : !achievement.isPublic
          ? 'Você ocultou esta conquista do seu perfil.'
          : null
    if (privateReason && !isOwner) return []
    return [{ achievement, definition, privateReason }]
  })
}

/** Most recent first, for the short lists. */
export function byRecent(items: ShownAchievement[]): ShownAchievement[] {
  return [...items].sort((a, b) => b.achievement.unlockedAt.localeCompare(a.achievement.unlockedAt))
}

export function groupAchievements(items: ShownAchievement[]): { group: AchievementGroup; items: ShownAchievement[] }[] {
  const groups = Object.keys(groupLabels) as AchievementGroup[]
  return groups
    .map((group) => ({ group, items: items.filter((item) => item.definition.group === group) }))
    .filter((entry) => entry.items.length > 0)
}
