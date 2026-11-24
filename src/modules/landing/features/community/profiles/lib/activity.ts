import type { Discussion, MemberProfile } from '@/mocks/db'
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

/**
 * The member's questions and answers in the forum, newest first. Squad work, deliveries and learning
 * live in the trajectory. Forum activity is for the community, so it only exists for signed-in readers.
 */
export function memberForum(profile: MemberProfile, discussions: Discussion[], signedIn: boolean): ForumItem[] {
  if (!signedIn) return []
  const userId = profile.userId
  const forum: Omit<ForumItem, 'dateLabel'>[] = []
  for (const discussion of discussions) {
    const href = `/app/discussions/${discussion.id}`
    if (discussion.authorId === userId) {
      forum.push({ id: discussion.id, kind: 'Pergunta', date: discussion.createdAt, title: discussion.title, href, solved: false })
    }
    for (const reply of discussion.replies.filter((r) => r.authorId === userId && discussion.authorId !== userId)) {
      forum.push({ id: reply.id, kind: 'Resposta', date: reply.createdAt, title: discussion.title, href, solved: discussion.solvedReplyId === reply.id })
    }
  }
  return forum.toSorted((a, b) => b.date.localeCompare(a.date)).map((item) => ({ ...item, dateLabel: formatMonth(item.date) }))
}
