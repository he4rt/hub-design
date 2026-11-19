import { track } from '@/mocks/analytics'
import { db, type SquadDelivery } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { appendLog, canManageSquad, isSuperAdmin, requireText } from '@/mocks/squads'

export type DeliveryDecision = {
  credits: { userId: string; part: string }[]
  collaboration: SquadDelivery['collaboration']
  context: string
}

function managed(actorId: string, deliveryId: string) {
  const state = db.get()
  const delivery = state.deliveries.find((d) => d.id === deliveryId)
  const project = state.projects.find((p) => p.id === delivery?.projectId)
  if (!delivery || !project) throw new MockError('Entrega não encontrada.')
  if (!canManageSquad(state, project.squadId, actorId)) throw new MockError('Só o capitão do squad decide as entregas.')
  if (delivery.status !== 'pending') throw new MockError('Esta entrega já foi decidida.')
  return { delivery, project, state }
}

/** A delivery credited only to the captain goes to the super admin, never to the captain alone. */
export function needsSuperAdmin(captainId: string | null, credits: { userId: string }[]): boolean {
  return credits.length > 0 && credits.every((c) => c.userId === captainId)
}

export function acceptDelivery(actorId: string, deliveryId: string, input: DeliveryDecision) {
  return mockAction('panel-app.squads.deliveries.update', { deliveryId, status: 'accepted', ...input }, () => {
    const { delivery, project, state } = managed(actorId, deliveryId)
    const credits = input.credits
      .map((c) => ({ userId: c.userId, part: c.part.trim() }))
      .filter((c) => c.part)
    if (credits.length === 0) throw new MockError('Registre o que ao menos uma pessoa fez.', 'credits')
    credits.forEach((c) => requireText(c.part, 3, 'Descreva a parte de cada pessoa.', 'credits'))
    const context = requireText(input.context, 20, 'Escreva o contexto que o validador vai ler (20 caracteres ou mais).', 'context')
    const item = state.boardItems.find((i) => i.id === delivery.boardItemId)
    if (delivery.kind === 'technical' && !item?.pullRequests.some((pr) => pr.merged)) {
      throw new MockError('Entrega técnica precisa de um PR merged.')
    }
    const squad = state.squads.find((s) => s.id === project.squadId)
    const actor = state.users.find((u) => u.id === actorId)
    if (needsSuperAdmin(squad?.captainId ?? null, credits) && !isSuperAdmin(actor)) {
      throw new MockError('Uma entrega creditada só ao capitão é aceita pelo super admin.')
    }
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId
          ? { ...d, status: 'accepted' as const, credits, collaboration: input.collaboration, context, decidedBy: actorId, decidedAt: now, returnedReason: null }
          : d,
      ),
    }))
    credits.forEach((c) =>
      appendLog({ squadId: project.squadId, projectId: project.id, kind: 'delivery-accepted', actorId, subjectId: c.userId, detail: delivery.title }),
    )
    track('delivery_accepted', { deliveryId, credited: credits.length })
  })
}

export function returnDelivery(actorId: string, deliveryId: string, reason: string) {
  return mockAction('panel-app.squads.deliveries.update', { deliveryId, status: 'returned', reason }, () => {
    managed(actorId, deliveryId)
    const text = requireText(reason, 10, 'Diga o motivo da devolução.', 'reason')
    db.set((s) => ({
      ...s,
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId
          ? { ...d, status: 'returned' as const, returnedReason: text, decidedBy: actorId, decidedAt: new Date().toISOString() }
          : d,
      ),
    }))
    track('delivery_returned', { deliveryId })
  })
}
