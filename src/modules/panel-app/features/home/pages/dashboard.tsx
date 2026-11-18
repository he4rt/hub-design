import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'

export default function Dashboard() {
  const account = useAccount()
  const navigate = useNavigate()

  useDebugActions('Dashboard', [
    {
      label: 'Expirar sessão',
      description: 'Remove a sessão sem passar pelo logout.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
    { label: 'Ir para configurações', run: () => navigate('/app/settings/profile') },
  ])

  return (
    <>
      <PageHeader title={`Olá, ${account?.name.split(' ')[0]}!`} description="Este é o seu painel." />
      <Card>
        <h2>Seu perfil</h2>
        <p>
          {account?.email} · {account?.role === 'admin' ? 'Administrador' : 'Membro'}
        </p>
        <Link to="/app/settings/profile">Editar perfil</Link>
      </Card>
    </>
  )
}
