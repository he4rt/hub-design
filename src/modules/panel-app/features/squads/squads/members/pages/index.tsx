import { Link } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardHeader } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db } from '@/mocks/db'
import { activeMemberships, formatDate } from '@/mocks/squads'
import { SquadTabs } from '../../components/squad-tabs'
import { useSquadPage } from '../../hooks/use-squad-page'
import { ResponsibilitiesForm } from '../components/responsibilities-form'
import '../../components/squad-page.css'
import './index.css'

/** Captain's tab: what each member answers for. Removing someone is the super admin's call. */
export default function Index() {
  const { state, userId, squad, project, manager, counts } = useSquadPage()

  useDebugActions('Membros', [
    { label: 'Entrar como Rafael (capitão)', run: () => db.set((s) => ({ ...s, session: { userId: 'u6' } })) },
  ])

  if (!squad || !manager) return <NotFound />
  const members = project ? activeMemberships(state, project.id) : []

  return (
    <div className="squad-page">
      <div className="squad-page__head">
        <PageHeader
          title={squad.name}
          description="Tirar ou realocar alguém é com o super admin, sempre com motivo no log."
          actions={
            project && (
              <Button asChild variant="secondary">
                <Link to={`/app/squads/${squad.slug}/projects/${project.slug}/edit`}>Perguntas e lugares</Link>
              </Button>
            )
          }
        />
        <SquadTabs squad={squad} manager={manager} counts={counts} />
      </div>
      <Card>
        <CardHeader>
          <h2>O que cada pessoa responde</h2>
        </CardHeader>
        {members.length === 0 ? (
          <p className="squad-page__muted">Nenhum membro ativo.</p>
        ) : (
          <ul className="squad-page__list">
            {members.map((m) => {
              const user = state.users.find((u) => u.id === m.userId)
              return (
                <li key={m.id}>
                  <div className="squad-members__who">
                    <Avatar name={user?.name ?? '?'} src={user?.photoUrl ?? null} size="sm" />
                    <div className="squad-members__text">
                      <span className="squad-page__name" title={user?.name}>
                        {user?.name}
                      </span>
                      <span className="squad-page__muted squad-page__num">No squad desde {formatDate(m.joinedAt)}.</span>
                    </div>
                    {m.userId === squad.captainId && <Badge>Capitão</Badge>}
                  </div>
                  <ResponsibilitiesForm membership={m} actorId={userId} label={user?.name ?? ''} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
