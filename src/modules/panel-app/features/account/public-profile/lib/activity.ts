import type { Discussion, MemberProfile, Squad, SquadProject } from '@/mocks/db'
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
 * forum activity only to signed-in members; journal posts only when the member published them.
 */
export function memberActivity(
  profile: MemberProfile,
  { squads, projects, discussions, signedIn }: { squads: Squad[]; projects: SquadProject[]; discussions: Discussion[]; signedIn: boolean },
): { items: ActivityItem[]; facts: ContributionFact[] } {
  const userId = profile.userId
  const items: Omit<ActivityItem, 'dateLabel'>[] = []
  const projectPath = (project: SquadProject) => {
    const squad = squads.find((candidate) => candidate.id === project.squadId)
    return `/app/squads/${squad?.slug}/projects/${project.slug}?member=${profile.handle}`
  }

  let projectCount = 0
  let acceptedCount = 0
  let pullRequestCount = 0
  for (const project of projects) {
    // A participation the member hid stays in the squad log, but not on the profile or in its counts.
    const participant = project.participants.find((p) => p.userId === userId && p.shownOnProfile)
    if (!participant) continue
    projectCount += 1
    const squadName = squads.find((squad) => squad.id === project.squadId)?.name ?? ''
    items.push({
      id: `join-${project.id}`,
      group: 'squads',
      kind: 'Squad',
      date: participant.joinedAt,
      title: `Entrou no squad ${squadName} como ${participant.role.toLowerCase()}`,
      href: projectPath(project),
      external: false,
      note: `Projeto ${project.name}`,
    })
    for (const delivery of project.deliveries.filter((d) => d.status === 'accepted' && d.memberIds.includes(userId))) {
      acceptedCount += 1
      items.push({
        id: delivery.id,
        group: 'squads',
        kind: 'Entrega aceita',
        date: delivery.date,
        title: delivery.title,
        href: projectPath(project),
        external: false,
        note: project.name,
      })
    }
    for (const evidence of project.evidences.filter((e) => e.authorId === userId)) {
      if (evidence.kind === 'pull-request') pullRequestCount += 1
      const repo = project.repository.split('/')[1]
      items.push({
        id: evidence.id,
        group: 'squads',
        kind: evidence.kind === 'pull-request' ? 'Pull request' : 'Commit',
        date: evidence.date,
        title: evidence.title,
        href: evidence.url,
        external: true,
        note: evidence.kind === 'pull-request' ? `${repo}#${evidence.ref}` : `${repo}@${evidence.ref}`,
      })
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

  for (const post of profile.journalPosts.filter((p) => p.isPublic)) {
    items.push({
      id: post.id,
      group: 'learning',
      kind: 'Aprendizado',
      date: post.publishedAt,
      title: post.title,
      href: null,
      external: false,
      note: post.learned,
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
