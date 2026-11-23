import { useState, useTransition } from 'react'
import { Smile, Flame, Lightbulb, Target, UsersRound, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { REACTIONS } from '@/lib/feed-post'
import { useDb, type FeedPost, type ReactionType } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { toggleReaction } from '../actions'
import type { Notice } from './post-card'
import './reaction-bar.css'

/** One icon per learning reaction, shown in the picker and on the button once chosen. */
const ICONS: Record<ReactionType, LucideIcon> = {
  helped: Lightbulb,
  'learning-too': UsersRound,
  'want-to-learn': Target,
  inspiring: Flame,
}

/**
 * What people marked on a publication, where the numbers show: to the author
 * always, and to readers only when the author chose so. It opens the breakdown.
 */
export function ReactionSummary({ post, own }: { post: FeedPost; own: boolean }) {
  const users = useDb((state) => state.users)
  const counted = REACTIONS.map((r) => ({ ...r, count: post.reactions.filter((x) => x.type === r.value).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
  if (counted.length === 0 || !(own || post.showReactionCounts)) return null
  const helpers = post.reactions
    .filter((r) => r.type === 'helped')
    .map((r) => users.find((u) => u.id === r.userId)?.name ?? 'Membro')
  const more = counted.length > 2 ? ` e mais ${counted.length - 2}` : ''

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="reaction-summary" title="Ver as reações">
          {counted.slice(0, 2).map((r) => {
            const Icon = ICONS[r.value]
            return <Icon key={r.value} data-reaction={r.value} size={14} aria-hidden />
          })}
          <span>
            {counted
              .slice(0, 2)
              .map((r) => r.label)
              .join(', ')}
            {more} <span className="reaction-summary__total">({post.reactions.length})</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Reações">
        <ul className="reaction-summary__breakdown">
          {REACTIONS.map((r) => {
            const Icon = ICONS[r.value]
            return (
              <li key={r.value}>
                <Icon data-reaction={r.value} size={16} aria-hidden />
                <span>{r.label}</span>
                <span className="reaction-summary__total">
                  {post.reactions.filter((x) => x.type === r.value).length}
                </span>
              </li>
            )
          })}
        </ul>
        {own && helpers.length > 0 && (
          <p className="reaction-summary__hint">
            {helpers.join(', ')} {helpers.length === 1 ? 'disse' : 'disseram'} que isso ajudou.
          </p>
        )}
        {own && (
          <p className="reaction-summary__hint">
            {post.showReactionCounts ? 'Todos veem os números.' : 'Só você vê os números.'} Mude no menu •••.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * "Reagir": opens the four learning reactions side by side, each with its icon.
 * Once the reader marked one, the button shows it; with several, how many.
 * Choosing one closes the picker, so a reaction is one tap.
 */
export function ReactButton({
  post,
  viewerId,
  onNotice,
}: {
  post: FeedPost
  viewerId: string
  onNotice: (notice: Notice) => void
}) {
  const [reacting, startReacting] = useTransition()
  const [open, setOpen] = useState(false)
  const mine = post.reactions.filter((r) => r.userId === viewerId).map((r) => r.type)
  const first = REACTIONS.find((r) => r.value === mine[0])
  const Icon = first ? ICONS[first.value] : Smile
  const label = !first ? 'Reagir' : mine.length === 1 ? first.label : `${mine.length} reações suas`

  function react(type: ReactionType) {
    startReacting(async () => {
      try {
        await toggleReaction(viewerId, post.id, type)
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="post-action"
          data-active={first ? true : undefined}
          loading={reacting}
          title={first ? label : undefined}
        >
          <Icon data-reaction={first?.value} size={18} aria-hidden />
          <span className="post-action__label">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="react-button__picker" aria-label="Reagir à publicação">
        <ToggleGroup
          type="multiple"
          value={mine}
          disabled={reacting}
          className="react-button__options"
          aria-label="Reagir à publicação"
          onValueChange={(next) => {
            const changed = REACTIONS.find((r) => next.includes(r.value) !== mine.includes(r.value))
            if (!changed) return
            setOpen(false)
            react(changed.value)
          }}
        >
          {REACTIONS.map((r) => {
            const Option = ICONS[r.value]
            return (
              <ToggleGroupItem key={r.value} value={r.value} className="react-button__option">
                <Option data-reaction={r.value} size={20} aria-hidden />
                <span>{r.label}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  )
}
