import { useId, useState } from 'react'
import { CalendarDays, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Video } from 'lucide-react'
import { Collapsible, DropdownMenu, Select } from 'radix-ui'
import { Link } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { useDb, type MockDb } from '@/mocks/db'
import { AppShell } from './app-shell'
import {
  eventWhen,
  formatEventDay,
  formatHour,
  googleCalendarUrl,
  icsFile,
  kindLabels,
  labEvents,
  placeLabel,
  REGIONS,
  regionOf,
  startOfDay,
  type EventWhen,
  type HubEvent,
} from '@/lib/events'
import { Button, Chip } from './parts'
import { malhaStore, useLabParams } from './theme'
import './profile.css'
import './events.css'

const MODES = { online: 'Online', presencial: 'Presencial' } as const
type Mode = keyof typeof MODES

const DAY = 24 * 60 * 60 * 1000
const dayNumber = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' })
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const weekdayLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const shortDate = (t: number) => `${dayNumber.format(t)} ${monthShort.format(t).replace('.', '')}`

/** Each period with the dates it covers, so "Próximos 7 dias" says which seven. */
const GROUPS: { when: EventWhen[]; title: string; range: (today: number) => string }[] = [
  { when: ['now', 'today'], title: 'Hoje', range: (today) => shortDate(today) },
  { when: ['week'], title: 'Próximos 7 dias', range: (today) => `${shortDate(today + DAY)} a ${shortDate(today + 7 * DAY)}` },
  { when: ['later'], title: 'Mais adiante', range: (today) => `A partir de ${shortDate(today + 8 * DAY)}` },
]

/** "Hoje", "Amanhã" or the weekday: the date block already says the day and month. */
function weekdayOf(iso: string, now: number) {
  const days = Math.round((startOfDay(new Date(iso).getTime()) - startOfDay(now)) / DAY)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  const name = weekdayLong.format(new Date(iso))
  return name[0].toUpperCase() + name.slice(1)
}

/**
 * The He4rt agenda: when and where each event is, online or in person, and a way to put it in the
 * member's own calendar. Lab data only; in the app the staff creates events in /admin/community/events.
 */
export default function Events() {
  const state = useDb((s) => s)
  const now = useNow()
  const [params, setParams] = useLabParams()
  const [liveNow, setLiveNow] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [crowded, setCrowded] = useState(false)
  const [spread, setSpread] = useState(false)
  const modo = params.get('modo') as Mode | null
  const mode = modo && modo in MODES ? modo : null
  const view = params.get('vista') === 'lista' ? 'lista' : 'calendario'
  // Merges into the URL, so the filters, the view, the month and the day stay together.
  const set = (patch: Record<string, string | null>) =>
    setParams(
      (current) => {
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) current.delete(key)
          else current.set(key, value)
        }
        return current
      },
      { preventScrollReset: true },
    )

  useDebugActions('Eventos (Técnico × Traçado)', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: liveNow ? 'Live de hoje às 20h' : 'Live acontecendo agora', run: () => setLiveNow((l) => !l) },
    { label: empty ? 'Mostrar os eventos' : 'Ver a agenda vazia', run: () => setEmpty((e) => !e) },
    { label: crowded ? 'Um evento por dia' : 'Vários eventos no mesmo dia', run: () => setCrowded((c) => !c) },
    { label: spread ? 'Eventos em poucos estados' : 'Eventos em vários estados', run: () => setSpread((v) => !v) },
  ])

  const all = empty ? [] : labEvents(now, { liveNow, crowded, spread })
  const upcoming = all.filter((e) => eventWhen(e, now) !== 'past')
  const ufsAll = [...new Set(all.flatMap((e) => (e.place.mode === 'in-person' ? [e.place.uf] : [])))].toSorted()
  // Location narrows the in-person events. Online, it does not apply: it stays in the URL but is
  // ignored, so going back to Tudo or Presencial brings the same choice back. A region is only
  // offered by the select, and a state only while some event is there.
  const region = mode === 'online' || ufsAll.length <= PLACE_CHIPS ? null : params.get('regiao')
  const uf = mode === 'online' || !ufsAll.includes(params.get('uf') ?? '') ? null : params.get('uf')
  // With Tudo, location narrows only the in-person events; the online ones stay.
  const inPlace = (e: HubEvent) =>
    e.place.mode === 'online'
      ? mode !== 'presencial'
      : (!region || regionOf(e.place.uf) === region) && (!uf || e.place.uf === uf)
  const matches = (e: HubEvent) => (!mode || (mode === 'online') === (e.place.mode === 'online')) && inPlace(e)
  const shown = upcoming.filter(matches)

  return (
    <AppShell screen="events" path="/design-lab/eventos">
      {() => (
        <main className="txf-main" data-single data-wide>
          <header className="txf-head">
            <div>
              <h1>Eventos</h1>
              <p>Lives, calls e encontros da He4rt, online e presenciais. Horários no seu fuso.</p>
            </div>
            {/* How to see the agenda sits with the page title, apart from what to filter. */}
            <div className="txe-views" role="group" aria-label="Visualização">
              <button type="button" aria-pressed={view === 'calendario'} onClick={() => set({ vista: null })}>
                Calendário
              </button>
              <button type="button" aria-pressed={view === 'lista'} onClick={() => set({ vista: 'lista' })}>
                Lista
              </button>
            </div>
          </header>

          <div className="txf-body">
            <div className="txf-column txe">
              <div className="txe-toolbar">
                <div className="txe-filters">
                  <div className="txe-filter-group">
                    <span className="txe-filter-group__label" id="txe-f-mode">
                      Modalidade
                    </span>
                    <div className="txp-filter" role="group" aria-labelledby="txe-f-mode">
                      {([null, 'online', 'presencial'] as (Mode | null)[]).map((value) => (
                        <button
                          key={value ?? 'all'}
                          type="button"
                          className="txp-filter__item"
                          aria-pressed={mode === value}
                          onClick={() => set({ modo: value })}
                        >
                          {value ? MODES[value] : 'Tudo'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ufsAll.length > 0 && (
                    <div className="txe-filter-group" data-off={mode === 'online' || undefined}>
                      <span className="txe-filter-group__label" id="txe-f-place">
                        Localização
                        <span className="txe-filter-group__hint">
                          {mode === 'online' ? 'Não se aplica a eventos online' : mode ? null : 'Só filtra os presenciais'}
                        </span>
                      </span>
                      <PlaceFilter
                        ufs={ufsAll}
                        region={region}
                        uf={uf}
                        disabled={mode === 'online'}
                        onChange={(next) => set(next)}
                      />
                    </div>
                  )}
                </div>

              </div>

              {view === 'calendario' ? (
                <Calendar
                  events={all.filter(matches)}
                  state={state}
                  now={now}
                  month={params.get('mes')}
                  day={params.get('dia')}
                  onChange={set}
                />
              ) : shown.length === 0 ? (
                <div className="txf-empty">
                  <p className="tx-empty__title">Nenhum evento marcado</p>
                  <p className="tx-meta">
                    {upcoming.length === 0
                      ? 'Quando a He4rt marcar uma live ou um encontro, ele aparece aqui e no Feed.'
                      : 'Nada com esse filtro. Veja todos os formatos.'}
                  </p>
                  {upcoming.length > 0 && <Button onClick={() => set({ modo: null, regiao: null, uf: null })}>Ver todos</Button>}
                </div>
              ) : (
                GROUPS.map((group) => {
                  const items = shown.filter((e) => group.when.includes(eventWhen(e, now)))
                  if (items.length === 0) return null
                  return (
                    <section key={group.title} className="txe-group" aria-label={group.title}>
                      <header className="txe-group__head">
                        <h2>{group.title}</h2>
                        <span className="txe-group__range">{group.range(startOfDay(now))}</span>
                        <span className="txe-group__count">{items.length === 1 ? '1 evento' : `${items.length} eventos`}</span>
                      </header>
                      <ol className="txe-list">
                        {items.map((event) => (
                          <li key={event.id}>
                            <EventItem event={event} state={state} now={now} />
                          </li>
                        ))}
                      </ol>
                    </section>
                  )
                })
              )}
            </div>
          </div>
        </main>
      )}
    </AppShell>
  )
}

/** Up to this many states, location is a row of chips; beyond it, a select grouped by region. */
const PLACE_CHIPS = 4

/**
 * The location filter. A few states read best as chips, like the modality beside them; once the
 * agenda spans more states, one select keeps the bar compact and groups them by region, with a
 * whole-region option at the top of each group.
 */
function PlaceFilter({
  ufs,
  region,
  uf,
  disabled,
  onChange,
}: {
  ufs: string[]
  region: string | null
  uf: string | null
  disabled: boolean
  onChange: (next: { regiao: string | null; uf: string | null }) => void
}) {
  if (ufs.length <= PLACE_CHIPS) {
    return (
      <div className="txp-filter" role="group" aria-labelledby="txe-f-place">
        {[null, ...ufs].map((value) => (
          <button
            key={value ?? 'all'}
            type="button"
            className="txp-filter__item"
            disabled={disabled}
            aria-pressed={!region && uf === value}
            onClick={() => onChange({ regiao: null, uf: value })}
          >
            {value ?? 'Todos os estados'}
          </button>
        ))}
      </div>
    )
  }
  const regions = Object.keys(REGIONS).filter((r) => ufs.some((u) => regionOf(u) === r))
  const value = uf ? `uf:${uf}` : region ? `regiao:${region}` : 'all'
  return (
    <Select.Root
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        const [kind, name] = v.split(':')
        onChange({ regiao: kind === 'regiao' ? name : null, uf: kind === 'uf' ? name : null })
      }}
    >
      <Select.Trigger className="txe-select" aria-labelledby="txe-f-place">
        <Select.Value />
        <Select.Icon asChild>
          <ChevronDown strokeWidth={1.75} aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      {/* Not portaled, like the calendar menu, so it keeps the lab's theme variables. */}
      <Select.Content className="txe-menu txe-select__menu" position="popper" sideOffset={6} collisionPadding={16}>
          <Select.Viewport>
            <Select.Item className="txe-menu__item" value="all">
              <Select.ItemText>Todos os estados</Select.ItemText>
            </Select.Item>
            {regions.map((r) => (
              <Select.Group key={r}>
                <Select.Label className="txe-select__label">{r}</Select.Label>
                <Select.Item className="txe-menu__item" value={`regiao:${r}`}>
                  <Select.ItemText>Todo o {r}</Select.ItemText>
                </Select.Item>
                {ufs
                  .filter((u) => regionOf(u) === r)
                  .map((u) => (
                    <Select.Item key={u} className="txe-menu__item" data-indent value={`uf:${u}`}>
                      <Select.ItemText>{u}</Select.ItemText>
                    </Select.Item>
                  ))}
              </Select.Group>
            ))}
          </Select.Viewport>
      </Select.Content>
    </Select.Root>
  )
}

/**
 * Marks a text box with `data-cut` while its text does not fit, so the fade at its end (events.css)
 * shows only on text that is really cut, never on a short line that fits whole.
 */
function fadeWhenCut(el: HTMLElement | null) {
  if (!el) return
  const check = () => el.toggleAttribute('data-cut', el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  const observer = new ResizeObserver(check)
  observer.observe(el)
  check()
  return () => observer.disconnect()
}

const pad = (n: number) => String(n).padStart(2, '0')
/** "2026-11-28" in the viewer's own calendar, not UTC. */
const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const dayLong = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
/** Events a day cell lists before "+N eventos". */
const IN_CELL = 2

/**
 * The month as a calendar: its weeks from Sunday, each day with its events by time. Picking a day
 * lists its events in full below. The month and the day live in the URL; the default is today.
 */
function Calendar({
  events,
  state,
  now,
  month,
  day,
  onChange,
}: {
  events: HubEvent[]
  state: MockDb
  now: number
  month: string | null
  day: string | null
  /** One URL update for the month and the day together. */
  onChange: (patch: Record<string, string | null>) => void
}) {
  const today = dayKey(now)
  const [y, m] = (/^\d{4}-\d{2}$/.test(month ?? '') ? month! : today.slice(0, 7)).split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const start = new Date(y, m - 1, 1 - first.getDay())
  // Only the weeks this month touches: five most months, four or six sometimes.
  const weeks = Math.ceil((first.getDay() + new Date(y, m, 0).getDate()) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const byDay = new Map<string, HubEvent[]>()
  for (const e of events.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = dayKey(new Date(e.startsAt).getTime())
    byDay.set(key, [...(byDay.get(key) ?? []), e])
  }
  const selected = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today.startsWith(`${y}-${pad(m)}`) ? today : `${y}-${pad(m)}-01`
  const [sy, sm, sd] = selected.split('-').map(Number)
  const selectedDate = new Date(sy, sm - 1, sd)
  const dayEvents = byDay.get(selected) ?? []
  const monthOf = (key: string) => (key.slice(0, 7) === today.slice(0, 7) ? null : key.slice(0, 7))
  const go = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1)
    onChange({ mes: monthOf(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`), dia: null })
  }
  const pick = (key: string) => onChange({ mes: monthOf(key), dia: key === today ? null : key })
  // The next event after the chosen day, so an empty day still points somewhere.
  const next = events.find((e) => dayKey(new Date(e.startsAt).getTime()) > selected && eventWhen(e, now) !== 'past')

  return (
    <div className="txe-cal-wrap">
      <section className="txe-cal" aria-label="Calendário de eventos">
        {/* Where you are and how to move, in one group: the month, the arrows on either side of "Hoje". */}
        <header className="txe-cal__head">
          <h2 aria-live="polite">{monthTitle.format(first).replace(' de ', ' ')}</h2>
          <span className="txe-cal__nav" role="group" aria-label="Navegar entre meses">
            <button type="button" aria-label="Mês anterior" title="Mês anterior" onClick={() => go(-1)}>
              <ChevronLeft strokeWidth={1.75} aria-hidden />
            </button>
            <button type="button" className="txe-cal__today" disabled={selected === today && !month} onClick={() => pick(today)}>
              Hoje
            </button>
            <button type="button" aria-label="Próximo mês" title="Próximo mês" onClick={() => go(1)}>
              <ChevronRight strokeWidth={1.75} aria-hidden />
            </button>
          </span>
          <p className="txe-cal__legend" aria-hidden>
            <span data-mode="in-person">Presencial</span>
            <span data-mode="online">Online</span>
            <span data-mode="live">Ao vivo</span>
          </p>
        </header>
        <div className="txe-cal__grid" role="grid" aria-label={monthTitle.format(first)}>
          <div className="txe-cal__row" role="row">
            {WEEKDAYS.map((w) => (
              <span key={w} className="txe-cal__weekday" role="columnheader">
                {w}
              </span>
            ))}
          </div>
          {Array.from({ length: weeks }, (_, week) => (
            <div key={week} className="txe-cal__row" role="row">
              {cells.slice(week * 7, week * 7 + 7).map((date) => {
                const key = dayKey(date.getTime())
                const items = byDay.get(key) ?? []
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    className="txe-day"
                    data-outside={date.getMonth() !== m - 1 || undefined}
                    data-today={key === today || undefined}
                    data-has={items.length > 0 || undefined}
                    data-past={startOfDay(date.getTime()) < startOfDay(now) || undefined}
                    aria-selected={key === selected}
                    aria-label={`${dayLong.format(date)}${items.length ? `, ${items.length === 1 ? '1 evento' : `${items.length} eventos`}` : ''}`}
                    onClick={() => pick(key)}
                  >
                    <span className="txe-day__n">{date.getDate()}</span>
                    {items.length > 0 && (
                      <span className="txe-day__events">
                        {items.slice(0, IN_CELL).map((e) => (
                          <span
                            key={e.id}
                            className="txe-day__event"
                            data-mode={e.place.mode}
                            data-live={eventWhen(e, now) === 'now' || undefined}
                            title={`${formatHour(e.startsAt)} ${e.title}, ${kindLabels[e.kind].toLowerCase()} ${e.place.mode === 'online' ? 'online' : 'presencial'}`}
                          >
                            <b>
                              <i aria-hidden />
                              {formatHour(e.startsAt)}
                            </b>
                            <span>{e.short}</span>
                          </span>
                        ))}
                        {items.length > IN_CELL && (
                          <span className="txe-day__more">
                            +{items.length - IN_CELL} {items.length - IN_CELL === 1 ? 'evento' : 'eventos'}
                          </span>
                        )}
                      </span>
                    )}
                    {items.length > 0 && (
                      <span className="txe-day__dots" aria-hidden>
                        {items.map((e) => (
                          <i key={e.id} data-mode={e.place.mode} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="txe-group txe-cal__day" aria-label="Eventos do dia">
        <h2>{selected === today ? 'Hoje' : formatEventDay(selectedDate.toISOString(), now)}</h2>
        {dayEvents.length === 0 ? (
          <div className="txf-empty">
            <p className="tx-empty__title">Nenhum evento neste dia</p>
            {next ? (
              <p className="tx-meta">
                Próximo: <b>{next.title}</b>, {formatEventDay(next.startsAt, now).toLowerCase()} às {formatHour(next.startsAt)}.
              </p>
            ) : (
              <p className="tx-meta">Quando a He4rt marcar uma live ou um encontro, ele aparece aqui e no Feed.</p>
            )}
            {next && (
              <Button
                onClick={() => pick(dayKey(new Date(next.startsAt).getTime()))}
              >
                Ir para o próximo
              </Button>
            )}
          </div>
        ) : (
          <ol className="txe-list">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <EventItem event={event} state={state} now={now} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

/**
 * One event in four layers: what kind and format it is; its name with when and where; what it is
 * about and who leads it; and what to do. Only the name is strong; the rest steps back in weight.
 * Adding to the calendar is the main action and the map the second; the platform link and the full
 * address wait in "Detalhes", which also opens the whole description.
 */
function EventItem({ event, state, now }: { event: HubEvent; state: MockDb; now: number }) {
  const titleId = useId()
  const live = eventWhen(event, now) === 'now'
  const host = state.users.find((u) => u.username === event.hostUsername)
  const date = new Date(event.startsAt)
  const { place } = event
  const address = place.mode === 'in-person' ? `${place.venue}, ${place.address}, ${place.city}, ${place.uf}` : null
  return (
    // The card is the Collapsible: "Detalhes" sits with the actions, the details open in the text column.
    <Collapsible.Root asChild>
      <article className="txe-event" data-live={live || undefined} aria-labelledby={titleId}>
        <time className="txe-date" dateTime={event.startsAt}>
          <span className="txe-date__day">{dayNumber.format(date)}</span>
          <span className="txe-date__month">{monthShort.format(date).replace('.', '')}</span>
        </time>
        <div className="txe-event__body">
          <header className="txe-event__head">
            <p className="txe-event__tag">
              <span>{kindLabels[event.kind]}</span>
              <span className="txe-mode" data-mode={place.mode}>
                {place.mode === 'online' ? 'Online' : 'Presencial'}
              </span>
              {live && <Chip tone="success">Acontecendo agora</Chip>}
            </p>
            <h3 id={titleId} className="txe-event__title">
              {event.title}
            </h3>
            <p className="txe-event__meta">
              <span>
                <Clock strokeWidth={1.75} aria-hidden />
                <span className="txe-sr">Quando: </span>
                {weekdayOf(event.startsAt, now)}, {formatHour(event.startsAt)} às {formatHour(event.endsAt)}
              </span>
              <span>
                {place.mode === 'online' ? <Video strokeWidth={1.75} aria-hidden /> : <MapPin strokeWidth={1.75} aria-hidden />}
                <span className="txe-sr">Onde: </span>
                <span className="txe-key__place" title={address ?? undefined}>
                  {place.mode === 'online' ? `No ${place.platform}` : `${place.venue}, ${place.city}, ${place.uf}`}
                </span>
              </span>
            </p>
          </header>
          <div className="txe-event__about">
            <p className="txe-event__text">{event.description}</p>
            <p className="txe-event__host">
              {host ? (
                <>
                  Com <Link viewTransition to={`/members/${host.username}`}>{host.name}</Link>
                </>
              ) : (
                'Organizado pela He4rt'
              )}
            </p>
          </div>
          {/* Live online, the link is already in the actions; Detalhes then only opens the description. */}
          {!(live && place.mode === 'online') && (
            <Collapsible.Content className="txe-more__content">
              <div className="txe-more__inner">
                {place.mode === 'online' ? (
                  <a className="txe-link" href={place.url} target="_blank" rel="noreferrer">
                    Abrir no {place.platform}
                    <ExternalLink strokeWidth={1.75} aria-hidden />
                  </a>
                ) : (
                  <p>{address}</p>
                )}
              </div>
            </Collapsible.Content>
          )}
        </div>
        <div className="txe-event__foot">
          <span className="txe-event__actions">
            <AddToCalendar event={event} />
            {place.mode === 'in-person' ? (
              <a
                className="txe-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address!)}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver no mapa
                <ExternalLink strokeWidth={1.75} aria-hidden />
              </a>
            ) : (
              // While it is live, joining is what the member came for, so it stays in sight.
              live && (
                <a className="txe-link" href={place.url} target="_blank" rel="noreferrer">
                  Entrar no {place.platform}
                  <ExternalLink strokeWidth={1.75} aria-hidden />
                </a>
              )
            )}
          </span>
          <Collapsible.Trigger className="txe-more__trigger">
            Detalhes
            <ChevronDown strokeWidth={1.75} aria-hidden />
          </Collapsible.Trigger>
        </div>
      </article>
    </Collapsible.Root>
  )
}

/** Puts the event in the member's own calendar: Google's link, or an .ics file for the others. */
function AddToCalendar({ event }: { event: HubEvent }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([icsFile(event)], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.id}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="compact">
          <CalendarPlus strokeWidth={1.75} aria-hidden />
          Adicionar ao calendário
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="txe-menu" align="start" sideOffset={6} collisionPadding={16}>
        <DropdownMenu.Item className="txe-menu__item" asChild>
          <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
            Google Agenda
          </a>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="txe-menu__item" onSelect={download}>
          Outro calendário (.ics)
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

/**
 * The Feed's one line about the nearest event in the next 7 days, or the one happening now. It links
 * to the agenda; with nothing coming up, it is not there.
 */
export function EventsStrip({ now }: { now: number }) {
  const next = labEvents(now)
    .filter((e) => ['now', 'today', 'week'].includes(eventWhen(e, now)))
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (!next) return null
  const live = eventWhen(next, now) === 'now'
  return (
    <Link viewTransition to="/design-lab/eventos" className="txe-strip" data-live={live || undefined}>
      <CalendarDays strokeWidth={1.75} aria-hidden />
      <span ref={fadeWhenCut} className="txe-strip__text" title={next.title}>
        <b>{live ? 'Agora' : `${formatEventDay(next.startsAt, now)}, ${formatHour(next.startsAt)}`}:</b> {next.title}
      </span>
      <span className="txe-strip__place">{placeLabel(next.place)}</span>
      <span className="txe-strip__more">Ver agenda</span>
    </Link>
  )
}
