import { db, type LearningRecord, type Project, type Squad, type SquadMembership } from '@/mocks/db'

/**
 * Debug shortcuts that reshape one member's data so the Trajetória graph shows each of its forms:
 * only the main line, squads one after another, squads at the same time, projects inside one squad, coming back to a squad, validations, and a long history.
 */

const at = (date: string) => `${date}T12:00:00Z`

function membership(userId: string, project: Pick<Project, 'id' | 'squadId'>, joinedAt: string, leftAt: string | null): SquadMembership {
  return {
    id: `debug-m-${project.id}-${userId}`,
    squadId: project.squadId,
    projectId: project.id,
    userId,
    responsibilities: 'Participação gerada pelo debug.',
    joinedAt: at(joinedAt),
    leftAt: leftAt && at(leftAt),
    leftReason: leftAt ? 'Fim do ciclo.' : null,
    shownOnProfile: true,
  }
}

/** Removes the debug memberships and hides every other participation and validation: one straight line. */
export function onlyMainLine(userId: string) {
  db.set((s) => ({
    ...s,
    memberships: s.memberships
      .filter((m) => !m.id.startsWith('debug-m-'))
      .map((m) => (m.userId === userId ? { ...m, shownOnProfile: false } : m)),
    validations: s.validations.map((v) => (v.memberId === userId ? { ...v, published: false } : v)),
  }))
}

const debugSquadNames = ['Portal de Vagas', 'Documentação Aberta', 'Mentoria Júnior', 'Bot de Estudos', 'Site do Evento', 'App de Carona', 'Painel de Métricas']
const debugProjectNames = ['Busca de vagas', 'Guia de contribuição', 'Pareamento', 'Lembretes', 'Inscrições', 'Rotas', 'Gráficos']

/** `count` debug squads with one project each, so every debug stay is in a different squad. */
function debugSquads(base: Project, count: number): { squads: Squad[]; projects: Project[] } {
  const squads: Squad[] = Array.from({ length: count }, (_, i) => ({
    id: `debug-s${i}`,
    slug: `debug-squad-${i}`,
    name: debugSquadNames[i % debugSquadNames.length],
    description: 'Squad criado pelo debug.',
    captainId: null,
    status: 'active',
    createdAt: at('2024-01-01'),
  }))
  const projects = squads.map((squad, i) => ({
    ...base,
    id: `debug-p${i}`,
    squadId: squad.id,
    slug: `projeto-debug-${i}`,
    name: debugProjectNames[i % debugProjectNames.length],
    repository: null,
    board: null,
    status: 'active' as const,
    startedAt: at('2024-01-01'),
    endedAt: null,
  }))
  return { squads, projects }
}

/** Replaces the member's participations, and any earlier debug squads, with these. */
function withMemberships(userId: string, build: (s: ReturnType<typeof db.get>) => { squads?: Squad[]; projects?: Project[]; memberships: SquadMembership[] }) {
  db.set((s) => {
    const clean = {
      ...s,
      squads: s.squads.filter((squad) => !squad.id.startsWith('debug-s')),
      projects: s.projects.filter((project) => !project.id.startsWith('debug-p')),
      memberships: s.memberships.filter((m) => m.userId !== userId && !m.id.startsWith('debug-m-')),
    }
    const next = build(clean)
    return {
      ...clean,
      squads: [...clean.squads, ...(next.squads ?? [])],
      projects: [...clean.projects, ...(next.projects ?? [])],
      memberships: [...clean.memberships, ...next.memberships],
    }
  })
}

/**
 * `count` squads, one after the other, five months each: every branch merges before the next forks,
 * so they all share one lane, each in its own color. More than six repeat the colors.
 */
export function squadsInSequence(userId: string, count: number) {
  withMemberships(userId, (s) => {
    const base = s.projects[0]
    if (!base) return { memberships: [] }
    const { squads, projects } = debugSquads(base, count)
    const month = (i: number) => `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-10`
    return {
      squads,
      projects,
      memberships: projects.map((project, i) => membership(userId, project, month(i * 6), i === count - 1 ? null : month(i * 6 + 5))),
    }
  })
}

/** `count` squads at once, each joined two months after the previous and still open: one lane each, side by side. */
export function squadsAtTheSameTime(userId: string, count: number) {
  withMemberships(userId, (s) => {
    const base = s.projects[0]
    if (!base) return { memberships: [] }
    const { squads, projects } = debugSquads(base, count)
    return {
      squads,
      projects,
      memberships: projects.map((project, i) => membership(userId, project, `2025-${String(i * 2 + 1).padStart(2, '0')}-10`, null)),
    }
  })
}

/** One squad, two projects that overlap and a third after them: a single branch with the projects inside it. */
export function projectsInOneSquad(userId: string) {
  withMemberships(userId, (s) => {
    const [checkout, catalog] = s.projects.filter((p) => p.squadId === 's1')
    const other = s.projects.find((p) => p.squadId !== 's1')
    return {
      memberships: [
        ...(other ? [membership(userId, other, '2025-05-10', '2025-09-20')] : []),
        ...(catalog ? [membership(userId, catalog, '2025-11-20', '2026-07-30')] : []),
        ...(checkout ? [membership(userId, checkout, '2026-03-15', null)] : []),
      ],
    }
  })
}

/** Leaves a squad and comes back months later: two branches of the same squad, in different colors. */
export function backToTheSameSquad(userId: string) {
  withMemberships(userId, (s) => {
    const [checkout, catalog] = s.projects.filter((p) => p.squadId === 's1')
    const other = s.projects.find((p) => p.squadId !== 's1')
    return {
      memberships: [
        ...(catalog ? [{ ...membership(userId, catalog, '2025-06-10', '2025-10-20'), id: `debug-m-${catalog.id}-${userId}-1` }] : []),
        ...(other ? [membership(userId, other, '2025-12-01', '2026-04-30')] : []),
        ...(checkout ? [membership(userId, checkout, '2026-07-10', null)] : []),
      ],
    }
  })
}

/** Publishes the member's recorded validations: they share one green branch. */
export function publishValidations(userId: string) {
  db.set((s) => ({
    ...s,
    validations: s.validations.map((v) =>
      v.memberId === userId && v.status === 'recorded' ? { ...v, published: true, publishedAt: v.publishedAt ?? v.recordedAt } : v,
    ),
  }))
}

/** Forty public learnings over three years, some with long titles: the Carregar mais and the year filter. */
export function longHistory(userId: string) {
  const learnings: LearningRecord[] = Array.from({ length: 40 }, (_, i) => {
    const month = String((i % 12) + 1).padStart(2, '0')
    const year = 2024 + Math.floor(i / 14)
    return {
      id: `debug-l${i}`,
      title:
        i % 5 === 0
          ? `Estudo ${i + 1}: como organizar filas, retentativas e falhas de envio em um checkout de loja pequena sem perder pedidos`
          : `Estudo ${i + 1}`,
      description: 'Registro gerado pelo debug.',
      origin: i % 4 === 0 ? 'basement' : 'member',
      completedAt: `${year}-${month}-15`,
      visibility: 'public',
    }
  })
  db.set((s) => ({
    ...s,
    profiles: s.profiles.map((p) =>
      p.userId === userId ? { ...p, learnings: [...p.learnings.filter((l) => !l.id.startsWith('debug-l')), ...learnings] } : p,
    ),
  }))
}
