import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import './dashboard.css'

export default function Dashboard() {
  const users = useDb((state) => state.users)
  const admins = users.filter((user) => user.role === 'admin').length

  useDebugActions('Visão geral', [
    {
      label: 'Zerar usuários',
      description: 'Mostra o estado vazio; mantém só o admin logado.',
      run: () =>
        db.set((state) => ({
          ...state,
          users: state.users.filter((user) => user.id === state.adminSession?.userId),
          session: null,
        })),
    },
  ])

  return (
    <>
      <PageHeader title="Visão geral" description="Números da comunidade." />
      <div className="admin-stats">
        <Card>
          <span>Usuários</span>
          <strong>{users.length}</strong>
        </Card>
        <Card>
          <span>Administradores</span>
          <strong>{admins}</strong>
        </Card>
        <Card>
          <span>Membros</span>
          <strong>{users.length - admins}</strong>
        </Card>
      </div>
    </>
  )
}
