import { track } from './analytics'
import { db, type MockDb, type Validation, type ValidationRequest } from './db'
import { isStaff } from './squads'

/** Validations open at once per validator. */
export const VALIDATOR_WINDOW = 3
/** A new validator's first validations go through review before they are recorded. */
export const REVIEWED_VALIDATIONS = 5
/** Open requests a member can have at once. */
export const MEMBER_OPEN_REQUESTS = 3
/** An assigned request older than this shows as stalled to the staff. No deadline is promised to the member. */
export const STALLED_DAYS = 21

export function isActiveValidator(state: MockDb, userId: string | undefined): boolean {
  return state.validators.some((v) => v.userId === userId && v.suspension === null)
}

/** Assigned requests, drafts and validations in review all hold a slot. */
export function openCount(state: MockDb, validatorId: string): number {
  return state.validationRequests.filter((r) => r.validatorId === validatorId && r.status === 'assigned').length
}

export function needsReview(state: MockDb, validatorId: string): boolean {
  return state.validations.filter((v) => v.validatorId === validatorId && v.status === 'recorded').length < REVIEWED_VALIDATIONS
}

/** A review only applies to the current assignment, by staff outside the case. */
export function reviewBlocker(state: MockDb, actorId: string, validation: Validation): string | null {
  if (!isStaff(state.users.find((u) => u.id === actorId))) return 'Só a staff faz isso.'
  if (validation.status !== 'in-review') return 'Validação não encontrada em revisão.'
  const request = state.validationRequests.find((r) => r.id === validation.requestId)
  if (request?.status !== 'assigned' || request.validatorId !== validation.validatorId) {
    return 'O pedido não está mais atribuído a este validador.'
  }
  if (actorId === validation.validatorId || actorId === validation.memberId) return 'Quem revisa não pode ser o validador nem o membro.'
  return null
}

/** Who may validate this request: from outside the squad, never the captain, never after a conflict. */
export function isEligible(state: MockDb, validatorId: string, request: ValidationRequest): boolean {
  const validator = state.validators.find((v) => v.userId === validatorId)
  if (!validator || validator.suspension) return false
  if (validatorId === request.memberId) return false
  if (openCount(state, validatorId) >= VALIDATOR_WINDOW) return false
  const project = state.projects.find((p) => p.id === request.projectId)
  const squad = state.squads.find((s) => s.id === project?.squadId)
  if (squad?.captainId === validatorId) return false
  if (state.memberships.some((m) => m.squadId === squad?.id && m.userId === validatorId)) return false
  const conflicted = state.validationRequests.some(
    (r) => r.memberId === request.memberId && r.conflicts.some((c) => c.validatorId === validatorId),
  )
  return !conflicted
}

/**
 * Hands queued requests, oldest first, to the eligible validator who has
 * waited longest for one. Runs whenever a request enters the queue, a slot
 * frees, a validator is enabled or a conflict is declared.
 */
export function distribute() {
  const assigned: string[] = []
  for (;;) {
    const state = db.get()
    const queue = state.validationRequests
      .filter((r) => r.status === 'queued')
      .sort(byQueueOrder)
    let progressed = false
    for (const request of queue) {
      const candidate = state.validators
        .filter((v) => isEligible(state, v.userId, request))
        .sort((a, b) => (a.lastAssignedAt ?? '').localeCompare(b.lastAssignedAt ?? ''))[0]
      if (!candidate) continue
      const now = new Date().toISOString()
      db.set((s) => ({
        ...s,
        validationRequests: s.validationRequests.map((r) =>
          r.id === request.id ? { ...r, status: 'assigned' as const, validatorId: candidate.userId, assignedAt: now } : r,
        ),
        validators: s.validators.map((v) => (v.userId === candidate.userId ? { ...v, lastAssignedAt: now } : v)),
      }))
      track('validation_assigned', { requestId: request.id })
      assigned.push(request.id)
      progressed = true
      break
    }
    if (!progressed) return assigned
  }
}

/** Oldest first; a request sent back to the queue goes to the front. */
export function byQueueOrder(a: ValidationRequest, b: ValidationRequest): number {
  return Number(!!b.requeuedAt) - Number(!!a.requeuedAt) || a.createdAt.localeCompare(b.createdAt)
}

export function evaluationCriterion(state: MockDb, request: ValidationRequest) {
  return state.projects.find((p) => p.id === request.projectId)?.evaluationCriteria.find((c) => c.id === request.criterionId)
}

/** Walk only authorized links; a missing/private link never discloses its predecessors. */
export function validationHistory(validations: Validation[], current: Validation, includePrivate = false): Validation[] {
  if (current.status !== 'recorded' || (!includePrivate && !current.published)) return []
  const history: Validation[] = []
  const visited = new Set([current.id])
  let previousId = current.supersedesId
  while (previousId && !visited.has(previousId)) {
    const previous = validations.find((v) => v.id === previousId && v.memberId === current.memberId && v.status === 'recorded' && (includePrivate || v.published))
    if (!previous) break
    visited.add(previous.id)
    history.push(previous)
    previousId = previous.supersedesId
  }
  return history
}
