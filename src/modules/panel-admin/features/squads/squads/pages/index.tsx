import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { activeMemberships, activeProject } from '@/mocks/squads'
import './index.css'

/** "2 candidaturas e 1 entrega", or "Nada pendente". */
function pendingText(applications: number, deliveries: number) {
  const parts = [
    applications > 0 && `${applications} ${applications === 1 ? 'candidatura' : 'candidaturas'}`,
    deliveries > 0 && `${deliveries} ${deliveries === 1 ? 'entrega' : 'entregas'}`,
  ].filter(Boolean)
  return parts.length ? parts.join(' e ') : 'Nada pendente'
}

/** Every squad with its state, captain, project and what waits on the captain. */
export default function Index() {
  const state = useDb((s) => s)

  useDebugActions('Squads (admin)', [
    { label: 'Esvaziar squads', run: () => db.set((s) => ({ ...s, squads: [] })) },
  ])

  return (
    <div className="admin-squads-page">
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
          <p className="admin-squads__empty">Nenhum squad ainda. Crie o primeiro e encaminhe um projeto.</p>
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
                        <StateChip entity="squad" state={squad.status} />
                      </td>
                      <td>{state.users.find((u) => u.id === squad.captainId)?.name ?? <StateChip entity="squad" state="vacancy" />}</td>
                      <td>
                        {project ? (
                          <span className="admin-squads__project">
                            {project.name}
                            {project.status === 'provisioning' && <StateChip entity="project" state="provisioning" />}
                          </span>
                        ) : (
                          <span className="admin-squads__muted">Sem projeto</span>
                        )}
                      </td>
                      <td className="admin-squads__num">
                        {project ? `${activeMemberships(state, project.id).length} de ${project.seats}` : <span className="admin-squads__muted">—</span>}
                      </td>
                      <td className="admin-squads__num">{pendingText(pendingApps, pendingDeliveries)}</td>
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
