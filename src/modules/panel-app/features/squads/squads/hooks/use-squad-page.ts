import { useParams } from 'react-router'
import { useDb } from '@/mocks/db'
import { activeMemberships, activeProject, canManageSquad, findSquadBySlug } from '@/mocks/squads'

/** The squad of the URL, its current project and what the signed-in member can do there. */
export function useSquadPage() {
  const { squad: slug } = useParams()
  const state = useDb((s) => s)
  const userId = state.session?.userId ?? ''
  const squad = findSquadBySlug(state, slug)
  const project = squad ? activeProject(state, squad.id) : undefined
  const manager = !!squad && canManageSquad(state, squad.id, userId)
  const member = !!squad && state.memberships.some((m) => m.squadId === squad.id && m.userId === userId)
  const counts = {
    applications: state.applications.filter((a) => a.projectId === project?.id && a.status === 'pending').length,
    deliveries: state.deliveries.filter((d) => d.projectId === project?.id && d.status === 'pending').length,
    members: project ? activeMemberships(state, project.id).length : 0,
  }
  return { state, userId, squad, project, manager, member, counts }
}
