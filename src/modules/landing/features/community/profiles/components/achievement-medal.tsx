import { EyeOff } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useActionRunner } from '@/hooks/use-action-runner'
import { formatMonth } from '@/lib/dates'
import { updateAchievementVisibility } from '../actions'
import type { ShownAchievement } from '../lib/achievements'
import './achievement-medal.css'

/**
 * One achievement as a medal. Tap or click opens what it means, when it happened, and where
 * it came from; a popover, not a tooltip, so it works on a phone.
 */
export function AchievementMedal({
  item,
  size = 'md',
  ownerId = null,
}: {
  item: ShownAchievement
  size?: 'sm' | 'md'
  /** The owner reading as themselves: the popover offers to show or hide the achievement. */
  ownerId?: string | null
}) {
  const { achievement, definition, privateReason } = item
  const { run, pending, error } = useActionRunner()
  // A private achievement shows only once the record that unlocked it is public.
  const blocked = definition.private && !achievement.originPublic
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
        {ownerId && (
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              disabled={!achievement.isPublic && blocked}
              onClick={() => run(() => updateAchievementVisibility(ownerId, achievement.key, !achievement.isPublic))}
            >
              {achievement.isPublic ? 'Esconder do perfil' : 'Mostrar no perfil'}
            </Button>
            <FormMessage tone="error">{error}</FormMessage>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
