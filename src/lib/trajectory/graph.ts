import type { MemberProfile, Visibility, Project, Squad, SquadDelivery, SquadMembership, TechnicalEvidence, Validation } from '@/mocks/db'
import { formatMonth, formatPeriod } from '@/lib/dates'
import { evidenceRef } from '@/lib/evidence'
import { canSee, type Viewer } from './visibility'

/** The member's records that carry their own visibility. */
export type RecordCollection = keyof Pick<MemberProfile, 'knowledge' | 'learnings' | 'experiences' | 'articles' | 'evidences'>

/** A member who has not registered any trajectory record yet. */
export function emptyProfile(userId: string): MemberProfile {
  return {
    userId,
    coverImageUrl: null,
    knowledge: [],
    learnings: [],
    experiences: [],
    articles: [],
    evidences: [],
  }
}

/**
 * The five kinds of trajectory record in PRODUCT.md, from the weakest to the strongest proof.
 * Drawn as the marker's shape on the line, and named under each record. `filter` names the kind in the
 * filters over the line, with the same words as the trajectory settings.
 */
export type RecordType = 'declared' | 'learning' | 'experience' | 'demonstrated' | 'validated'

export const recordTypes: { value: RecordType; label: string; filter: string }[] = [
  { value: 'declared', label: 'Conhecimento declarado', filter: 'Conhecimentos' },
  { value: 'learning', label: 'Aprendizagem registrada', filter: 'Aprendizagens' },
  { value: 'experience', label: 'Experiência registrada', filter: 'Experiências' },
  { value: 'demonstrated', label: 'Competência demonstrada', filter: 'Evidências' },
  { value: 'validated', label: 'Competência validada', filter: 'Validações' },
]

export const recordTypeLabels = Object.fromEntries(recordTypes.map((t) => [t.value, t.label])) as Record<RecordType, string>

/** Squad branches use the lane palette; validation branches the validator's color. */
export type BranchTone = 'main' | 'squad' | 'validation'

/** Which part of a lane a row draws: the whole row, above its marker, or below it. */
export type LanePart = 'full' | 'top' | 'bottom'

export type TrajectoryEntry = {
  id: string
  /** Null for a branch event (joining or leaving a squad), which is not a record. */
  type: RecordType | null
  date: string
  dateLabel: string
  title: string
  badge: { text: string; mono: boolean } | null
  evidenceKind: TechnicalEvidence['kind'] | null
  /** 0 is the member's main line; a squad reuses the lane of one that already ended, and validations share one lane. */
  lane: number
  /** Palette index of the branch: 0 for the main line and validations, then one per squad, so squads sharing a lane keep their own color. */
  color: number
  /** The branch the entry sits on (a squad project or the validations); null on the main line. */
  branch: string | null
  /** A branch starts here and leaves the main line. */
  fork: boolean
  /** A branch ends here and joins the main line again. */
  merge: boolean
  /** Which kind of branch the record sits on; validations draw in the validator's color. */
  tone: BranchTone
  lines: { lane: number; color: number; part: LanePart; tone: BranchTone }[]
  detail: string | null
  /** Where the record came from, when the project line does not already say it. */
  origin: string
  url: string | null
  /** Full reference of an evidence, such as `ana-souza-dev/frete-calc@3f9c2a1`. */
  reference: string | null
  /** Squad project of a record, linked to its page. */
  project: { label: string; path: string } | null
  /** The record behind the entry, so its owner can choose who sees it; null for squad and validation events. */
  record: { collection: RecordCollection; id: string; visibility: Visibility } | null
}

export type TrajectoryGraph = {
  entries: TrajectoryEntry[]
  laneCount: number
  /** One legend item per branch, oldest first. */
  lanes: { id: string; lane: number; color: number; label: string; tone: BranchTone }[]
}

const levelLabels = { basic: 'básico', intermediate: 'intermediário', advanced: 'avançado' }
const evidenceLabels: Record<TechnicalEvidence['kind'], string> = {
  commit: 'Commit',
  'pull-request': 'Pull request',
  repository: 'Repositório',
}

type Branch = { id: string; label: string; start: string; end: string | null; tone: BranchTone }

/** A branch takes the lane of one that already ended, the one free the longest, so ended squads leave no empty column. */
function assignLanes(branches: Branch[]): Map<string, number> {
  const lanes = new Map<string, number>()
  const freeSince: (string | null)[] = []
  for (const branch of branches.toSorted((a, b) => a.start.localeCompare(b.start))) {
    let lane = -1
    freeSince.forEach((ended, index) => {
      if (ended !== null && ended < branch.start && (lane === -1 || ended < (freeSince[lane] ?? ''))) lane = index
    })
    if (lane === -1) lane = freeSince.push(null) - 1
    freeSince[lane] = branch.end
    lanes.set(branch.id, lane + 1)
  }
  return lanes
}

type Draft = Omit<TrajectoryEntry, 'dateLabel' | 'lines' | 'color' | 'evidenceKind' | 'url' | 'reference' | 'project' | 'fork' | 'merge' | 'badge' | 'tone' | 'record' | 'branch'> &
  Partial<Pick<TrajectoryEntry, 'evidenceKind' | 'url' | 'reference' | 'project' | 'fork' | 'merge' | 'badge' | 'tone' | 'record' | 'branch'>>

/**
 * The member's published records as a `git log --graph`, newest first: the member is the main
 * line, each stay in a squad is a branch and the validations share one. Only records the member
 * made public, squads they chose to show, and validations they published enter.
 */
export function trajectoryGraph(
  profile: MemberProfile,
  {
    squads,
    projects,
    memberships,
    deliveries,
    validations,
    viewer,
  }: {
    squads: Squad[]
    projects: Project[]
    memberships: SquadMembership[]
    deliveries: SquadDelivery[]
    validations: Validation[]
    viewer: Viewer
  },
): TrajectoryGraph {
  const userId = profile.userId
  const shown = <T extends { visibility: Visibility }>(records: T[]) => records.filter((r) => canSee(r.visibility, viewer))
  const learnings = shown(profile.learnings)
  const experiences = shown(profile.experiences)
  const squadOf = (project: Project) => squads.find((squad) => squad.id === project.squadId)
  const projectLink = (project: Project) => ({
    label: `${project.name}, squad ${squadOf(project)?.name ?? ''}`,
    path: `/squads/${squadOf(project)?.slug}/projects/${project.slug}`,
  })
  // A participation the member hid stays in the squad log, but not on the profile.
  const participations = memberships
    .filter((membership) => membership.userId === userId && membership.shownOnProfile)
    .flatMap((membership) => {
      const project = projects.find((candidate) => candidate.id === membership.projectId)
      return project ? [{ project, membership, end: membership.leftAt ?? project.endedAt }] : []
    })
    .toSorted((a, b) => a.membership.joinedAt.localeCompare(b.membership.joinedAt))
  // One squad at a time, several projects inside it: each stay in a squad is one branch, from the first
  // project joined until the last one ends. Leaving and coming back later opens a new branch.
  type Stay = { id: string; squad: Squad | undefined; start: string; end: string | null; items: typeof participations }
  const stays: Stay[] = []
  for (const item of participations) {
    const open = stays.findLast((stay) => stay.squad?.id === item.project.squadId)
    if (open && (open.end === null || open.end >= item.membership.joinedAt)) {
      open.items.push(item)
      open.end = open.end === null || item.end === null ? null : open.end > item.end ? open.end : item.end
    } else {
      stays.push({ id: `squad-${item.project.squadId}-${stays.length}`, squad: squadOf(item.project), start: item.membership.joinedAt, end: item.end, items: [item] })
    }
  }
  const stayOf = (projectId: string | null, date: string) =>
    stays.find((stay) => stay.items.some((item) => item.project.id === projectId) && stay.start <= date && (stay.end === null || date <= stay.end)) ??
    stays.find((stay) => stay.items.some((item) => item.project.id === projectId))

  const articles = shown(profile.articles)
  // Published validations, only the latest record of a corrected one. They share one branch, opened by the first.
  const shownValidations = validations
    .filter((v) => v.memberId === userId && v.status === 'recorded' && v.published)
    .filter((v, _, all) => !all.some((other) => other.supersedesId === v.id))
    .toSorted((a, b) => (a.recordedAt ?? '').localeCompare(b.recordedAt ?? ''))
  const validationBranchId = 'validations'
  const branches: Branch[] = [
    ...shownValidations.slice(0, 1).map((v) => ({
      id: validationBranchId,
      label: 'Validações',
      start: v.recordedAt ?? '',
      end: null,
      tone: 'validation' as const,
    })),
    ...stays.map((stay) => ({ id: stay.id, label: `Squad ${stay.squad?.name ?? ''}`, start: stay.start, end: stay.end, tone: 'squad' as const })),
  ]
  const laneOf = assignLanes(branches)
  const colorOf = new Map(branches.filter((b) => b.tone === 'squad').toSorted((a, b) => a.start.localeCompare(b.start)).map((b, i) => [b.id, i + 1]))

  const drafts: Draft[] = [
    ...shown(profile.knowledge).map((k) => ({
        id: k.id,
        record: { collection: 'knowledge' as const, id: k.id, visibility: k.visibility },
        type: 'declared' as const,
        lane: 0,
        date: k.declaredAt,
        title: k.competency,
        badge: { text: levelLabels[k.level], mono: false },
        detail: null,
        origin: 'Declarado pelo membro',
      })),
    ...learnings.map((l) => ({
      id: l.id,
      record: { collection: 'learnings' as const, id: l.id, visibility: l.visibility },
      type: 'learning' as const,
      lane: 0,
      date: l.completedAt,
      title: l.title,
      badge: { text: l.origin === 'basement' ? 'Basement' : 'estudo', mono: false },
      detail: l.description,
      origin: l.origin === 'basement' ? 'Concluído na Basement' : 'Registrado pelo membro',
    })),
    ...articles.map((a) => ({
      id: a.id,
      record: { collection: 'articles' as const, id: a.id, visibility: a.visibility },
      type: 'learning' as const,
      lane: 0,
      date: a.publishedAt,
      title: a.title,
      badge: { text: a.source, mono: false },
      detail: a.summary,
      origin: `Artigo publicado no ${a.source}`,
      url: a.url,
    })),
    // Professional experience and articles stay on the main line: only squads and validations open branches.
    ...experiences.map((e) => ({
      id: e.id,
      record: { collection: 'experiences' as const, id: e.id, visibility: e.visibility },
      type: 'experience' as const,
      lane: 0,
      date: e.startedAt,
      title: e.role,
      badge: { text: e.organization, mono: false },
      detail: [`${formatPeriod(e.startedAt, e.endedAt)}.`, e.description].filter(Boolean).join(' '),
      origin: 'Registrado pelo membro',
    })),
    // A stay in a squad is a branch: it forks when the member joins the first project and merges when the last one ends.
    ...stays.flatMap((stay) => {
      const lane = laneOf.get(stay.id) ?? 0
      const name = stay.squad?.name ?? ''
      return stay.items.flatMap(({ project, membership, end }, index) => {
        const first = index === 0
        const last = end !== null && end === stay.end && !stay.items.some((other, i) => i > index && other.end === stay.end)
        const start: Draft = {
          id: first ? `${stay.id}-start` : `${membership.id}-start`,
          type: null,
          lane,
          branch: stay.id,
          fork: first,
          date: membership.joinedAt,
          title: first ? `Entrou no squad ${name}` : `Entrou no projeto ${project.name}`,
          // Only the captain is named: the profile does not split the team by stack.
          badge: { text: stay.squad?.captainId === userId ? `Capitão de ${project.name}` : project.name, mono: false },
          detail: `${formatPeriod(membership.joinedAt, end)}. ${membership.responsibilities}`,
          origin: '',
          project: projectLink(project),
        }
        const ending: Draft[] = end
          ? [
              {
                id: last ? `${stay.id}-end` : `${membership.id}-end`,
                type: null,
                lane,
                branch: stay.id,
                merge: last,
                date: end,
                title: last && membership.leftAt ? `Saiu do squad ${name}` : membership.leftAt ? `Saiu do projeto ${project.name}` : `Projeto ${project.name} encerrado`,
                detail: null,
                origin: '',
                project: projectLink(project),
              },
            ]
          : []
        const accepted: Draft[] = deliveries
          .filter((d) => d.projectId === project.id && d.status === 'accepted' && d.credits.some((c) => c.userId === userId))
          .map((d) => {
            const evidence = d.evidence.find((e) => e.authorId === userId)
            return {
              id: d.id,
              type: 'demonstrated' as const,
              lane,
              branch: stay.id,
              date: d.decidedAt ?? d.createdAt,
              title: d.title,
              badge: evidence ? { text: evidence.ref, mono: true } : { text: 'entrega aceita', mono: false },
              detail: [d.credits.find((c) => c.userId === userId)?.part, d.context].filter(Boolean).join(' '),
              origin: 'Entrega aceita pelo capitão',
              url: evidence?.url ?? null,
              project: projectLink(project),
            }
          })
        return [start, ...ending, ...accepted]
      })
    }),
    // Only evidence from a He4rt project counts as demonstrated; commits outside the Hub stay off the profile for now.
    ...shown(profile.evidences).flatMap((v) => {
        const project = projects.find((candidate) => candidate.id === v.projectId)
        if (!project) return []
        const stay = stayOf(v.projectId, v.date)
        return {
          id: v.id,
          record: { collection: 'evidences' as const, id: v.id, visibility: v.visibility },
          type: 'demonstrated' as const,
          // An evidence of a shown squad sits on that squad's branch.
          lane: (stay && laneOf.get(stay.id)) || 0,
          branch: stay?.id ?? null,
          date: v.date,
          title: v.title,
          badge: { text: evidenceRef(v), mono: true },
          evidenceKind: v.kind,
          detail: v.context,
          origin: `${evidenceLabels[v.kind]} no GitHub`,
          url: v.url,
          reference: evidenceRef(v, { full: true }),
          project: projectLink(project),
        }
      }),
    // Every validation sits on the validations branch; the first one forks it off the main line.
    ...shownValidations.map((v, index) => {
      const project = projects.find((candidate) => candidate.id === v.projectId)
      const validator = [v.validator.name, v.validator.jobTitle, v.validator.company].filter(Boolean).join(', ')
      const first = index === 0
      return {
        id: first ? `${validationBranchId}-start` : v.id,
        type: 'validated' as const,
        lane: laneOf.get(validationBranchId) ?? 0,
        branch: validationBranchId,
        tone: 'validation' as const,
        fork: first,
        date: v.recordedAt ?? v.publishedAt ?? '',
        title: v.competency,
        badge: { text: 'validação', mono: false },
        detail: `${v.context} ${v.contribution}`,
        origin: `Validado por ${validator}`,
        project: project ? projectLink(project) : null,
      }
    }),
  ]

  const sorted = drafts.toSorted((a, b) => b.date.localeCompare(a.date))
  const indexOf = (id: string) => sorted.findIndex((entry) => entry.id === id)
  const spans = branches.map((branch) => ({
    lane: laneOf.get(branch.id) ?? 0,
    color: colorOf.get(branch.id) ?? 0,
    tone: branch.tone,
    start: indexOf(`${branch.id}-start`),
    // An ongoing branch runs to the top of the graph.
    end: branch.end ? indexOf(`${branch.id}-end`) : -1,
  }))
  const last = sorted.length - 1

  const entries = sorted.map((draft, i): TrajectoryEntry => {
    // The main line runs from the top, through the year title, down to the oldest row, like `git log --graph`.
    // A branch that forks off the oldest row needs the main line to reach its curve.
    const bottom = i === last && !draft.fork
    const lines: TrajectoryEntry['lines'] = [{ lane: 0, color: 0, part: bottom ? 'top' : 'full', tone: 'main' }]
    for (const span of spans) {
      if (i > span.start || i < span.end) continue
      lines.push({ lane: span.lane, color: span.color, tone: span.tone, part: i === span.start ? 'top' : i === span.end ? 'bottom' : 'full' })
    }
    return {
      dateLabel: formatMonth(draft.date),
      badge: null,
      tone: draft.lane === 0 ? 'main' : 'squad',
      fork: false,
      merge: false,
      evidenceKind: null,
      url: null,
      reference: null,
      project: null,
      record: null,
      branch: null,
      ...draft,
      color: (draft.branch && colorOf.get(draft.branch)) || 0,
      lines,
    }
  })

  return {
    entries,
    laneCount: Math.max(0, ...laneOf.values()),
    lanes: branches
      .toSorted((a, b) => a.start.localeCompare(b.start))
      .map((branch) => ({ id: branch.id, lane: laneOf.get(branch.id) ?? 0, color: colorOf.get(branch.id) ?? 0, label: branch.label, tone: branch.tone })),
  }
}
