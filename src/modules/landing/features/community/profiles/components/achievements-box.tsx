import { Card } from '@/components/ui/card'
import type { MemberJourney } from '@/mocks/db'
import { byRecent, journeyStages, type ShownAchievement } from '../lib/achievements'
import { AchievementMedal } from './achievement-medal'
import { AllAchievementsDialog } from './all-achievements-dialog'
import './achievements-box.css'

const SHOWN = 8

/** "Vitrine" model: the stage and the latest medals in the side column, with the rest one tap away. */
export function AchievementsBox({
  items,
  journey,
  isOwner,
  firstName,
}: {
  items: ShownAchievement[]
  journey: MemberJourney
  isOwner: boolean
  firstName: string
}) {
  const stage = journeyStages.find((item) => item.value === (isOwner ? journey.stage : journey.publicStage))

  return (
    <Card className="achievements-box" aria-labelledby="achievements-box-title">
      <div className="achievements-box__header">
        <h2 id="achievements-box-title">Conquistas</h2>
        {items.length > SHOWN && <AllAchievementsDialog items={items} firstName={firstName} />}
      </div>
      {stage && (
        <p className="achievements-box__stage" title={stage.description}>
          <span>Jornada</span>
          <strong>{stage.label}</strong>
          {journey.contributor && <strong>· Contribuidor</strong>}
        </p>
      )}
      {items.length > 0 ? (
        <ul className="achievements-box__grid">
          {byRecent(items)
            .slice(0, SHOWN)
            .map((item) => (
              <li key={item.achievement.id}>
                <AchievementMedal item={item} size="sm" />
              </li>
            ))}
        </ul>
      ) : (
        <p className="achievements-box__empty">
          {isOwner ? 'Suas conquistas aparecem aqui conforme você avança.' : 'Nenhuma conquista publicada.'}
        </p>
      )}
    </Card>
  )
}
