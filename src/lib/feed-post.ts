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

const RELATIVE = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const FULL_DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

/** "agora", "há 30 minutos", "há 5 horas", "ontem"; after a week, the short date. */
export function formatRelative(iso: string, now: number): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return RELATIVE.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return RELATIVE.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return RELATIVE.format(-days, 'day')
  return formatShortDate(iso, now)
}

const DAY_MONTH = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

/** "12 de nov." in the current year, "12 de nov. de 2025" before it, like social networks do. */
export function formatShortDate(iso: string, now: number): string {
  const date = new Date(iso)
  return date.getFullYear() === new Date(now).getFullYear() ? DAY_MONTH.format(date) : formatPostDate(iso)
}

/** "19 de novembro de 2026 às 14:30", for the `title` of a relative time. */
export function formatFullDate(iso: string): string {
  return FULL_DATE.format(new Date(iso))
}
