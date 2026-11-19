import { Button } from '@/components/ui/button'
import type { User } from '@/mocks/db'
import { formatDate, ROLE_LABELS } from '@/mocks/squads'
import { canDeleteUser } from '../actions'
import './users-table.css'

export function UsersTable({
  users,
  disabled,
  onDelete,
}: {
  users: User[]
  /** Disables the row actions while another action runs. */
  disabled: boolean
  onDelete: (user: User) => void
}) {
  if (users.length === 0) {
    return <p className="users-table__empty">Nenhum usuário cadastrado.</p>
  }

  return (
    <div className="users-table__scroll">
      <table className="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Aberto a oportunidades</th>
            <th>Criado em</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="users-table__name">{user.name}</td>
              <td className="users-table__email" title={user.email}>
                {user.email}
              </td>
              <td>{ROLE_LABELS[user.role]}</td>
              <td className="users-table__muted">{user.openToOpportunities ? 'Sim' : 'Não'}</td>
              <td className="users-table__date">{formatDate(user.createdAt)}</td>
              <td>
                {canDeleteUser(user) && (
                  <Button variant="danger" size="sm" disabled={disabled} onClick={() => onDelete(user)}>
                    Remover
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
