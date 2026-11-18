// Seed dates are calendar dates, so format them in UTC to keep the same day in every timezone.
const dayMonthYear = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "mar 2026" */
export function formatMonth(iso: string): string {
  return monthYear.format(new Date(iso)).replace('.', '').replace(' de ', ' ')
}

/** "fev 2021 – ago 2025", or "set 2025 – atual" while it is ongoing. */
export function formatPeriod(startedAt: string, endedAt: string | null): string {
  return `${formatMonth(startedAt)} – ${endedAt ? formatMonth(endedAt) : 'atual'}`
}

/** "12 de ago. de 2026" */
export function formatDay(iso: string): string {
  return dayMonthYear.format(new Date(iso))
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' })

/** "há 3 horas", "há 2 dias"; older than a month, the day itself. `now` comes from `useNow`. */
export function formatRelative(iso: string, now: number): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 30) return relative.format(-days, 'day')
  return formatDay(iso)
}
