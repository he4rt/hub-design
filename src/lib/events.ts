/*
 * He4rt events, still without a table or actions: the lab agenda and the Feed read the same list.
 * The dates are relative to the start of the viewer's day, so there is always something today, this week and later.
 */

export type EventKind = 'live' | 'call' | 'workshop' | 'meetup' | 'hackathon'

export type EventPlace =
  | { mode: 'online'; platform: 'Discord' | 'YouTube' | 'Twitch'; url: string }
  | { mode: 'in-person'; venue: string; address: string; city: string; uf: string }

export type HubEvent = {
  id: string
  title: string
  /** The name in a few words, for the calendar cell: read whole, never cut mid-word. */
  short: string
  kind: EventKind
  startsAt: string
  endsAt: string
  place: EventPlace
  /** Username of the member who leads it, linked to their profile. */
  hostUsername: string | null
  description: string
}

export const kindLabels: Record<EventKind, string> = {
  live: 'Live',
  call: 'Call',
  workshop: 'Workshop',
  meetup: 'Encontro',
  hackathon: 'Hackathon',
}

const DAY = 24 * 60 * 60 * 1000

/** Start of the viewer's day, so the generated agenda does not move while the day lasts. */
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** `days` from today at `hour`:`minute` local time, lasting `minutes`. */
function at(today: number, days: number, hour: number, minute: number, minutes: number) {
  const start = new Date(today + days * DAY)
  start.setHours(hour, minute, 0, 0)
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + minutes * 60_000).toISOString() }
}

export function labEvents(now: number, { liveNow = false, crowded = false, spread = false } = {}): HubEvent[] {
  const today = startOfDay(now)
  const live = liveNow
    ? { startsAt: new Date(now - 30 * 60_000).toISOString(), endsAt: new Date(now + 60 * 60_000).toISOString() }
    : at(today, 0, 20, 0, 90)
  // Debug only: three more events on the same day, to see "+N eventos" in the calendar.
  const extra: HubEvent[] = crowded
    ? [
        { id: 'x1', title: 'Call de mentoria para quem chegou agora', short: 'Mentoria', kind: 'call', ...at(today, 2, 12, 0, 60), place: { mode: 'online', platform: 'Discord', url: 'https://discord.gg/he4rt' }, hostUsername: 'bruno-lima', description: 'Perguntas abertas sobre por onde começar.' },
        { id: 'x2', title: 'Live: revisando PRs da comunidade', short: 'Revisão de PRs', kind: 'live', ...at(today, 2, 18, 0, 60), place: { mode: 'online', platform: 'Twitch', url: 'https://www.twitch.tv/he4rtdevs' }, hostUsername: 'daniel', description: 'PRs enviados pela comunidade, revisados ao vivo.' },
        { id: 'x3', title: 'Café He4rt em Belo Horizonte', short: 'Café BH', kind: 'meetup', ...at(today, 2, 19, 30, 120), place: { mode: 'in-person', venue: 'Café Kahlúa', address: 'Rua Pernambuco, 1000, Savassi', city: 'Belo Horizonte', uf: 'MG' }, hostUsername: null, description: 'Conversa sem pauta com quem está em BH.' },
        { id: 'x4', title: 'Workshop: Docker para o primeiro deploy', short: 'Docker no deploy', kind: 'workshop', ...at(today, 2, 20, 30, 90), place: { mode: 'online', platform: 'YouTube', url: 'https://www.youtube.com/@He4rtDevs' }, hostUsername: 'pedro-alves', description: 'Do Dockerfile ao deploy.' },
      ]
    : []
  // Debug only: in-person events in more states, to see the location filter turn into a select.
  const meetup = (id: string, days: number, city: string, uf: string, venue: string): HubEvent => ({
    id, title: `Encontro He4rt ${city}`, short: `Encontro ${city}`, kind: 'meetup', ...at(today, days, 15, 0, 180),
    place: { mode: 'in-person', venue, address: 'Endereço de exemplo, 100', city, uf }, hostUsername: null,
    description: `Conversas rápidas e gente da comunidade de ${city}.`,
  })
  const elsewhere: HubEvent[] = spread
    ? [
        meetup('s1', 9, 'Porto Alegre', 'RS', 'Instituto Caldeira'),
        meetup('s2', 12, 'Salvador', 'BA', 'Hub Salvador'),
        meetup('s3', 16, 'Brasília', 'DF', 'Biblioteca Nacional'),
        meetup('s4', 19, 'Manaus', 'AM', 'Impact Hub Manaus'),
        meetup('s5', 23, 'Curitiba', 'PR', 'Vale do Pinhão'),
      ]
    : []
  return [
    ...extra,
    ...elsewhere,
    {
      id: 'e1',
      title: 'Live: filas no Laravel do zero ao retry',
      short: 'Filas no Laravel',
      kind: 'live',
      ...live,
      place: { mode: 'online', platform: 'YouTube', url: 'https://www.youtube.com/@He4rtDevs' },
      hostUsername: 'daniel',
      description: 'Montando uma fila com retry e backoff ao vivo, com perguntas no chat.',
    },
    {
      id: 'e2',
      title: 'Call de revisão de código dos squads',
      short: 'Revisão de código',
      kind: 'call',
      ...at(today, 1, 19, 30, 60),
      place: { mode: 'online', platform: 'Discord', url: 'https://discord.gg/he4rt' },
      hostUsername: 'marina-duarte',
      description: 'Traga um PR do seu squad para revisar em grupo.',
    },
    {
      id: 'e3',
      title: 'Encontro He4rt Recife',
      short: 'Encontro Recife',
      kind: 'meetup',
      ...at(today, 3, 14, 0, 240),
      place: { mode: 'in-person', venue: 'Porto Digital, Armazém 14', address: 'Rua do Apolo, 181, Bairro do Recife', city: 'Recife', uf: 'PE' },
      hostUsername: 'ana-souza',
      description: 'Conversas rápidas, café e gente da comunidade do Nordeste.',
    },
    {
      id: 'e4',
      title: 'Workshop: testes de componente com Testing Library',
      short: 'Testing Library',
      kind: 'workshop',
      ...at(today, 5, 20, 0, 120),
      place: { mode: 'online', platform: 'Twitch', url: 'https://www.twitch.tv/he4rtdevs' },
      hostUsername: 'leticia-prado',
      description: 'Buscar pelo papel e não pela classe, na prática.',
    },
    {
      id: 'e5',
      title: 'Hackathon He4rt São Paulo',
      short: 'Hackathon SP',
      kind: 'hackathon',
      ...at(today, 12, 9, 0, 9 * 60),
      place: { mode: 'in-person', venue: 'Cubo Itaú', address: 'Rua Casa do Ator, 919, Vila Olímpia', city: 'São Paulo', uf: 'SP' },
      hostUsername: null,
      description: 'Um dia para tirar do papel um projeto da comunidade, em times de quatro.',
    },
    {
      id: 'e6',
      title: 'Live: como montar o perfil antes do teste de entrada',
      short: 'Perfil e teste de entrada',
      kind: 'live',
      ...at(today, 18, 20, 0, 60),
      place: { mode: 'online', platform: 'YouTube', url: 'https://www.youtube.com/@He4rtDevs' },
      hostUsername: 'daniel',
      description: 'O que mostrar na trajetória e como escrever o Sobre.',
    },
  ]
}

/** Online or in person, in a few words: "Online, no YouTube", "Recife, PE". */
export function placeLabel(place: EventPlace): string {
  return place.mode === 'online' ? `Online, no ${place.platform}` : `${place.city}, ${place.uf}`
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit' })

/** "20h", "19h30": the hour the way the community writes it. */
export function formatHour(iso: string): string {
  const [h, m] = timeFormat.format(new Date(iso)).split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

/** "Hoje", "Amanhã", or "sábado, 28 de novembro". */
export function formatEventDay(iso: string, now: number): string {
  const days = Math.round((startOfDay(new Date(iso).getTime()) - startOfDay(now)) / DAY)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `${weekday.format(new Date(iso))}, ${dayMonth.format(new Date(iso))}`
}

export type EventWhen = 'now' | 'today' | 'week' | 'later' | 'past'

export function eventWhen(event: HubEvent, now: number): EventWhen {
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()
  if (end <= now) return 'past'
  if (start <= now) return 'now'
  const days = Math.round((startOfDay(start) - startOfDay(now)) / DAY)
  if (days === 0) return 'today'
  return days <= 7 ? 'week' : 'later'
}

function where(place: EventPlace): string {
  return place.mode === 'online' ? place.url : `${place.venue}, ${place.address}, ${place.city}, ${place.uf}`
}

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Google Calendar's "new event" link, filled in. */
export function googleCalendarUrl(event: HubEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.startsAt)}/${stamp(event.endsAt)}`,
    details: event.description,
    location: where(event.place),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

/** An .ics file for Apple Calendar, Outlook and the rest. */
export function icsFile(event: HubEvent): string {
  const escape = (text: string) => text.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//He4rt Hub//Eventos//PT-BR',
    'BEGIN:VEVENT',
    `UID:${event.id}@hub.he4rt.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(where(event.place))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** The five Brazilian regions, for the location filter of in-person events. */
export const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
}

export const regionOf = (uf: string) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(uf)) ?? null
