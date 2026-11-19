import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { MemberProfile } from '@/mocks/db'
import { LearningNow } from './learning-now'
import './profile-sidebar.css'

/** Side box in the dev.to layout: what the member is learning, areas, current work, and stacks. */
export function ProfileSidebar({ profile, isOwner }: { profile: MemberProfile; isOwner: boolean }) {
  const current = profile.experiences.find((experience) => experience.isPublic && experience.endedAt === null)

  return (
    <aside className="profile-sidebar" aria-label="Resumo">
      <Card className="profile-sidebar__box">
        <LearningNow text={profile.currentFocus} ownerId={isOwner ? profile.userId : null} />
        {profile.areas.length > 0 && (
          <div>
            <h2>Áreas</h2>
            <p>{profile.areas.join(', ')}</p>
          </div>
        )}
        {current && (
          <div>
            <h2>Atuação atual</h2>
            <p title={`${current.role} · ${current.organization}`}>{current.role}</p>
          </div>
        )}
        {profile.stacks.length > 0 && (
          <div>
            <h2>Stacks</h2>
            <ul className="profile-sidebar__tags">
              {profile.stacks.map((stack) => (
                <li key={stack}>
                  <Badge>{stack}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </aside>
  )
}
