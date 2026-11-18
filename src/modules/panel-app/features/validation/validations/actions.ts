import { track } from '@/mocks/analytics'
import { db, newId } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { requireText } from '@/mocks/squads'

function own(memberId: string, validationId: string) {
  const state = db.get()
  const validation = state.validations.find((v) => v.id === validationId && v.memberId === memberId && v.status === 'recorded')
  if (!validation) throw new MockError('Validação não encontrada.')
  return { validation, state }
}

/** Publishing needs the public profile on; the validation always goes whole. */
export function canPublish(published: boolean): boolean {
  return published
}

export function setValidationPublished(memberId: string, validationId: string, published: boolean) {
  return mockAction(
    published ? 'panel-app.validations.publication.store' : 'panel-app.validations.publication.destroy',
    { validationId },
    () => {
      const { state } = own(memberId, validationId)
      const member = state.users.find((u) => u.id === memberId)
      if (published && !canPublish(member?.published ?? false)) {
        throw new MockError('Ligue o perfil público para publicar validações.')
      }
      db.set((s) => ({
        ...s,
        validations: s.validations.map((v) =>
          v.id === validationId ? { ...v, published, publishedAt: published ? new Date().toISOString() : null } : v,
        ),
      }))
      track(published ? 'validation_published' : 'validation_unpublished', { validationId })
    },
  )
}

export function hasOpenContestation(contestations: { validationId: string; status: string }[], validationId: string) {
  return contestations.some((c) => c.validationId === validationId && c.status === 'open')
}

/** Contesting opens a case; a correction is a new record that keeps the old one visible. */
export function contestValidation(memberId: string, validationId: string, reason: string) {
  return mockAction('panel-app.validations.contestations.store', { validationId, reason }, () => {
    const { state } = own(memberId, validationId)
    if (hasOpenContestation(state.contestations, validationId)) throw new MockError('Já existe uma contestação aberta.')
    const text = requireText(reason, 20, 'Explique o motivo em ao menos 20 caracteres.', 'reason')
    db.set((s) => ({
      ...s,
      contestations: [
        ...s.contestations,
        { id: newId(), validationId, openedBy: memberId, reason: text, status: 'open', decision: null, createdAt: new Date().toISOString() },
      ],
    }))
    track('validation_contested', { validationId })
  })
}
