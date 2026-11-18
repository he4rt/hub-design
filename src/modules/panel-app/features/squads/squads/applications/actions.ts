import { track } from '@/mocks/analytics'
import { db, newId } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { applyBlocker, requireText } from '@/mocks/squads'

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
