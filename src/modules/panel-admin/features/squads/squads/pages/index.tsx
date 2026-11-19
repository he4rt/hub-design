import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { activeMemberships, activeProject } from '@/mocks/squads'
import './index.css'
import '@/components/stack-page.css'

/** Every squad with its state, captain, project and what waits on the captain. */
export default function Index() {
  const state = useDb((s) => s)

  useDebugActions('Squads (admin)', [
    { label: 'Esvaziar squads', run: () => db.set((s) => ({ ...s, squads: [] })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader
        title="Squads"
        description="Squad nunca é apagado: sem projeto ativo, ele fica inativo."
        actions={
          <Button asChild>
            <Link to="/admin/squads/create">Novo squad</Link>
          </Button>
        }
      />
      <Card>
        {state.squads.length === 0 ? (
          <p className="stack-page__muted">Nenhum squad ainda. Crie o primeiro e encaminhe um projeto.</p>
        ) : (
          <div className="admin-squads__scroll">
            <table className="admin-squads">
              <thead>
                <tr>
                  <th>Squad</th>
                  <th>Estado</th>
                  <th>Capitão</th>
                  <th>Projeto</th>
                  <th>Membros</th>
                  <th>Pendências do capitão</th>
                </tr>
              </thead>
              <tbody>
                {state.squads.map((squad) => {
                  const project = activeProject(state, squad.id)
                  const pendingApps = state.applications.filter((a) => a.projectId === project?.id && a.status === 'pending').length
                  const pendingDeliveries = state.deliveries.filter((d) => d.projectId === project?.id && d.status === 'pending').length
                  return (
                    <tr key={squad.id}>
                      <td className="admin-squads__name">
                        <Link to={`/admin/squads/${squad.slug}`} title={squad.name}>
                          {squad.name}
                        </Link>
                      </td>
                      <td>
                        <Badge variant={squad.status === 'active' ? 'success' : 'outline'}>{squad.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                      </td>
                      <td>{state.users.find((u) => u.id === squad.captainId)?.name ?? <Badge variant="warning">Vacancy</Badge>}</td>
                      <td>{project ? `${project.name}${project.status === 'provisioning' ? ' (criando)' : ''}` : '—'}</td>
                      <td className="admin-squads__num">{project ? `${activeMemberships(state, project.id).length}/${project.seats}` : '—'}</td>
                      <td className="admin-squads__num">
                        {pendingApps} candidaturas · {pendingDeliveries} entregas
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
