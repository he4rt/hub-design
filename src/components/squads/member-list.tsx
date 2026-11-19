import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { SquadMembership, User } from '@/mocks/db'
import './member-list.css'

/** Members of a project with what each one answered for. The captain comes first. */
export function MemberList({
  memberships,
  users,
  captainId,
}: {
  memberships: SquadMembership[]
  users: User[]
  captainId: string | null
}) {
  if (memberships.length === 0) return <p className="member-list__empty">Ninguém neste projeto ainda.</p>

  const sorted = [...memberships].sort((a, b) => Number(b.userId === captainId) - Number(a.userId === captainId))

  return (
    <ul className="member-list">
      {sorted.map((m) => {
        const user = users.find((u) => u.id === m.userId)
        return (
          <li key={m.id} className="member-list__item">
            <Avatar name={user?.name ?? '?'} src={user?.photoUrl ?? null} size="sm" />
            <div className="member-list__text">
              <p className="member-list__name">
                {user?.published ? (
                  <Link to={`/members/${user.username}`} title={user.name}>
                    {user.name}
                  </Link>
                ) : (
                  <span title={user?.name}>{user?.name ?? 'Membro removido'}</span>
                )}
                {m.userId === captainId && <Badge>Capitão</Badge>}
              </p>
              <p className="member-list__role">{m.responsibilities || 'Responsabilidades a definir pelo capitão.'}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
