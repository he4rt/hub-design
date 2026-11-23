import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb } from '@/mocks/db'
import { entryTestClosed, inviteAccepted } from '@/mocks/github'
import { activeSquadIds, currentApplication } from '@/mocks/squads'
import { EntryJourney } from '../components/entry-journey'
import '../components/squad-page.css'

/**
 * The member's squads, current and past. While the member is not in a squad, or has an application
 * on the way, the page shows where they are in the entry and what to do next.
 */
export default function Index() {
  const state = useDb((s) => s)
  const userId = state.session?.userId ?? ''
  const active = activeSquadIds(state, userId)
  const squadIds = [...new Set(state.memberships.filter((m) => m.userId === userId).map((m) => m.squadId))]
  const captainOf = state.squads.filter((s) => s.captainId === userId && !squadIds.includes(s.id))
  const squads = state.squads.filter((s) => squadIds.includes(s.id) || captainOf.includes(s))
  const app = currentApplication(state, userId)
  const onTheWay = app?.status === 'pending' || (app?.status === 'accepted' && app.githubInvite === 'pending')
  const showJourney = active.length === 0 || onTheWay
  const { run, error } = useActionRunner()
  const signIn = (id: string) => db.set((s) => ({ ...s, session: { userId: id } }))

  useDebugActions('Meus squads', [
    { label: 'Entrar como Ana (no squad)', run: () => signIn('u2') },
    { label: 'Entrar como Rafael (capitão)', run: () => signIn('u6') },
    { label: 'Entrar como Gustavo (PR aberto)', run: () => signIn('u11') },
    { label: 'Entrar como Pedro (candidatura pendente)', run: () => signIn('u5') },
    { label: 'Entrar como Letícia (recusada com retorno)', run: () => signIn('u10') },
    {
      label: 'Sem teste de entrada',
      description: 'Apaga o teste da conta atual.',
      run: () => db.set((s) => ({ ...s, entryTests: s.entryTests.filter((t) => t.userId !== userId) })),
    },
    { label: 'Staff faz o merge do meu PR', run: () => run(() => entryTestClosed(userId, true)) },
    {
      label: 'Capitão aceita minha candidatura',
      description: 'O que acceptApplication grava; a API não deixa o membro agir como o capitão.',
      run: () =>
        db.set((s) => ({
          ...s,
          applications: s.applications.map((a) =>
            a.id === app?.id && a.status === 'pending' ? { ...a, status: 'accepted' as const, githubInvite: 'pending' as const } : a,
          ),
        })),
    },
    { label: 'Convite do GitHub aceito', run: () => run(() => inviteAccepted(app?.id ?? 'nenhuma')) },
  ])

  return (
    <div className="squad-page">
      <PageHeader
        title="Meus squads"
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/squads/applications">Minhas candidaturas</Link>
          </Button>
        }
      />
      <FormMessage tone="error">{error}</FormMessage>
      {showJourney && <EntryJourney state={state} userId={userId} />}
      {squads.length > 0 && (
        <Card>
          <ul className="squad-page__list">
            {squads.map((squad) => (
              <li key={squad.id}>
                <div className="squad-page__row">
                  <Link to={`/app/squads/${squad.slug}`} className="squad-page__name" title={squad.name}>
                    {squad.name}
                  </Link>
                  <span className="squad-page__chips">
                    {squad.captainId === userId && <Badge>Capitão</Badge>}
                    <Badge variant={active.includes(squad.id) ? 'success' : 'neutral'}>
                      {active.includes(squad.id) ? 'Participando' : 'Participou'}
                    </Badge>
                  </span>
                </div>
                <p className="squad-page__muted">{squad.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
