import { Button } from '@/components/ui/button'
import type { User } from '@/mocks/db'
import './users-table.css'

export function UsersTable({
  users,
  onDelete,
}: {
  users: User[]
  onDelete: (user: User) => void
}) {
  if (users.length === 0) {
    return <p className="users-table__empty">Nenhum usuário cadastrado.</p>
  }

  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Papel</th>
          <th>Criado em</th>
          <th aria-label="Ações" />
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role === 'admin' ? 'Admin' : 'Membro'}</td>
            <td>{user.createdAt}</td>
            <td>
              <Button variant="danger" size="sm" onClick={() => onDelete(user)}>
                Remover
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
