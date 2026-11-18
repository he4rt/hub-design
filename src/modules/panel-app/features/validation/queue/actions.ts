import { track } from '@/mocks/analytics'
import { db, newId, type ImprovementPoint, type ValidationPoint } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { moderate, requireText } from '@/mocks/squads'
import { distribute, needsReview } from '@/mocks/validation'

export type ValidationDraft = {
  context: string
  contribution: string
  strengths: ValidationPoint[]
  improvements: ImprovementPoint[]
  conflictDeclared: boolean
  conflictDescription: string
  insufficientEvidence: boolean
}

function assigned(validatorId: string, requestId: string) {
  const state = db.get()
  const request = state.validationRequests.find((r) => r.id === requestId && r.validatorId === validatorId && r.status === 'assigned')
  if (!request) throw new MockError('Este pedido não está com você.')
  return { state, request }
}

/** Sends the request back to the front of the queue; it never comes to this validator again. */
export function declareConflict(validatorId: string, requestId: string, description: string) {
  return mockAction('panel-app.validation-requests.conflicts.store', { requestId }, () => {
    assigned(validatorId, requestId)
    const text = requireText(description, 10, 'Descreva o conflito (só a staff lê).', 'description')
    db.set((s) => ({
      ...s,
      validationRequests: s.validationRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'queued' as const, validatorId: null, assignedAt: null, conflicts: [...r.conflicts, { validatorId, description: text, at: new Date().toISOString() }] }
          : r,
      ),
      validations: s.validations.filter((v) => !(v.requestId === requestId && v.status === 'draft')),
    }))
    track('validation_conflict_declared', { requestId })
    distribute()
  })
}

function toValidation(state: ReturnType<typeof db.get>, validatorId: string, requestId: string, draft: ValidationDraft) {
  const request = state.validationRequests.find((r) => r.id === requestId)!
  const project = state.teamProjects.find((p) => p.id === request.projectId)
  const validator = state.validators.find((v) => v.userId === validatorId)
  const existing = state.validations.find((v) => v.requestId === requestId && v.status !== 'recorded')
  return {
    id: existing?.id ?? newId(),
    requestId,
    memberId: request.memberId,
    validatorId,
    validator: {
      name: state.users.find((u) => u.id === validatorId)?.name ?? '',
      jobTitle: validator?.showEmployer ? validator.jobTitle : null,
      company: validator?.showEmployer ? validator.company : null,
    },
    projectId: request.projectId,
    competency: project?.evaluationCriteria.find((c) => c.id === request.criterionId)?.competency ?? '',
    context: draft.context.trim(),
    contribution: draft.contribution.trim(),
    strengths: draft.strengths,
    improvements: draft.improvements,
    conflictOfInterest: { declared: draft.conflictDeclared, description: draft.conflictDeclared ? draft.conflictDescription.trim() : '' },
    insufficientEvidence: draft.insufficientEvidence,
    status: 'draft' as const,
    review: existing?.review ?? null,
    recordedAt: null,
    published: false,
    publishedAt: null,
    supersedesId: null,
  }
}

export function saveValidationDraft(validatorId: string, requestId: string, draft: ValidationDraft) {
  return mockAction('panel-app.validation-requests.validation.update', { requestId }, () => {
    const { state } = assigned(validatorId, requestId)
    const validation = toValidation(state, validatorId, requestId, draft)
    db.set((s) => ({ ...s, validations: [...s.validations.filter((v) => v.id !== validation.id), validation] }))
  })
}

/**
 * Records the validation. Every point cites its evidence; there are always
 * strengths and points to improve. A new validator's first ones wait for review.
 */
export function recordValidation(validatorId: string, requestId: string, draft: ValidationDraft) {
  return mockAction('panel-app.validation-requests.validation.store', { requestId, insufficientEvidence: draft.insufficientEvidence }, () => {
    const { state, request } = assigned(validatorId, requestId)
    requireText(draft.context, 20, 'Escreva o contexto em ao menos 20 caracteres.', 'context')
    requireText(draft.contribution, 20, 'Descreva a contribuição observada em ao menos 20 caracteres.', 'contribution')
    const strengths = draft.strengths.filter((p) => p.text.trim())
    const improvements = draft.improvements.filter((p) => p.text.trim())
    if (strengths.length === 0) throw new MockError('Registre ao menos um ponto forte.', 'strengths')
    if (improvements.length === 0) throw new MockError('Registre ao menos um ponto de melhoria.', 'improvements')
    for (const p of [...strengths, ...improvements]) {
      moderate(p.text)
      if (!p.evidenceRef.trim()) throw new MockError('Cite a evidência de cada ponto.', 'evidence')
    }
    if (improvements.some((p) => !p.suggestion.trim())) throw new MockError('Cada ponto de melhoria traz uma sugestão do que fazer.', 'improvements')
    if (draft.conflictDeclared) requireText(draft.conflictDescription, 10, 'Descreva o conflito declarado.', 'conflict')
    const review = needsReview(state, validatorId)
    const validation = {
      ...toValidation(state, validatorId, requestId, { ...draft, strengths, improvements }),
      status: review ? ('in-review' as const) : ('recorded' as const),
      recordedAt: review ? null : new Date().toISOString(),
    }
    db.set((s) => ({
      ...s,
      validations: [...s.validations.filter((v) => v.id !== validation.id), validation],
      validationRequests: review
        ? s.validationRequests
        : s.validationRequests.map((r) => (r.id === request.id ? { ...r, status: 'recorded' as const } : r)),
    }))
    if (!review) {
      track('validation_recorded', { validationId: validation.id, insufficientEvidence: draft.insufficientEvidence })
      distribute()
    }
    return { status: validation.status }
  })
}

/** Row of the points editor; `rowId` lives only on the client and is dropped before the action. */
export type PointRow = { rowId: string; text: string; evidenceRef: string; suggestion: string }

export function newPoint(): PointRow {
  return { rowId: crypto.randomUUID(), text: '', evidenceRef: '', suggestion: '' }
}
