import { formatMonth } from '@/lib/dates'
import { groupAchievements, groupLabels, type ShownAchievement } from '../lib/achievements'
import { AchievementMedal } from './achievement-medal'
import './achievement-list.css'

/** Every achievement the reader may see, by catalog group. No totals, no locked ones. */
export function AchievementList({ items, ownerId }: { items: ShownAchievement[]; ownerId: string | null }) {
  return (
    <div className="achievement-list">
      {groupAchievements(items).map(({ group, items: groupItems }) => (
        <section key={group} className="achievement-list__group" aria-labelledby={`achievement-group-${group}`}>
          <h3 id={`achievement-group-${group}`} className="achievement-list__heading">
            {groupLabels[group]}
          </h3>
          <ul className="achievement-list__items">
            {groupItems.map((item) => (
              <li key={item.achievement.id} className="achievement-list__item">
                <AchievementMedal item={item} size="sm" ownerId={ownerId} />
                <div className="achievement-list__text">
                  <p className="achievement-list__name" title={item.definition.name}>
                    {item.definition.name}
                  </p>
                  <p className="achievement-list__description">{item.definition.description}</p>
                  {item.privateReason && <p className="achievement-list__private">Privada</p>}
                </div>
                <time className="achievement-list__date" dateTime={item.achievement.unlockedAt}>
                  {formatMonth(item.achievement.unlockedAt)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
