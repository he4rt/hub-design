import { Card, CardHeader } from '@/components/ui/card'
import { byRecent, type ShownAchievement } from '../lib/achievements'
import { AchievementMedal } from './achievement-medal'
import { AllAchievementsDialog } from './all-achievements-dialog'
import './achievements-box.css'

const SHOWN = 8

/**
 * The one achievements block of the profile: the latest marks in the side
 * column, with the rest one tap away. Computed by the platform; the owner chooses what shows.
 */
export function AchievementsBox({
  items,
  ownerId,
  firstName,
}: {
  items: ShownAchievement[]
  /** Set while the owner reads as themselves: every medal offers to show or hide it. */
  ownerId: string | null
  firstName: string
}) {
  const isOwner = ownerId !== null

  return (
    <Card className="achievements-box" aria-labelledby="achievements-box-title">
      <CardHeader className="achievements-box__header">
        <h2 id="achievements-box-title">Conquistas</h2>
        {items.length > SHOWN && <AllAchievementsDialog items={items} firstName={firstName} ownerId={ownerId} />}
      </CardHeader>
      {items.length > 0 ? (
        <ul className="achievements-box__grid">
          {byRecent(items)
            .slice(0, SHOWN)
            .map((item) => (
              <li key={item.achievement.id}>
                <AchievementMedal item={item} size="sm" ownerId={ownerId} />
              </li>
            ))}
        </ul>
      ) : (
        <p className="achievements-box__empty">
          {isOwner ? 'Suas conquistas aparecem aqui conforme você avança.' : `${firstName} ainda não mostrou conquistas.`}
        </p>
      )}
    </Card>
  )
}
