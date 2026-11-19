import type { ObjectiveProgress, ReactionType } from '@/mocks/db'

/**
 * The four answers to "quanto aproximou do objetivo", in order. Always shown
 * by name: never as a number, a bar or a color scale, never summed or averaged.
 */
export const OBJECTIVE_PROGRESS: { value: ObjectiveProgress; label: string }[] = [
  { value: 'none', label: 'Não aproximou' },
  { value: 'little', label: 'Aproximou pouco' },
  { value: 'a-lot', label: 'Aproximou bastante' },
  { value: 'very-much', label: 'Aproximou muito' },
]

const POST_DATE = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

/** "18 de nov. de 2026". */
export function formatPostDate(iso: string): string {
  return POST_DATE.format(new Date(iso))
}

/** Learning reactions, in the order the buttons show. */
export const REACTIONS: { value: ReactionType; label: string }[] = [
  { value: 'helped', label: 'Isso me ajudou' },
  { value: 'learning-too', label: 'Aprendendo também' },
  { value: 'want-to-learn', label: 'Quero aprender isso' },
  { value: 'inspiring', label: 'Inspirador' },
]
