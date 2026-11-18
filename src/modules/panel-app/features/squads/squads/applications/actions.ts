import { track } from '@/mocks/analytics'
import { db, newId, type MockDb } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { applyBlocker, canManageSquad, freeSeats, requireText } from '@/mocks/squads'

export type ApplicationAnswer = { questionId: string; answer: string }

/** "Candidatar-se": the member answers the captain's questions for one project. */
export function applyToProject(userId: string, projectId: string, answers: ApplicationAnswer[]) {
  return mockAction('panel-app.squads.projects.applications.store', { projectId, answers }, () => {
    const state = db.get()
    const project = state.teamProjects.find((p) => p.id === projectId)
    if (!project) throw new MockError('Projeto não encontrado.')
    const blocker = applyBlocker(state, userId, project)
    if (blocker) throw new MockError(blocker)

    const cleaned = project.applicationQuestions.map((question) => {
      const answer = answers.find((a) => a.questionId === question.id)?.answer.trim() ?? ''
      if (question.required) requireText(answer, 10, 'Responda com pelo menos 10 caracteres.', question.id)
      return { questionId: question.id, answer }
    })

    const id = newId()
    db.set((s) => ({
      ...s,
      applications: [
        ...s.applications,
        {
          id,
          projectId,
          userId,
          answers: cleaned.filter((a) => a.answer),
          status: 'pending',
          notes: null,
          decision: null,
          githubInvite: 'not-needed',
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    track('squad_application_submitted', { userId, projectId })
    return { id }
  })
}

export const FEEDBACK_MIN = 30

function managedApplication(actorId: string, applicationId: string) {
  const state = db.get()
  const app = state.applications.find((a) => a.id === applicationId)
  const project = state.teamProjects.find((p) => p.id === app?.projectId)
  if (!app || !project) throw new MockError('Candidatura não encontrada.')
  if (!canManageSquad(state, project.squadId, actorId)) throw new MockError('Só o capitão do squad decide as candidaturas.')
  return { app, project, state }
}

/** Strengths and points to improve; the member, the captain and the staff read them. */
export function saveApplicationNotes(actorId: string, applicationId: string, input: { strengths: string; improvements: string }) {
  return mockAction('panel-app.squads.applications.notes.update', { applicationId, ...input }, () => {
    managedApplication(actorId, applicationId)
    const strengths = requireText(input.strengths, 10, 'Escreva ao menos 10 caracteres de pontos fortes.', 'strengths')
    const improvements = requireText(input.improvements, 10, 'Escreva ao menos 10 caracteres de pontos de melhoria.', 'improvements')
    db.set((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === applicationId
          ? { ...a, notes: { strengths, improvements, authorId: actorId, updatedAt: new Date().toISOString() } }
          : a,
      ),
    }))
  })
}

export function canAccept(state: MockDb, applicationId: string): boolean {
  const app = state.applications.find((a) => a.id === applicationId)
  const project = state.teamProjects.find((p) => p.id === app?.projectId)
  return !!app && !!project && app.status === 'pending' && project.status === 'active' && freeSeats(state, project) > 0
}

/** Accepting gives access to the repository and the board through the GitHub App. */
export function acceptApplication(actorId: string, applicationId: string) {
  return mockAction('panel-app.squads.applications.update', { applicationId, decision: 'accepted' }, () => {
    const { app, state } = managedApplication(actorId, applicationId)
    if (app.status !== 'pending') throw new MockError('Esta candidatura já foi respondida.')
    if (!canAccept(state, applicationId)) throw new MockError('O projeto está sem lugares livres.')
    db.set((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === applicationId ? { ...a, status: 'accepted' as const, githubInvite: 'pending' as const } : a,
      ),
    }))
    track('squad_application_decided', { applicationId, decision: 'accepted' })
  })
}

/** A decline is never a bare "no": it carries why and what to strengthen. */
export function declineApplication(
  actorId: string,
  applicationId: string,
  input: { reason: string; nextSteps: string },
) {
  return mockAction('panel-app.squads.applications.update', { applicationId, decision: 'declined', ...input }, () => {
    const { app } = managedApplication(actorId, applicationId)
    if (app.status !== 'pending') throw new MockError('Esta candidatura já foi respondida.')
    const reason = requireText(input.reason, FEEDBACK_MIN, `Explique o porquê em ao menos ${FEEDBACK_MIN} caracteres.`, 'reason')
    const nextSteps = requireText(
      input.nextSteps,
      FEEDBACK_MIN,
      `Diga o que fortalecer em ao menos ${FEEDBACK_MIN} caracteres.`,
      'nextSteps',
    )
    db.set((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: 'declined' as const,
              decision: { reason, nextSteps, decidedBy: actorId, decidedAt: new Date().toISOString() },
            }
          : a,
      ),
    }))
    track('squad_application_decided', { applicationId, decision: 'declined' })
  })
}
