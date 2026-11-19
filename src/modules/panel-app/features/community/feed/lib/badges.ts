import type { Squad, User, Validator } from '@/mocks/db'

export type MemberBadge = { key: string; label: string; title: string; tone: 'staff' | 'captain' | 'validator' | 'verified' }

/**
 * Marks shown next to a member's name, all derived from data the Hub already
 * has: never bought, never a ranking. Staff, captain of an active squad,
 * active validator, and an account verified with every field and network.
 */
export function memberBadges(user: User, { squads, validators }: { squads: Squad[]; validators: Validator[] }): MemberBadge[] {
  const badges: MemberBadge[] = []
  if (user.role !== 'member') {
    badges.push({ key: 'staff', label: 'Administração', title: 'Faz parte da administração do Hub.', tone: 'staff' })
  }
  for (const squad of squads.filter((s) => s.captainId === user.id && s.status === 'active')) {
    badges.push({
      key: `captain-${squad.id}`,
      label: `Líder · ${squad.name}`,
      title: `Capitão do squad ${squad.name}.`,
      tone: 'captain',
    })
  }
  if (validators.some((v) => v.userId === user.id && !v.suspension)) {
    badges.push({ key: 'validator', label: 'Validador', title: 'Valida entregas de outros squads.', tone: 'validator' })
  }
  const providers = new Set(user.linkedAccounts.map((a) => a.provider))
  if (user.emailVerifiedAt && user.completeness.percent === 100 && providers.has('github') && providers.has('discord')) {
    badges.push({
      key: 'verified',
      label: 'Verificado',
      title: 'E-mail confirmado, perfil completo, GitHub e Discord vinculados.',
      tone: 'verified',
    })
  }
  return badges
}
