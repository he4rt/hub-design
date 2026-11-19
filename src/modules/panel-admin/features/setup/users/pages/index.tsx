import { useState, useTransition } from 'react'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { createUsers, deleteUser } from '../actions'
import { UsersTable } from '../components/users-table'
import './index.css'

export default function Users() {
  const users = useDb((state) => state.users)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch (e) {
        setError(errorMessage(e))
      }
    })
  }

  useDebugActions('Usuários', [
    { label: 'Criar 10 usuários', run: () => run(() => createUsers(10)) },
    {
      label: 'Remover um admin (erro esperado)',
      description: 'Chama a ação direto, ignorando a UI que esconde o botão.',
      run: () => run(() => deleteUser(users.find((u) => u.role !== 'member')?.id ?? 'missing')),
    },
  ])

  return (
    <div className="users-page">
      <PageHeader
        title="Usuários"
        description={users.length === 1 ? '1 usuário cadastrado.' : `${users.length} usuários cadastrados.`}
        actions={
          <Button loading={pending} onClick={() => run(() => createUsers(1))}>
            Novo usuário
          </Button>
        }
      />
      <FormMessage tone="error">{error}</FormMessage>
      <Card>
        <UsersTable users={users} disabled={pending} onDelete={(user) => run(() => deleteUser(user.id))} />
      </Card>
    </div>
  )
}
