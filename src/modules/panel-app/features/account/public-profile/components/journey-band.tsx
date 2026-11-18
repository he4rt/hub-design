import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { MemberJourney } from '@/mocks/db'
import { byRecent, journeyStages, stageIndex, type ShownAchievement } from '../lib/achievements'
import { AchievementMedal } from './achievement-medal'
import { AllAchievementsDialog } from './all-achievements-dialog'
import './journey-band.css'

const SHOWN = 6

/**
 * "Jornada" model: the five stages by evidence under the header, and the latest medals.
 * A stage tells which evidence the member had, never a seniority or a score.
 */
export function JourneyBand({
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
  const reached = stageIndex(isOwner ? journey.stage : journey.publicStage)

  return (
    <Card className="journey-band" aria-labelledby="journey-band-title">
      <div className="journey-band__header">
        <h2 id="journey-band-title">Jornada no Hub</h2>
        {journey.contributor && <span className="journey-band__contributor">Contribuidor</span>}
      </div>
      <ol className="journey-band__stages">
        {journeyStages.map((stage, index) => (
          <li
            key={stage.value}
            className="journey-band__stage"
            data-state={index < reached ? 'done' : index === reached ? 'current' : 'next'}
            aria-current={index === reached ? 'step' : undefined}
            title={stage.description}
          >
            <span className="journey-band__dot" aria-hidden>
              {index <= reached && <Check size={12} />}
            </span>
            <span className="journey-band__label">{stage.label}</span>
            <span className="journey-band__description">{stage.description}</span>
          </li>
        ))}
      </ol>
      {items.length > 0 && (
        <div className="journey-band__medals">
          <ul>
            {byRecent(items)
              .slice(0, SHOWN)
              .map((item) => (
                <li key={item.achievement.id}>
                  <AchievementMedal item={item} size="sm" />
                </li>
              ))}
          </ul>
          {items.length > SHOWN && <AllAchievementsDialog items={items} firstName={firstName} />}
        </div>
      )}
    </Card>
  )
}
