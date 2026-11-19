import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { activeSquadIds, hasApprovedEntryTest } from '@/mocks/squads'
import '@/components/stack-page.css'

/** The member's squads, current and past, and the next step when there are none. */
export default function Index() {
  const state = useDb((s) => s)
  const userId = state.session?.userId ?? ''
  const active = activeSquadIds(state, userId)
  const squadIds = [...new Set(state.memberships.filter((m) => m.userId === userId).map((m) => m.squadId))]
  const captainOf = state.squads.filter((s) => s.captainId === userId && !squadIds.includes(s.id))
  const squads = state.squads.filter((s) => squadIds.includes(s.id) || captainOf.includes(s))
  const approved = hasApprovedEntryTest(state, userId)

  useDebugActions('Meus squads', [
    { label: 'Entrar como Ana (membro)', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
    { label: 'Entrar como Gustavo (sem squad)', run: () => db.set((s) => ({ ...s, session: { userId: 'u11' } })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader
        title="Meus squads"
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/squads/applications">Minhas candidaturas</Link>
          </Button>
        }
      />
      {squads.length === 0 ? (
        <Card>
          <div className="stack-page__row">
            <p>
              {approved
                ? 'Seu teste de entrada está aprovado. Escolha um projeto e se candidate.'
                : 'Para entrar num squad, comece pelo teste de entrada: um PR merged num repositório da He4rt.'}
            </p>
            <Button asChild>
              <Link to={approved ? '/squads' : '/app/squads/entry-test'}>
                {approved ? 'Ver squads' : 'Fazer o teste de entrada'}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="stack-page__list">
            {squads.map((squad) => (
              <li key={squad.id}>
                <div className="stack-page__row">
                  <Link to={`/app/squads/${squad.slug}`} className="stack-page__title">
                    {squad.name}
                  </Link>
                  <span className="stack-page__actions">
                    {squad.captainId === userId && <Badge variant="soft">Capitão</Badge>}
                    <Badge variant={active.includes(squad.id) ? 'success' : 'outline'}>
                      {active.includes(squad.id) ? 'Participando' : 'Participou'}
                    </Badge>
                  </span>
                </div>
                <p className="stack-page__muted">{squad.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
