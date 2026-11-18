import { track } from '@/mocks/analytics'
import { db, newId } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { requireText } from '@/mocks/squads'

export type ValidatorApplicationInput = {
  summary: string
  links: string
  jobTitle: string
  company: string
  showEmployer: boolean
}

const URL_PATTERN = /^https?:\/\/\S+\.\S+$/

/** "Quero validar": technical proof the staff weighs. A decline is never permanent. */
export function applyAsValidator(userId: string, input: ValidatorApplicationInput) {
  return mockAction('panel-app.validator-applications.store', input, () => {
    const state = db.get()
    if (state.validators.some((v) => v.userId === userId)) throw new MockError('Você já é validador.')
    if (state.validatorApplications.some((a) => a.userId === userId && a.status === 'pending')) {
      throw new MockError('Seu pedido anterior ainda está com a staff.')
    }
    const summary = requireText(input.summary, 80, 'Conte sua experiência em ao menos 80 caracteres.', 'summary')
    const links = input.links.split(/\s+/).filter(Boolean)
    if (links.length === 0) throw new MockError('Inclua ao menos um link: GitHub, LinkedIn, portfólio ou contribuições.', 'links')
    if (links.some((l) => !URL_PATTERN.test(l))) throw new MockError('Cada link precisa começar com https://', 'links')
    const jobTitle = requireText(input.jobTitle, 2, 'Informe seu cargo atual.', 'jobTitle')
    const company = requireText(input.company, 2, 'Informe a empresa atual.', 'company')
    db.set((s) => ({
      ...s,
      validatorApplications: [
        ...s.validatorApplications,
        {
          id: newId(),
          userId,
          summary,
          links,
          jobTitle,
          company,
          showEmployer: input.showEmployer,
          status: 'pending',
          decision: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    track('validator_application_submitted', { userId })
  })
}

/** Job title, company and whether they show; each validation keeps the values of its record time. */
export function updateValidatorProfile(userId: string, input: { jobTitle: string; company: string; showEmployer: boolean }) {
  return mockAction('panel-app.validator-profile.update', input, () => {
    if (!db.get().validators.some((v) => v.userId === userId)) throw new MockError('Você não é validador.')
    const jobTitle = requireText(input.jobTitle, 2, 'Informe seu cargo atual.', 'jobTitle')
    const company = requireText(input.company, 2, 'Informe a empresa atual.', 'company')
    db.set((s) => ({
      ...s,
      validators: s.validators.map((v) => (v.userId === userId ? { ...v, jobTitle, company, showEmployer: input.showEmployer } : v)),
    }))
  })
}
