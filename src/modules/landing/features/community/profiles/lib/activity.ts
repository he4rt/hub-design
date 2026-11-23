import type { Discussion, MemberProfile, Project, SquadDelivery, SquadMembership, Validation } from '@/mocks/db'
import { formatMonth } from '@/lib/dates'

/** One question or answer of the member in the forum. */
export type ForumItem = {
  id: string
  kind: 'Pergunta' | 'Resposta'
  date: string
  dateLabel: string
  title: string
  href: string
  solved: boolean
}

/** One count per kind of contribution, never summed into a score; each opens the tab that lists it. */
export type ContributionFact = { id: string; value: number; label: string; tab: 'trajetoria' | 'forum' }

/**
 * What the member did on the platform that the trajectory does not already tell: the counts of the
 * \"Contribuição\" sentence and the forum. Squad work, deliveries and learning live in the trajectory.
 * Forum activity is for the community, so it only exists for signed-in readers.
 */
export function memberActivity(
  profile: MemberProfile,
  {
    projects,
    memberships,
    deliveries,
    discussions,
    validations,
    signedIn,
  }: {
    projects: Project[]
    memberships: SquadMembership[]
    deliveries: SquadDelivery[]
    discussions: Discussion[]
    validations: Validation[]
    signedIn: boolean
  },
): { forum: ForumItem[]; facts: ContributionFact[] } {
  const userId = profile.userId

  let projectCount = 0
  let acceptedCount = 0
  let pullRequestCount = 0
  // Commits outside the Hub do not count for now: only squad deliveries do.
  let commitCount = 0
  // A participation the member hid stays in the squad log, but not on the profile or in its counts.
  for (const membership of memberships.filter((m) => m.userId === userId && m.shownOnProfile)) {
    const project = projects.find((candidate) => candidate.id === membership.projectId)
    if (!project) continue
    projectCount += 1
    for (const delivery of deliveries.filter(
      (d) => d.projectId === project.id && d.status === 'accepted' && d.credits.some((c) => c.userId === userId),
    )) {
      acceptedCount += 1
      for (const evidence of delivery.evidence.filter((e) => e.authorId === userId)) {
        if (evidence.kind === 'pull-request') pullRequestCount += 1
        if (evidence.kind === 'commit') commitCount += 1
      }
    }
  }

  // Forum help counts only people whose question this member solved, as the question's author marked it.
  const forum: Omit<ForumItem, 'dateLabel'>[] = []
  const helped = new Set<string>()
  if (signedIn) {
    for (const discussion of discussions) {
      const href = `/app/discussions/${discussion.id}`
      if (discussion.authorId === userId) {
        forum.push({ id: discussion.id, kind: 'Pergunta', date: discussion.createdAt, title: discussion.title, href, solved: false })
      }
      for (const reply of discussion.replies.filter((r) => r.authorId === userId && discussion.authorId !== userId)) {
        const solved = discussion.solvedReplyId === reply.id
        if (solved) helped.add(discussion.authorId)
        forum.push({ id: reply.id, kind: 'Resposta', date: reply.createdAt, title: discussion.title, href, solved })
      }
    }
  }

  const receivedCount = validations.filter((v) => v.memberId === userId && v.status === 'recorded' && v.published).length
  const recordedCount = validations.filter((v) => v.validatorId === userId && v.status === 'recorded').length
  const facts: ContributionFact[] = [
    { id: 'projects', value: projectCount, label: projectCount === 1 ? 'projeto de squad' : 'projetos de squad', tab: 'trajetoria' as const },
    { id: 'accepted', value: acceptedCount, label: acceptedCount === 1 ? 'entrega aceita' : 'entregas aceitas', tab: 'trajetoria' as const },
    { id: 'prs', value: pullRequestCount, label: pullRequestCount === 1 ? 'pull request em squad' : 'pull requests em squads', tab: 'trajetoria' as const },
    { id: 'commits', value: commitCount, label: commitCount === 1 ? 'commit' : 'commits', tab: 'trajetoria' as const },
    { id: 'validated', value: receivedCount, label: receivedCount === 1 ? 'validação recebida' : 'validações recebidas', tab: 'trajetoria' as const },
    { id: 'reviews', value: recordedCount, label: recordedCount === 1 ? 'validação registrada' : 'validações registradas', tab: 'trajetoria' as const },
    { id: 'helped', value: helped.size, label: helped.size === 1 ? 'pessoa ajudada no fórum' : 'pessoas ajudadas no fórum', tab: 'forum' as const },
  ].filter((fact) => fact.value > 0)

  return {
    forum: forum.toSorted((a, b) => b.date.localeCompare(a.date)).map((item) => ({ ...item, dateLabel: formatMonth(item.date) })),
    facts,
  }
}
