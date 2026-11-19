import type { Discussion, DiscussionCategory, FeedPost, Project, Squad, User } from '@/mocks/db'

export const categoryLabels: Record<DiscussionCategory, string> = {
  question: 'Dúvida',
  technical: 'Discussão técnica',
  learning: 'Aprendizado',
}

/** The newest reply, or the opening post when nobody answered yet. */
export function lastActivity(discussion: Discussion): string {
  return discussion.replies.at(-1)?.createdAt ?? discussion.createdAt
}

export function projectPath(project: Project, squads: Squad[]): string {
  const squad = squads.find((candidate) => candidate.id === project.squadId)
  return `/squads/${squad?.slug}/projects/${project.slug}`
}

export type ResolvedContext = { kind: string; label: string; path: string | null }

/**
 * What a discussion is about, with a link to it. A publication links to its author's profile;
 * one that is private or deleted keeps its text hidden.
 */
export function discussionContext(
  discussion: Discussion,
  { squads, projects, posts, users }: { squads: Squad[]; projects: Project[]; posts: FeedPost[]; users: User[] },
): ResolvedContext | null {
  const context = discussion.context
  if (!context) return null
  if (context.type === 'squad') {
    const squad = squads.find((candidate) => candidate.id === context.id)
    return squad ? { kind: 'Squad', label: squad.name, path: `/squads/${squad.slug}` } : null
  }
  if (context.type === 'project') {
    const project = projects.find((candidate) => candidate.id === context.id)
    const squad = squads.find((candidate) => candidate.id === project?.squadId)
    return project
      ? { kind: 'Projeto', label: `${project.name} · squad ${squad?.name ?? ''}`, path: projectPath(project, squads) }
      : null
  }
  const post = posts.find((candidate) => candidate.id === context.id)
  const author = users.find((user) => user.id === post?.userId)
  if (!post || !author || post.deletedAt || !(post.sharedOnFeed || post.shownOnProfile)) {
    return { kind: 'Publicação', label: 'Publicação privada', path: null }
  }
  return { kind: 'Publicação', label: post.learned, path: `/members/${author.username}` }
}
