import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import { eventWhen, formatEventDay, formatHour, labEvents, placeLabel } from '@/lib/events'
import { memberJourney } from '@/mocks/achievements'
import { useDb } from '@/mocks/db'
import { freeSeats } from '@/mocks/squads'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import './feed-aside.css'

const SHOWN = 3

/**
 * POC B's column beside the Feed: what the member can do next in the Hub, not what is popular.
 * Their next step on the journey, projects and squads that have room, and the next He4rt events.
 */
export function FeedAside() {
  const account = useAccount()
  const now = useNow()
  const state = useDb((s) => s)
  if (!account) return null

  const squadOf = (id: string) => state.squads.find((s) => s.id === id)
  const openProjects = state.projects
    .filter((p) => p.status === 'active' && freeSeats(state, p) > 0)
    .slice(0, SHOWN)
  const vacancies = state.squads.filter((s) => s.status === 'active' && !s.captainId).slice(0, SHOWN)
  const events = labEvents(now)
    .filter((e) => eventWhen(e, now) !== 'past')
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, SHOWN)

  // One action, the one that moves the member to the next kind of evidence.
  const stage = memberJourney(state, account.id).stage
  const mySquad = state.squads.find((s) => state.memberships.some((m) => m.userId === account.id && m.squadId === s.id && m.leftAt === null))
  const step =
    account.completeness.percent < 100
      ? { title: 'Completar o perfil', text: `Seu perfil está ${account.completeness.percent}% preenchido.`, to: '/app/settings/profile' }
      : stage === 'member'
        ? { title: 'Fazer o teste de entrada', text: 'É o que abre as candidaturas aos squads.', to: '/app/squads/entry-test' }
        : stage === 'prepared'
          ? { title: 'Candidatar-se a um projeto', text: 'Pratique o que estudou num squad.', to: '/squads' }
          : stage === 'practicing'
            ? { title: 'Entregar no seu squad', text: 'A primeira entrega aceita entra na sua trajetória.', to: mySquad ? `/app/squads/${mySquad.slug}` : '/app/squads' }
            : { title: 'Pedir uma validação', text: 'Um validador registra a competência que você mostrou.', to: '/app/validation/requests/create' }

  return (
    <aside className="feed-aside" aria-label="Para fazer no Hub">
      <section className="feed-aside__group" aria-labelledby="feed-aside-step">
        <h2 id="feed-aside-step">Seu próximo passo</h2>
        <Link to={step.to} className="feed-aside__step">
          <span className="feed-aside__title">{step.title}</span>
          <span className="feed-aside__meta">{step.text}</span>
        </Link>
      </section>

      <section className="feed-aside__group" aria-labelledby="feed-aside-open">
        <h2 id="feed-aside-open">Com vaga</h2>
        {openProjects.length === 0 && vacancies.length === 0 ? (
          <p className="feed-aside__empty">Nenhum projeto com lugar livre agora.</p>
        ) : (
          <ul>
            {openProjects.map((p) => {
              const squad = squadOf(p.squadId)
              const seats = freeSeats(state, p)
              return (
                <li key={p.id}>
                  <Link to={`/squads/${squad?.slug}/projects/${p.slug}`} className="feed-aside__item">
                    <span className="feed-aside__title">{p.name}</span>
                    <span className="feed-aside__meta">
                      {seats === 1 ? '1 lugar livre' : `${seats} lugares livres`}, squad {squad?.name}
                    </span>
                  </Link>
                </li>
              )
            })}
            {vacancies.map((s) => (
              <li key={s.id}>
                <Link to={`/squads/${s.slug}`} className="feed-aside__item">
                  <span className="feed-aside__title">{s.name}</span>
                  <span className="feed-aside__meta">Squad sem capitão</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/squads" className="feed-aside__all">Ver squads</Link>
      </section>

      <section className="feed-aside__group" aria-labelledby="feed-aside-events">
        <h2 id="feed-aside-events">Próximos eventos</h2>
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <Link to="/design-lab/eventos" className="feed-aside__item" title={e.title}>
                <span className="feed-aside__title">{e.title}</span>
                <span className="feed-aside__meta">
                  <CalendarDays size={13} aria-hidden />
                  {eventWhen(e, now) === 'now' ? 'Agora' : `${formatEventDay(e.startsAt, now)}, ${formatHour(e.startsAt)}`}
                </span>
                <span className="feed-aside__meta" data-mode={e.place.mode}>{placeLabel(e.place)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/design-lab/eventos" className="feed-aside__all">
          Ver agenda <ArrowUpRight size={14} aria-hidden />
        </Link>
      </section>
    </aside>
  )
}
