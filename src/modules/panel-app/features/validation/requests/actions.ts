import { track } from '@/mocks/analytics'
import { db, newId, type MockDb } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { distribute, MEMBER_OPEN_REQUESTS } from '@/mocks/validation'

export function openRequests(state: MockDb, memberId: string) {
  return state.validationRequests.filter((r) => r.memberId === memberId && (r.status === 'queued' || r.status === 'assigned'))
}

/** Accepted deliveries the member is credited on, grouped by the project they came from. */
export function validatableDeliveries(state: MockDb, memberId: string) {
  return state.deliveries.filter((d) => d.status === 'accepted' && d.credits.some((c) => c.userId === memberId))
}

/** "Pedir validação": enters the single queue and goes to the next validator with a free slot. */
export function requestValidation(memberId: string, input: { deliveryIds: string[]; criterionId: string }) {
  return mockAction('panel-app.validation-requests.store', input, () => {
    const state = db.get()
    if (openRequests(state, memberId).length >= MEMBER_OPEN_REQUESTS) {
      throw new MockError(`Você já tem ${MEMBER_OPEN_REQUESTS} pedidos abertos. Espere um ser registrado.`)
    }
    const deliveries = validatableDeliveries(state, memberId).filter((d) => input.deliveryIds.includes(d.id))
    if (deliveries.length === 0 || deliveries.length !== input.deliveryIds.length) {
      throw new MockError('Escolha entregas aceitas em que você tem crédito.', 'deliveries')
    }
    const projectId = deliveries[0].projectId
    if (deliveries.some((d) => d.projectId !== projectId)) throw new MockError('As entregas precisam ser do mesmo projeto.', 'deliveries')
    const project = state.teamProjects.find((p) => p.id === projectId)
    if (!project?.evaluationCriteria.some((c) => c.id === input.criterionId)) {
      throw new MockError('Escolha uma competência dos critérios de avaliação do projeto.', 'criterion')
    }
    const id = newId()
    db.set((s) => ({
      ...s,
      validationRequests: [
        ...s.validationRequests,
        {
          id,
          memberId,
          projectId,
          deliveryIds: input.deliveryIds,
          criterionId: input.criterionId,
          status: 'queued',
          validatorId: null,
          assignedAt: null,
          conflicts: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    track('validation_requested', { requestId: id })
    distribute()
    return { id }
  })
}

export function cancelValidationRequest(memberId: string, requestId: string) {
  return mockAction('panel-app.validation-requests.destroy', { requestId }, () => {
    const request = db.get().validationRequests.find((r) => r.id === requestId && r.memberId === memberId)
    if (!request) throw new MockError('Pedido não encontrado.')
    if (request.status !== 'queued') throw new MockError('Só dá para cancelar um pedido que ainda está na fila.')
    db.set((s) => ({
      ...s,
      validationRequests: s.validationRequests.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' as const } : r)),
    }))
  })
}
