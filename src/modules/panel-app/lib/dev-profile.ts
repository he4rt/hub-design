import { AREAS, LANGUAGES, LANGUAGES_MAX, OBJECTIVES, STARTING_POINTS } from '@/lib/member-profile'
import type { Area, Objective, StartingPoint } from '@/mocks/db'
import { MockError } from '@/mocks/mock-action'

export type DevProfileInput = {
  objective: Objective | null
  areas: Area[]
  startingPoint: StartingPoint | null
  languages: string[]
}

/**
 * Backend checks of the profile questions, shared by the onboarding and the
 * profile page. Only the areas are required once answered; the onboarding
 * asks them one question at a time.
 */
export function validateDevProfile(input: DevProfileInput, { requireAreas = true } = {}) {
  if (input.objective && !OBJECTIVES.some((option) => option.value === input.objective)) {
    throw new MockError('Objetivo inválido.', 'objective')
  }
  if (requireAreas && input.areas.length === 0) throw new MockError('Escolha ao menos uma área.', 'areas')
  if (!input.areas.every((area) => AREAS.some((option) => option.value === area))) {
    throw new MockError('Área inválida.', 'areas')
  }
  if (input.startingPoint && !STARTING_POINTS.some((option) => option.value === input.startingPoint)) {
    throw new MockError('Ponto de partida inválido.', 'startingPoint')
  }
  if (input.languages.length > LANGUAGES_MAX) {
    throw new MockError(`Escolha até ${LANGUAGES_MAX} linguagens.`, 'languages')
  }
  if (!input.languages.every((language) => LANGUAGES.includes(language))) {
    throw new MockError('Linguagem inválida.', 'languages')
  }
}
