import { track } from '@/mocks/analytics'
import { db, newId } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { isStaff, isSuperAdmin, requireText } from '@/mocks/squads'
import { distribute, isEligible, reviewBlocker } from '@/mocks/validation'

function staff(actorId: string) {
  if (!isStaff(db.get().users.find((u) => u.id === actorId))) throw new MockError('Só a staff faz isso.')
}

function superAdmin(actorId: string) {
  if (!isSuperAdmin(db.get().users.find((u) => u.id === actorId))) throw new MockError('Só o super admin faz isso.')
}

export function approveValidator(actorId: string, applicationId: string) {
  return mockAction('panel-admin.validator-applications.update', { applicationId, decision: 'approved' }, () => {
    staff(actorId)
    const app = db.get().validatorApplications.find((a) => a.id === applicationId && a.status === 'pending')
    if (!app) throw new MockError('Pedido não encontrado ou já decidido.')
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      validatorApplications: s.validatorApplications.map((a) =>
        a.id === applicationId ? { ...a, status: 'approved' as const, decision: { reason: '', decidedBy: actorId, decidedAt: now } } : a,
      ),
      validators: [
        ...s.validators,
        { userId: app.userId, approvedAt: now, jobTitle: app.jobTitle, company: app.company, showEmployer: app.showEmployer, suspension: null, lastAssignedAt: null },
      ],
    }))
    track('validator_application_decided', { applicationId, decision: 'approved' })
    distribute()
  })
}

/** Not enough background is a "not yet": the feedback says what to bring next time. */
export function declineValidator(actorId: string, applicationId: string, reason: string) {
  return mockAction('panel-admin.validator-applications.update', { applicationId, decision: 'declined', reason }, () => {
    staff(actorId)
    const app = db.get().validatorApplications.find((a) => a.id === applicationId && a.status === 'pending')
    if (!app) throw new MockError('Pedido não encontrado ou já decidido.')
    const text = requireText(reason, 30, 'Escreva um retorno de ao menos 30 caracteres: o que trazer no próximo pedido.', 'reason')
    db.set((s) => ({
      ...s,
      validatorApplications: s.validatorApplications.map((a) =>
        a.id === applicationId
          ? { ...a, status: 'declined' as const, decision: { reason: text, decidedBy: actorId, decidedAt: new Date().toISOString() } }
          : a,
      ),
    }))
    track('validator_application_decided', { applicationId, decision: 'declined' })
  })
}

/** Suspended validators get no new requests; the ones they held go back to the front of the queue. */
export function suspendValidator(actorId: string, validatorId: string, reason: string) {
  return mockAction('panel-admin.validators.update', { validatorId, suspended: true, reason }, () => {
    superAdmin(actorId)
    const text = requireText(reason, 10, 'Diga o motivo da suspensão.', 'reason')
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      validators: s.validators.map((v) => (v.userId === validatorId ? { ...v, suspension: { reason: text, by: actorId, at: now } } : v)),
      validationRequests: s.validationRequests.map((r) =>
        r.validatorId === validatorId && r.status === 'assigned'
          ? { ...r, status: 'queued' as const, validatorId: null, assignedAt: null, requeuedAt: now }
          : r,
      ),
      validations: s.validations.filter((v) => !(v.validatorId === validatorId && v.status !== 'recorded')),
    }))
    distribute()
  })
}

export function reinstateValidator(actorId: string, validatorId: string) {
  return mockAction('panel-admin.validators.update', { validatorId, suspended: false }, () => {
    superAdmin(actorId)
    db.set((s) => ({ ...s, validators: s.validators.map((v) => (v.userId === validatorId ? { ...v, suspension: null } : v)) }))
    distribute()
  })
}

export function reassignValidationRequest(actorId: string, requestId: string, validatorId: string) {
  return mockAction('panel-admin.validation-requests.update', { requestId, validatorId }, () => {
    staff(actorId)
    const state = db.get()
    const request = state.validationRequests.find((r) => r.id === requestId && r.status === 'assigned')
    if (!request) throw new MockError('Pedido não encontrado.')
    if (request.validatorId === validatorId || !isEligible(state, validatorId, request)) {
      throw new MockError('Esta pessoa não pode receber o pedido: janela cheia, do mesmo squad ou com conflito.')
    }
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      validationRequests: s.validationRequests.map((r) => (r.id === requestId ? { ...r, validatorId, assignedAt: now } : r)),
      validations: s.validations.filter((v) => !(v.requestId === requestId && v.status !== 'recorded')),
      validators: s.validators.map((v) => (v.userId === validatorId ? { ...v, lastAssignedAt: now } : v)),
    }))
    track('validation_assigned', { requestId })
    distribute()
  })
}

/** Review of a new validator's validation before it is recorded; the reviewer is outside the case. */
export function decideReview(actorId: string, validationId: string, decision: 'approved' | 'returned', note: string) {
  return mockAction('panel-admin.validation-reviews.update', { validationId, decision, note }, () => {
    const state = db.get()
    const v = state.validations.find((x) => x.id === validationId)
    if (!v) throw new MockError('Validação não encontrada em revisão.')
    const blocker = reviewBlocker(state, actorId, v)
    if (blocker) throw new MockError(blocker)
    const text = decision === 'returned' ? requireText(note, 10, 'Diga ao validador o que reescrever.', 'note') : note.trim()
    const now = new Date().toISOString()
    const review = { reviewerId: actorId, decision, note: text, at: now }
    const validator = state.validators.find((x) => x.userId === v.validatorId)
    const snapshot = {
      name: state.users.find((u) => u.id === v.validatorId)?.name ?? v.validator.name,
      jobTitle: validator?.showEmployer ? validator.jobTitle : null,
      company: validator?.showEmployer ? validator.company : null,
    }
    db.set((s) => ({
      ...s,
      validations: s.validations.map((x) =>
        x.id === validationId
          ? decision === 'approved'
            ? { ...x, validator: snapshot, status: 'recorded' as const, recordedAt: now, review }
            : { ...x, status: 'draft' as const, review }
          : x,
      ),
      validationRequests:
        decision === 'approved'
          ? s.validationRequests.map((r) => (r.id === v.requestId ? { ...r, status: 'recorded' as const } : r))
          : s.validationRequests,
    }))
    track('validation_review_decided', { validationId, decision })
    if (decision === 'approved') {
      track('validation_recorded', { validationId, insufficientEvidence: v.insufficientEvidence })
      distribute()
    }
  })
}

export function openContestation(actorId: string, validationId: string, reason: string) {
  return mockAction('panel-admin.contestations.store', { validationId, reason }, () => {
    staff(actorId)
    const state = db.get()
    if (!state.validations.some((v) => v.id === validationId && v.status === 'recorded')) throw new MockError('Validação não encontrada.')
    if (state.contestations.some((c) => c.validationId === validationId && c.status === 'open')) throw new MockError('Já existe uma contestação aberta.')
    const text = requireText(reason, 20, 'Explique o motivo em ao menos 20 caracteres.', 'reason')
    db.set((s) => ({
      ...s,
      contestations: [...s.contestations, { id: newId(), validationId, openedBy: actorId, reason: text, status: 'open', decision: null, createdAt: new Date().toISOString() }],
    }))
    track('validation_contested', { validationId })
  })
}

/**
 * Decides a contestation. "Corrigir" sends the request back to the queue for a
 * new record that points to the old one; the old one stays visible.
 */
export function decideContestation(actorId: string, contestationId: string, outcome: 'upheld' | 'corrected', note: string) {
  return mockAction('panel-admin.contestations.update', { contestationId, outcome, note }, () => {
    superAdmin(actorId)
    const state = db.get()
    const c = state.contestations.find((x) => x.id === contestationId && x.status === 'open')
    const v = state.validations.find((x) => x.id === c?.validationId)
    if (!c || !v) throw new MockError('Contestação não encontrada.')
    if (actorId === v.validatorId || actorId === v.memberId) throw new MockError('Quem decide é alguém de fora do caso.')
    const text = requireText(note, 10, 'Explique a decisão.', 'note')
    const old = state.validationRequests.find((r) => r.id === v.requestId)
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      contestations: s.contestations.map((x) => (x.id === contestationId ? { ...x, status: outcome, decision: { by: actorId, note: text, at: now } } : x)),
      validationRequests:
        outcome === 'corrected' && old
          ? [
              ...s.validationRequests,
              {
                ...old,
                id: `${old.id}-c${newId().slice(0, 3)}`,
                status: 'queued' as const,
                validatorId: null,
                assignedAt: null,
                conflicts: [],
                requeuedAt: null,
                createdAt: now,
                supersedesId: v.id,
              },
            ]
          : s.validationRequests,
    }))
    if (outcome === 'corrected') distribute()
  })
}
