import { Link } from 'react-router'
import { GitBranch, Link2, Pencil } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MemberProfile } from '@/mocks/db'
import { ShareProfileButton } from './share-profile-button'
import './profile-header.css'

/**
 * Identity card in the dev.to layout, kept short so the evidence and the trajectory start
 * near the top. The handle reads in mono and the current focus as a branch, from /dev/null.
 * No counters, level, or follow button.
 */
export function ProfileHeader({
  name,
  photoUrl,
  profile,
  isOwner,
}: {
  name: string
  photoUrl: string | null
  profile: MemberProfile
  isOwner: boolean
}) {
  return (
    <Card className="profile-header">
      <Avatar src={photoUrl} name={name} size="lg" className="profile-header__avatar" />
      <div className="profile-header__actions">
        <ShareProfileButton handle={profile.handle} />
        {isOwner && (
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/settings/profile">
              <Pencil size={14} aria-hidden />
              Editar perfil
            </Link>
          </Button>
        )}
      </div>

      <div className="profile-header__identity">
        <h1 className="profile-header__name" title={name}>
          {name}
        </h1>
        <div className="profile-header__meta">
          <p className="profile-header__handle">@{profile.handle}</p>
          {profile.currentFocus && (
            <Badge variant="soft" className="profile-header__focus" title={profile.currentFocus}>
              <GitBranch size={12} aria-hidden />
              foco: {profile.currentFocus}
            </Badge>
          )}
        </div>
        {profile.bio && <p className="profile-header__bio">{profile.bio}</p>}
        {profile.links.length > 0 && (
          <ul className="profile-header__links" aria-label="Links públicos">
            {profile.links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer" title={link.url}>
                  <Link2 size={14} aria-hidden />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
