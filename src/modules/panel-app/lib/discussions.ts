import type { Discussion, DiscussionCategory, MemberProfile, Squad, SquadProject } from '@/mocks/db'

export const categoryLabels: Record<DiscussionCategory, string> = {
  question: 'Dúvida',
  technical: 'Discussão técnica',
  learning: 'Aprendizado',
}

/** The newest reply, or the opening post when nobody answered yet. */
export function lastActivity(discussion: Discussion): string {
  return discussion.replies.at(-1)?.createdAt ?? discussion.createdAt
}

export function projectPath(project: SquadProject, squads: Squad[]): string {
  const squad = squads.find((candidate) => candidate.id === project.squadId)
  return `/app/squads/${squad?.slug}/projects/${project.slug}`
}

export type ResolvedContext = { kind: string; label: string; path: string | null }

/**
 * What a discussion is about, with a link to it. A journal post links to its author's public
 * profile, where it shows inside its learning record; a private post keeps its title hidden.
 */
export function discussionContext(
  discussion: Discussion,
  { squads, projects, profiles }: { squads: Squad[]; projects: SquadProject[]; profiles: MemberProfile[] },
): ResolvedContext | null {
  const context = discussion.context
  if (!context) return null
  if (context.type === 'squad') {
    const squad = squads.find((candidate) => candidate.id === context.id)
    return squad ? { kind: 'Squad', label: squad.name, path: `/app/squads/${squad.slug}` } : null
  }
  if (context.type === 'project') {
    const project = projects.find((candidate) => candidate.id === context.id)
    const squad = squads.find((candidate) => candidate.id === project?.squadId)
    return project
      ? { kind: 'Projeto', label: `${project.name} · squad ${squad?.name ?? ''}`, path: projectPath(project, squads) }
      : null
  }
  const profile = profiles.find((candidate) => candidate.journalPosts.some((post) => post.id === context.id))
  const post = profile?.journalPosts.find((candidate) => candidate.id === context.id)
  if (!profile || !post?.isPublic) return { kind: 'Publicação do diário', label: 'Publicação privada', path: null }
  return { kind: 'Publicação do diário', label: post.title, path: `/app/members/${profile.handle}` }
}
