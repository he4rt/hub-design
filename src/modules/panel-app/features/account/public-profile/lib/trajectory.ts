import type { JournalPost, MemberProfile, Project, Squad, SquadMembership, TechnicalEvidence } from '@/mocks/db'
import { formatMonth, formatPeriod } from '@/modules/panel-app/lib/dates'
import { evidenceRef } from '@/modules/panel-app/lib/evidence'

/** How strong the record's evidence is; drawn as the marker on the rail, never as a count. */
export type EvidenceStrength = 'declared' | 'registered' | 'evidence'

export type TrajectoryEntry = {
  id: string
  kind: 'knowledge' | 'learning' | 'experience' | 'project' | 'article' | 'evidence'
  date: string
  dateLabel: string
  title: string
  badge: { text: string; mono: boolean }
  evidenceKind: TechnicalEvidence['kind'] | null
  strength: EvidenceStrength
  detail: string | null
  origin: string
  url: string | null
  /** Full reference of an evidence, such as `ana-souza-dev/frete-calc@3f9c2a1`. */
  reference: string | null
  /** Squad project of a participation or of an evidence, linked to its page. */
  project: { label: string; path: string } | null
  notes: JournalPost[]
}

export const kindLabels: Record<TrajectoryEntry['kind'], string> = {
  knowledge: 'Conhecimento declarado',
  learning: 'Marco de aprendizagem',
  experience: 'Experiência registrada',
  project: 'Entrada em squad',
  article: 'Artigo',
  evidence: 'Evidência técnica',
}

const levelLabels = { basic: 'básico', intermediate: 'intermediário', advanced: 'avançado' }
const evidenceLabels: Record<TechnicalEvidence['kind'], string> = {
  commit: 'Commit',
  'pull-request': 'Pull request',
  repository: 'Repositório',
}

type Draft = Omit<TrajectoryEntry, 'dateLabel' | 'evidenceKind' | 'url' | 'reference' | 'project' | 'notes'> &
  Partial<Pick<TrajectoryEntry, 'evidenceKind' | 'url' | 'reference' | 'project' | 'notes'>>

/**
 * The member's published records as one `git log`, newest first. Only records with
 * `isPublic`, and squad projects the member chose to show, enter: nothing reaches the
 * public profile without the member choosing it.
 */
export function trajectoryEntries(
  profile: MemberProfile,
  { squads, projects, memberships }: { squads: Squad[]; projects: Project[]; memberships: SquadMembership[] },
): TrajectoryEntry[] {
  const learnings = profile.learnings.filter((l) => l.isPublic)
  const experiences = profile.experiences.filter((e) => e.isPublic)
  const squadOf = (project: Project) => squads.find((squad) => squad.id === project.squadId)
  const projectLink = (project: Project) => ({
    label: `${project.name} · squad ${squadOf(project)?.name ?? ''}`,
    path: `/squads/${squadOf(project)?.slug}/projects/${project.slug}`,
  })
  const projectLinkById = (projectId: string | null) => {
    const project = projects.find((candidate) => candidate.id === projectId)
    return project ? projectLink(project) : null
  }
  // A participation the member hid stays in the squad log, but not on the profile.
  const participations = memberships
    .filter((membership) => membership.userId === profile.userId && membership.shownOnProfile)
    .flatMap((membership) => {
      const project = projects.find((candidate) => candidate.id === membership.projectId)
      return project ? [{ project, membership }] : []
    })

  const drafts: Draft[] = [
    ...profile.knowledge
      .filter((k) => k.isPublic)
      .map((k) => ({
        id: k.id,
        kind: 'knowledge' as const,
        date: k.declaredAt,
        title: k.competency,
        badge: { text: `declarado · ${levelLabels[k.level]}`, mono: false },
        strength: 'declared' as const,
        detail: `Nível declarado: ${levelLabels[k.level]}. Ainda sem evidência ligada.`,
        origin: 'Declarado pelo membro',
      })),
    ...learnings.map((l) => ({
      id: l.id,
      kind: 'learning' as const,
      date: l.completedAt,
      title: l.title,
      badge: { text: l.origin === 'basement' ? 'Basement' : 'registrado', mono: false },
      strength: 'registered' as const,
      detail: l.description,
      origin: l.origin === 'basement' ? 'Concluído na Basement' : 'Registrado pelo membro',
      notes: profile.journalPosts
        .filter((post) => post.isPublic && post.learningId === l.id)
        .toSorted((a, b) => a.publishedAt.localeCompare(b.publishedAt)),
    })),
    // One event per experience, on the same line as every other record, dated when it started.
    ...experiences.map((e) => ({
      id: e.id,
      kind: 'experience' as const,
      date: e.startedAt,
      title: e.role,
      badge: { text: 'experiência registrada', mono: false },
      strength: 'registered' as const,
      detail: [`${e.organization}, ${formatPeriod(e.startedAt, e.endedAt)}.`, e.description].filter(Boolean).join(' '),
      origin: 'Registrado pelo membro',
    })),
    ...participations.map(({ project, membership }) => {
      const captain = squadOf(project)?.captainId === membership.userId
      return {
        id: membership.id,
        kind: 'project' as const,
        date: membership.joinedAt,
        title: `Entrou no squad ${squadOf(project)?.name ?? ''}`,
        badge: { text: captain ? 'Capitão' : 'Membro', mono: false },
        strength: 'registered' as const,
        detail: `Projeto ${project.name}, ${formatPeriod(membership.joinedAt, membership.leftAt ?? project.endedAt)}. ${membership.responsibilities}`,
        origin: project.repository
          ? `Projeto em ${project.repository.fullName}, na organização He4rt`
          : 'Projeto da organização He4rt',
        project: projectLink(project),
      }
    }),
    ...profile.articles
      .filter((a) => a.isPublic)
      .map((a) => ({
        id: a.id,
        kind: 'article' as const,
        date: a.publishedAt,
        title: a.title,
        badge: { text: a.source, mono: false },
        strength: 'registered' as const,
        detail: a.summary,
        origin: `Artigo publicado no ${a.source}`,
        url: a.url,
      })),
    ...profile.evidences
      .filter((v) => v.isPublic)
      .map((v) => ({
        id: v.id,
        kind: 'evidence' as const,
        date: v.date,
        title: v.title,
        badge: { text: evidenceRef(v), mono: true },
        evidenceKind: v.kind,
        strength: 'evidence' as const,
        detail: v.context,
        origin: `${evidenceLabels[v.kind]} no GitHub`,
        url: v.url,
        reference: evidenceRef(v, { full: true }),
        project: projectLinkById(v.projectId),
      })),
  ]

  return drafts
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((draft) => ({
      dateLabel: formatMonth(draft.date),
      evidenceKind: null,
      url: null,
      reference: null,
      project: null,
      notes: [],
      ...draft,
    }))
}
