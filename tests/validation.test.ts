import { beforeEach, expect, test } from 'bun:test'
import type { ValidationDraft } from '@/modules/panel-app/features/validation/queue/actions'
import type { Validation } from '@/mocks/db'

// Run the public action handlers against an in-memory store only, never the API/database.
Object.assign(globalThis, { __HUB_SERVER__: true, window: { matchMedia: () => ({ matches: false }) } })
const { db, seedState } = await import('@/mocks/db')
const { validationHistory } = await import('@/mocks/validation')
const { recordValidation, saveValidationDraft, declareConflict } = await import('@/modules/panel-app/features/validation/queue/actions')
const { decideReview, reassignValidationRequest, openContestation, suspendValidator, reinstateValidator } = await import('@/modules/panel-admin/features/validation/actions')

const draft: ValidationDraft = {
  context: 'Contexto observado nas entregas aceitas do projeto.',
  contribution: 'Implementou os testes e o fluxo de cadastro do projeto.',
  strengths: [{ text: 'Cobriu os principais cenários.', evidenceRef: 'repo#34' }],
  improvements: [{ text: 'Falta cobrir timeout.', evidenceRef: 'repo#34', suggestion: 'Simular o timeout nos testes.' }],
  conflictDeclared: false, conflictDescription: '', insufficientEvidence: false,
}
let original: Validation
let requestId: string
let validatorId: string
let adminId: string

beforeEach(() => {
  const state = structuredClone(seedState)
  original = structuredClone(state.validations[0])
  requestId = original.requestId
  validatorId = original.validatorId
  adminId = state.users.find((u) => u.role === 'super-admin' && u.id !== validatorId && u.id !== original.memberId)!.id
  state.validationRequests = state.validationRequests.filter((r) => r.id === requestId).map((r) => ({ ...r, status: 'assigned', validatorId }))
  state.validations = []
  state.events = []
  state.contestations = []
  db.set(() => state)
})

const offensiveInputs: [string, (d: ValidationDraft) => void][] = [
  ['context', (d) => { d.context += ' idiota' }],
  ['contribution', (d) => { d.contribution += ' idiota' }],
  ['strength', (d) => { d.strengths[0].text = 'idiota' }],
  ['improvement', (d) => { d.improvements[0].text = 'idiota' }],
  ['suggestion', (d) => { d.improvements[0].suggestion = 'idiota' }],
  ['strength evidence', (d) => { d.strengths[0].evidenceRef = 'idiota' }],
  ['improvement evidence', (d) => { d.improvements[0].evidenceRef = 'idiota' }],
  ['conflict', (d) => { d.conflictDeclared = true; d.conflictDescription = 'Esta pessoa é idiota' }],
]
for (const [field, change] of offensiveInputs) {
  test(`moderates ${field} without changing the saved draft or emitting success`, async () => {
    await saveValidationDraft(validatorId, requestId, draft)
    const before = structuredClone(db.get())
    const input = structuredClone(draft)
    change(input)
    await expect(recordValidation(validatorId, requestId, input)).rejects.toThrow('Reescreva')
    expect(db.get()).toEqual(before)
  })
}

test('in-review cannot be overwritten or conflicted; independent review snapshots final consent', async () => {
  await recordValidation(validatorId, requestId, draft)
  const validation = db.get().validations[0]
  expect(validation.status).toBe('in-review')
  for (const operation of [
    () => saveValidationDraft(validatorId, requestId, draft),
    () => recordValidation(validatorId, requestId, draft),
    () => declareConflict(validatorId, requestId, 'Trabalhamos no mesmo projeto.'),
  ]) await expect(operation()).rejects.toThrow('em revisão')
  await expect(decideReview(validatorId, validation.id, 'approved', '')).rejects.toThrow()
  db.set((s) => ({ ...s, validators: s.validators.map((v) => v.userId === validatorId ? { ...v, showEmployer: false, company: 'Private changed employer' } : v) }))
  await decideReview(adminId, validation.id, 'approved', '')
  const recorded = db.get().validations.find((v) => v.id === validation.id)!
  expect(recorded).toMatchObject({ status: 'recorded', published: false, validator: { company: null, jobTitle: null } })
  await expect(saveValidationDraft(validatorId, requestId, draft)).rejects.toThrow()
  expect(db.get().validations.find((v) => v.id === validation.id)).toEqual(recorded)
})

test('manual reassignment discards non-final content and emits exactly one assignment', async () => {
  await saveValidationDraft(validatorId, requestId, draft)
  const target = db.get().users.find((u) => ![validatorId, original.memberId, adminId].includes(u.id))!.id
  db.set((s) => ({ ...s, memberships: [], squads: s.squads.map((q) => ({ ...q, captainId: adminId })), validators: [...s.validators.filter((v) => v.userId !== target), { ...s.validators[0], userId: target, suspension: null }] }))
  await reassignValidationRequest(adminId, requestId, target)
  expect(db.get().validationRequests[0].validatorId).toBe(target)
  expect(db.get().validations).toEqual([])
  expect(db.get().events.filter((e) => e.event === 'validation_assigned')).toHaveLength(1)
  expect(db.get().events[0].props).toEqual({ requestId })
  await expect(reassignValidationRequest(adminId, requestId, target)).rejects.toThrow()
  expect(db.get().events).toHaveLength(1)
})

test('suspension requires a reason, preserves recorded content, and reinstates', async () => {
  await saveValidationDraft(validatorId, requestId, draft)
  db.set((s) => ({ ...s, validations: [...s.validations, { ...original, id: 'old-final', requestId: 'old-request' }], validators: s.validators.filter((v) => v.userId === validatorId) }))
  await expect(suspendValidator(adminId, validatorId, '')).rejects.toThrow('motivo')
  await suspendValidator(adminId, validatorId, 'Ausência temporária para acompanhar os pedidos.')
  expect(db.get().validators[0].suspension?.reason).toContain('Ausência')
  expect(db.get().validationRequests[0]).toMatchObject({ status: 'queued', validatorId: null })
  expect(db.get().validations).toEqual([{ ...original, id: 'old-final', requestId: 'old-request' }])
  await reinstateValidator(adminId, validatorId)
  expect(db.get().validators[0].suspension).toBeNull()
})

test('staff opens a contestation without altering publication or duplicating an open case', async () => {
  db.set((s) => ({ ...s, validations: [original] }))
  await openContestation(adminId, original.id, 'A evidência citada pertence a outra entrega.')
  expect(db.get().contestations[0]).toMatchObject({ validationId: original.id, openedBy: adminId, status: 'open' })
  expect(db.get().validations).toEqual([original])
  await expect(openContestation(adminId, original.id, 'Outro motivo com tamanho suficiente.')).rejects.toThrow('Já existe')
  expect(db.get().events.filter((e) => e.event === 'validation_contested')).toHaveLength(1)
})

test('public history stops at private, missing, draft, foreign or cyclic predecessors; owner keeps the chain', () => {
  const a = { ...original, id: 'a', published: true, supersedesId: null }
  const b = { ...original, id: 'b', published: true, supersedesId: 'a' }
  const c = { ...original, id: 'c', published: true, supersedesId: 'b' }
  expect(validationHistory([a, b, c], c).map((v) => v.id)).toEqual(['b', 'a'])
  const privateB = { ...b, published: false }
  expect(validationHistory([a, privateB, c], c)).toEqual([])
  expect(validationHistory([a, privateB, c], c, true).map((v) => v.id)).toEqual(['b', 'a'])
  for (const hiddenB of [{ ...b, status: 'draft' as const }, { ...b, memberId: 'foreign' }]) {
    expect(validationHistory([a, hiddenB, c], c)).toEqual([])
  }
  expect(validationHistory([a, c], c)).toEqual([])
  expect(validationHistory([a, b, c], { ...c, published: false })).toEqual([])
  expect(validationHistory([{ ...a, supersedesId: 'c' }, b, c], c).map((v) => v.id)).toEqual(['b', 'a'])
})
