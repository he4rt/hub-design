import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb } from '@/mocks/db'
import { isStaff } from '@/mocks/squads'
import './dashboard.css'

/** "1 usuário cadastrado", "11 usuários cadastrados". */
function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export default function Dashboard() {
  const users = useDb((state) => state.users)
  const admins = users.filter(isStaff).length
  const members = users.length - admins

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
    <div className="admin-dashboard">
      <PageHeader title="Visão geral" />
      <Card>
        <CardHeader>
          <h2>Comunidade</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/users">Ver usuários</Link>
          </Button>
        </CardHeader>
        <ul className="admin-dashboard__list">
          <li>{count(users.length, 'usuário cadastrado no Hub.', 'usuários cadastrados no Hub.')}</li>
          <li>{count(admins, 'pessoa na staff, que administra o Hub.', 'pessoas na staff, que administram o Hub.')}</li>
          <li>
            {members === 0
              ? 'Nenhum membro ainda. Quem entra pelo Hub aparece aqui.'
              : count(members, 'membro da comunidade.', 'membros da comunidade.')}
          </li>
        </ul>
      </Card>
    </div>
  )
}
