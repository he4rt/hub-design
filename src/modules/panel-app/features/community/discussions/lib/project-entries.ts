import type { Discussion, MockDb } from '@/mocks/db'
import { projectPath } from '@/modules/panel-app/lib/discussions'

/**
 * Prototype only: one project as the Showcase and the Workbench listings read it, from what the Hub
 * already has. A member's own project (shared in the Feed) or an active squad project, with the
 * feedback requests opened about it in the Fórum.
 */
export type ProjectEntry = {
  id: string
  name: string
  repository: { fullName: string; url: string } | null
  pitch: string
  language: string | null
  excerpt: string | null
  owner:
    | { kind: 'member'; name: string; photoUrl: string | null; username: string }
    | { kind: 'squad'; name: string; slug: string }
  createdAt: string
  /** Where the project opens inside the Hub, or null when only the repository exists. */
  path: string | null
  requests: Discussion[]
}

/** The README's first lines of prose, without headings, for the typographic cover. */
function excerptOf(markdown: string | null): string | null {
  if (!markdown) return null
  const text = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .join(' ')
    .replace(/[*_`>-]/g, '')
    .trim()
  return text ? text.slice(0, 160) : null
}

export function projectEntries(state: MockDb): ProjectEntry[] {
  const members = state.memberProjects.flatMap((project): ProjectEntry[] => {
    const user = state.users.find((u) => u.id === project.userId)
    const post = state.feedPosts.find((p) => p.projectId === project.id && p.deletedAt === null)
    if (!user || !post) return []
    const requests = state.discussions.filter((d) => d.context?.type === 'post' && d.context.id === post.id)
    return [{
      id: project.id,
      name: project.read.name,
      repository: project.repository,
      pitch: project.pitch,
      language: project.read.language,
      excerpt: excerptOf(project.read.files.readme) ?? project.read.description,
      owner: { kind: 'member', name: user.name, photoUrl: user.photoUrl, username: user.username },
      createdAt: project.createdAt,
      path: requests[0] ? `/app/discussions/${requests[0].id}` : null,
      requests,
    }]
  })
  const squads = state.projects
    .filter((p) => p.status === 'active')
    .flatMap((project): ProjectEntry[] => {
      const squad = state.squads.find((s) => s.id === project.squadId)
      if (!squad) return []
      return [{
        id: project.id,
        name: project.name,
        repository: project.repository,
        pitch: project.goal,
        language: project.stack[0] ?? null,
        excerpt: project.acceptanceCriteria.map((c) => c.text).join('. ') || null,
        owner: { kind: 'squad', name: squad.name, slug: squad.slug },
        createdAt: project.startedAt ?? '',
        path: projectPath(project, state.squads),
        requests: state.discussions.filter((d) => d.context?.type === 'project' && d.context.id === project.id),
      }]
    })
  return [...members, ...squads]
}

/** A language's color, from the trajectory lanes: identity, never a state. */
export function languageColor(language: string | null): string {
  const lanes: Record<string, string> = { TypeScript: '--lane-1', PHP: '--lane-6', Shell: '--lane-2', React: '--lane-3', Laravel: '--lane-4' }
  return language && lanes[language] ? `var(${lanes[language]})` : 'var(--text-faint)'
}

export type RequestStatus = 'waiting' | 'talking' | 'resolved'
export const REQUEST_STATUS: Record<RequestStatus, { label: string; variant: 'warning' | 'info' | 'success' }> = {
  waiting: { label: 'Aguardando retorno', variant: 'warning' },
  talking: { label: 'Em conversa', variant: 'info' },
  resolved: { label: 'Resolvido', variant: 'success' },
}
export const requestStatus = (d: Discussion): RequestStatus =>
  d.solvedReplyId ? 'resolved' : d.replies.length === 0 ? 'waiting' : 'talking'

export const feedbackCount = (entry: ProjectEntry) => entry.requests.reduce((sum, d) => sum + d.replies.length, 0)
