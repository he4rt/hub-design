import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { useDb } from '@/mocks/db'
import './member-link.css'

/** A member's name, with the avatar and a caption such as the role; links to the public profile when there is one. */
export function MemberLink({ userId, caption, avatar = true }: { userId: string; caption?: string; avatar?: boolean }) {
  const user = useDb((db) => db.users.find((u) => u.id === userId))
  const profile = useDb((db) => db.profiles.find((p) => p.userId === userId))
  if (!user) return null

  return (
    <span className="member-link">
      {avatar && <Avatar src={user.photoUrl} name={user.name} size="sm" />}
      <span className="member-link__text">
        {profile ? (
          <Link to={`/app/members/${profile.handle}`} className="member-link__name" title={user.name}>
            {user.name}
          </Link>
        ) : (
          <span className="member-link__name" title={user.name}>
            {user.name}
          </span>
        )}
        {caption && (
          <span className="member-link__caption" title={caption}>
            {caption}
          </span>
        )}
      </span>
    </span>
  )
}
