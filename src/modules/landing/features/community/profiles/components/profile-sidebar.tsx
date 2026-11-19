import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { MemberProfile } from '@/mocks/db'
import { canSee, type Viewer } from '@/lib/trajectory/visibility'
import { LearningNow } from './learning-now'
import './profile-sidebar.css'

/** Side box in the dev.to layout: what the member is learning, areas, current work, and languages. */
export function ProfileSidebar({
  profile,
  areas,
  languages,
  isOwner,
  viewer,
}: {
  profile: MemberProfile
  areas: string
  languages: string[]
  isOwner: boolean
  viewer: Viewer
}) {
  const current = profile.experiences.find((experience) => canSee(experience.visibility, viewer) && experience.endedAt === null)

  return (
    <aside className="profile-sidebar" aria-label="Resumo">
      <Card className="profile-sidebar__box">
        <LearningNow text={profile.currentFocus} ownerId={isOwner ? profile.userId : null} />
        {areas && (
          <div>
            <h2>Áreas</h2>
            <p>{areas}</p>
          </div>
        )}
        {current && (
          <div>
            <h2>Atuação atual</h2>
            <p title={`${current.role} · ${current.organization}`}>{current.role}</p>
          </div>
        )}
        {languages.length > 0 && (
          <div>
            <h2>Linguagens</h2>
            <ul className="profile-sidebar__tags">
              {languages.map((language) => (
                <li key={language}>
                  <Badge>{language}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </aside>
  )
}
