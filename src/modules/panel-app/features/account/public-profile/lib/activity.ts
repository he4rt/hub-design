import type { Discussion, FeedPost, MemberProfile, Project, Squad, SquadDelivery, SquadMembership } from '@/mocks/db'
import { formatMonth } from '@/modules/panel-app/lib/dates'

export type ActivityGroup = 'squads' | 'forum' | 'learning'

export type ActivityItem = {
  id: string
  group: ActivityGroup
  kind: string
  date: string
  dateLabel: string
  title: string
  /** Squad project page, a discussion, or a GitHub URL. */
  href: string | null
  external: boolean
  note: string | null
}

/** One count per kind of contribution, never summed into a score. */
export type ContributionFact = { id: string; value: number; label: string; group: ActivityGroup }

export const activityGroupLabels: Record<ActivityGroup, string> = {
  squads: 'Squads',
  forum: 'Fórum',
  learning: 'Aprendizados',
}

/**
 * What the member did on the platform, newest first. Squad work is visible to everyone;
 * forum activity only to signed-in members; publications only when the member showed them on the profile.
 */
export function memberActivity(
  profile: MemberProfile,
  {
    squads,
    projects,
    memberships,
    deliveries,
    discussions,
    posts,
    signedIn,
  }: {
    squads: Squad[]
    projects: Project[]
    memberships: SquadMembership[]
    deliveries: SquadDelivery[]
    discussions: Discussion[]
    posts: FeedPost[]
    signedIn: boolean
  },
): { items: ActivityItem[]; facts: ContributionFact[] } {
  const userId = profile.userId
  const items: Omit<ActivityItem, 'dateLabel'>[] = []
  const projectPath = (project: Project) => {
    const squad = squads.find((candidate) => candidate.id === project.squadId)
    return `/squads/${squad?.slug}/projects/${project.slug}`
  }

  let projectCount = 0
  let acceptedCount = 0
  let pullRequestCount = 0
  // A participation the member hid stays in the squad log, but not on the profile or in its counts.
  for (const membership of memberships.filter((m) => m.userId === userId && m.shownOnProfile)) {
    const project = projects.find((candidate) => candidate.id === membership.projectId)
    if (!project) continue
    projectCount += 1
    const squad = squads.find((candidate) => candidate.id === project.squadId)
    items.push({
      id: `join-${membership.id}`,
      group: 'squads',
      kind: 'Squad',
      date: membership.joinedAt,
      title: `Entrou no squad ${squad?.name ?? ''}${squad?.captainId === userId ? ' como capitão' : ''}`,
      href: projectPath(project),
      external: false,
      note: `Projeto ${project.name}`,
    })
    const accepted = deliveries.filter(
      (d) => d.projectId === project.id && d.status === 'accepted' && d.credits.some((c) => c.userId === userId),
    )
    for (const delivery of accepted) {
      acceptedCount += 1
      const date = delivery.decidedAt ?? delivery.createdAt
      items.push({
        id: delivery.id,
        group: 'squads',
        kind: 'Entrega aceita',
        date,
        title: delivery.title,
        href: projectPath(project),
        external: false,
        note: project.name,
      })
      for (const evidence of delivery.evidence.filter((e) => e.authorId === userId)) {
        if (evidence.kind === 'pull-request') pullRequestCount += 1
        items.push({
          id: `${delivery.id}-${evidence.ref}`,
          group: 'squads',
          kind: evidence.kind === 'pull-request' ? 'Pull request' : evidence.kind === 'review' ? 'Revisão' : 'Commit',
          date,
          title: delivery.title,
          href: evidence.url,
          external: true,
          note: evidence.ref,
        })
      }
    }
  }

  let answerCount = 0
  let solvedCount = 0
  if (signedIn) {
    for (const discussion of discussions) {
      if (discussion.authorId === userId) {
        items.push({
          id: discussion.id,
          group: 'forum',
          kind: 'Pergunta',
          date: discussion.createdAt,
          title: discussion.title,
          href: `/app/discussions/${discussion.id}`,
          external: false,
          note: null,
        })
      }
      for (const reply of discussion.replies.filter((r) => r.authorId === userId && discussion.authorId !== userId)) {
        const solved = discussion.solvedReplyId === reply.id
        answerCount += 1
        if (solved) solvedCount += 1
        items.push({
          id: reply.id,
          group: 'forum',
          kind: 'Resposta',
          date: reply.createdAt,
          title: discussion.title,
          href: `/app/discussions/${discussion.id}`,
          external: false,
          note: solved ? 'marcada como solução' : null,
        })
      }
    }
  }

  // Only publications the author chose to show on the profile; never their reactions.
  for (const post of posts.filter((p) => p.userId === userId && p.shownOnProfile && p.deletedAt === null)) {
    items.push({
      id: post.id,
      group: 'learning',
      kind: 'Aprendizado',
      date: post.createdAt,
      title: post.learned,
      href: null,
      external: false,
      note: post.applied,
    })
  }

  const facts: ContributionFact[] = [
    { id: 'projects', value: projectCount, label: projectCount === 1 ? 'projeto de squad' : 'projetos de squad', group: 'squads' as const },
    { id: 'accepted', value: acceptedCount, label: acceptedCount === 1 ? 'entrega aceita' : 'entregas aceitas', group: 'squads' as const },
    { id: 'prs', value: pullRequestCount, label: pullRequestCount === 1 ? 'pull request em squad' : 'pull requests em squads', group: 'squads' as const },
    { id: 'answers', value: answerCount, label: answerCount === 1 ? 'resposta no fórum' : 'respostas no fórum', group: 'forum' as const },
    { id: 'solved', value: solvedCount, label: solvedCount === 1 ? 'resposta marcada como solução' : 'respostas marcadas como solução', group: 'forum' as const },
  ].filter((fact) => fact.value > 0)

  return {
    items: items
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .map((item) => ({ ...item, dateLabel: formatMonth(item.date) })),
    facts,
  }
}
