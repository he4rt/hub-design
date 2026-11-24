import { useRef, useState, useTransition, type CSSProperties } from 'react'
import { SmilePlus, Flame, Lightbulb, Target, UsersRound, type LucideIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
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
 * What people marked on the author's own publication, as the same pills readers see, read-only.
 * The author always sees the counts; the pills open the breakdown and who said it helped.
 */
export function ReactionSummary({ post }: { post: FeedPost }) {
  const users = useDb((state) => state.users)
  const counted = REACTIONS.map((r) => ({ ...r, count: post.reactions.filter((x) => x.type === r.value).length })).filter(
    (r) => r.count > 0,
  )
  if (counted.length === 0) return <span />
  const helpers = post.reactions
    .filter((r) => r.type === 'helped')
    .map((r) => users.find((u) => u.id === r.userId)?.name ?? 'Membro')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="react-button react-button__summary"
          aria-label={`Ver as reações: ${counted.map((r) => `${r.label} ${r.count}`).join(', ')}`}
        >
          {counted.map((r) => {
            const Icon = ICONS[r.value]
            return (
              <span key={r.value} className="react-button__given">
                <Icon data-reaction={r.value} size={18} aria-hidden />
                <span>{r.count}</span>
              </span>
            )
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" aria-label="Reações">
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
        {helpers.length > 0 && (
          <p className="reaction-summary__hint">
            {helpers.join(', ')} {helpers.length === 1 ? 'disse' : 'disseram'} que isso ajudou.
          </p>
        )}
        {/* Only the author sees the counts of a post that hides them, so only then it says so. */}
        {!post.showReactionCounts && <p className="reaction-summary__hint">A contagem de reações está oculta para os outros membros. Você pode mostrá-la pelo menu •••.</p>}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Reacting to a publication: one icon opens the four reactions, each named on hover; the ones
 * already given sit beside it as pills, with their count when the author shows counts.
 * Clicking a pill takes the reader's reaction back or adds it.
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
  const [addTip, setAddTip] = useState(false)
  // Closing the menu returns focus to the add button; that focus should not pop its label.
  const returningFocus = useRef(false)
  const mine = post.reactions.filter((r) => r.userId === viewerId).map((r) => r.type)
  const given = REACTIONS.map((r) => ({ ...r, count: post.reactions.filter((x) => x.type === r.value).length })).filter(
    (r) => r.count > 0,
  )

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
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <div className="react-button" role="group" aria-label="Reações">
        {given.map((r) => {
          const Icon = ICONS[r.value]
          return (
            <Tooltip key={r.value} label={r.label}>
              <button
                type="button"
                className="react-button__given"
                aria-pressed={mine.includes(r.value)}
                aria-label={post.showReactionCounts ? `${r.label}: ${r.count}` : r.label}
                disabled={reacting}
                onClick={() => react(r.value)}
              >
                <Icon data-reaction={r.value} size={18} aria-hidden />
                {post.showReactionCounts && <span>{r.count}</span>}
              </button>
            </Tooltip>
          )
        })}
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip
            label="Reagir"
            open={addTip && !open}
            onOpenChange={(next) => {
              if (next && returningFocus.current) {
                returningFocus.current = false
                return
              }
              setAddTip(next)
            }}
          >
            <PopoverTrigger className="react-button__add" aria-label="Reagir" disabled={reacting}>
              <SmilePlus size={19} aria-hidden />
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent
            align="start"
            side="top"
            className="react-button__menu"
            aria-label="Escolha uma reação"
            tabIndex={-1}
            // Focus the menu itself, so opening it does not pop the first option's label.
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement).focus()
            }}
            onCloseAutoFocus={() => {
              returningFocus.current = true
            }}
          >
            {REACTIONS.map((r, i) => {
              const Option = ICONS[r.value]
              return (
                <Tooltip key={r.value} label={r.label}>
                  <button
                    type="button"
                    className="react-button__option"
                    style={{ '--i': i } as CSSProperties}
                    aria-pressed={mine.includes(r.value)}
                    aria-label={r.label}
                    onClick={() => {
                      setOpen(false)
                      react(r.value)
                    }}
                  >
                    <Option data-reaction={r.value} size={22} aria-hidden />
                  </button>
                </Tooltip>
              )
            })}
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  )
}
