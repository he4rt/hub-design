import { db, newId, type ApplicationQuestion } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { activeMemberships, appendLog, canManageSquad, isStaff, requireText, reservedSeats } from '@/mocks/squads'

export type ProjectSettings = { seats: number; questions: (ApplicationQuestion & { rowId?: string })[] }

function managed(actorId: string, projectId: string) {
  const state = db.get()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) throw new MockError('Projeto não encontrado.')
  const actor = state.users.find((u) => u.id === actorId)
  if (!canManageSquad(state, project.squadId, actorId) && !isStaff(actor)) {
    throw new MockError('Só o capitão ou a staff mudam o projeto.')
  }
  return { project, state }
}

/** Application questions and seats, set by the captain. */
export function updateProjectSettings(actorId: string, projectId: string, input: ProjectSettings) {
  return mockAction('panel-app.squads.projects.update', input, () => {
    const { project, state } = managed(actorId, projectId)
    if (!canManageSquad(state, project.squadId, actorId)) throw new MockError('Só o capitão ou o super admin configuram as candidaturas.')
    if (project.status !== 'active') throw new MockError('O projeto não está ativo.')
    const members = activeMemberships(state, project.id).length + reservedSeats(state, project.id)
    if (!Number.isInteger(input.seats) || input.seats < members) {
      throw new MockError(`Os lugares não podem ficar abaixo dos ${members} membros e convites reservados.`, 'seats')
    }
    if (input.seats > 12) throw new MockError('Um squad tem no máximo 12 lugares.', 'seats')
    const questions = input.questions
      .map(({ id, text, required }) => ({ id: id || newId(), text: text.trim(), required }))
      .filter((q) => q.text)
    if (questions.length === 0) throw new MockError('Inclua ao menos uma pergunta.', 'questions')
    questions.forEach((q) => requireText(q.text, 10, 'Cada pergunta precisa de ao menos 10 caracteres.', 'questions'))
    db.set((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, seats: input.seats, applicationQuestions: questions } : p)),
    }))
  })
}

/** Ending the only project leaves the squad inactive; nothing is deleted. */
export function endProject(actorId: string, projectId: string, options = { archiveRepository: false }) {
  return mockAction('panel-app.squads.projects.update', { projectId, status: 'ended', ...options }, () => {
    const { project } = managed(actorId, projectId)
    if (project.status !== 'active') throw new MockError('O projeto não está ativo.')
    if (!options || typeof options.archiveRepository !== 'boolean') throw new MockError('Escolha se o repositório deve ser arquivado.')
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: 'ended' as const, endedAt: now } : p)),
      memberships: s.memberships.map((m) => (m.projectId === projectId && m.leftAt === null ? { ...m, leftAt: now, leftReason: 'Projeto encerrado' } : m)),
      squads: s.squads.map((sq) => (sq.id === project.squadId ? { ...sq, status: 'inactive' as const } : sq)),
      applications: s.applications.map((a) =>
        a.projectId === projectId && (a.status === 'pending' || (a.status === 'accepted' && a.githubInvite === 'pending'))
          ? {
              ...a,
              status: 'declined' as const,
              decision: {
                reason: 'O projeto foi encerrado antes de a sua candidatura ser respondida.',
                nextSteps: 'Seu teste de entrada continua valendo: candidate-se ao próximo projeto do squad.',
                decidedBy: actorId,
                decidedAt: now,
              },
            }
          : a,
      ),
    }))
    appendLog({ squadId: project.squadId, projectId, kind: 'project-ended', actorId, detail: project.name })
  })
}
