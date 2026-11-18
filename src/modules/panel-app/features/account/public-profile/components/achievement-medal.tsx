import { EyeOff } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMonth } from '@/modules/panel-app/lib/dates'
import type { ShownAchievement } from '../lib/achievements'
import './achievement-medal.css'

/**
 * One achievement as a medal. Tap or click opens what it means, when it happened, and where
 * it came from; a popover, not a tooltip, so it works on a phone.
 */
export function AchievementMedal({ item, size = 'md' }: { item: ShownAchievement; size?: 'sm' | 'md' }) {
  const { achievement, definition, privateReason } = item
  const manual = achievement.source === 'administration'

  return (
    <Popover>
      <PopoverTrigger
        className="achievement-medal"
        data-size={size}
        data-private={privateReason ? '' : undefined}
        data-manual={manual || undefined}
        aria-label={`${definition.name}${privateReason ? ' (só você vê)' : ''}`}
        title={definition.name}
      >
        <span className="achievement-medal__glyph" aria-hidden>
          {definition.glyph}
        </span>
        {privateReason && <EyeOff size={10} className="achievement-medal__lock" aria-hidden />}
      </PopoverTrigger>
      <PopoverContent className="achievement-medal__details">
        <p className="achievement-medal__name">{definition.name}</p>
        <p>{definition.description}</p>
        <p className="achievement-medal__meta">
          <time dateTime={achievement.unlockedAt}>{formatMonth(achievement.unlockedAt)}</time>
          {' · '}
          {manual ? 'Concedida pela administração' : 'Apurada pela plataforma'}
        </p>
        {manual && achievement.grantReason && <p className="achievement-medal__reason">{achievement.grantReason}</p>}
        {privateReason && (
          <p className="achievement-medal__private">
            <EyeOff size={14} aria-hidden />
            <span>
              <strong>Só você vê.</strong> {privateReason}
            </span>
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
