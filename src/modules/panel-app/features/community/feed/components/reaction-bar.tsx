import { useTransition, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { REACTIONS } from '@/lib/feed-post'
import { useDb, type FeedPost, type ReactionType } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { toggleReaction } from '../actions'
import type { Notice } from './post-card'
import './reaction-bar.css'

/**
 * Reactions of a publication, like LinkedIn: a short summary of what people
 * marked and one "Reagir" button that opens the four options. Numbers show
 * to the author always, and to readers only when the author chose so.
 */
export function ReactionBar({
  post,
  viewerId,
  own,
  onNotice,
  children,
}: {
  post: FeedPost
  viewerId: string
  own: boolean
  onNotice: (notice: Notice) => void
  /** Other actions on the row of "Reagir", such as "Salvar". */
  children?: ReactNode
}) {
  const [reacting, startReacting] = useTransition()
  const users = useDb((state) => state.users)
  const countsVisible = own || post.showReactionCounts
  const mine = post.reactions.filter((r) => r.userId === viewerId).map((r) => r.type)
  const counted = REACTIONS.map((r) => ({ ...r, count: post.reactions.filter((x) => x.type === r.value).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
  const helpers = post.reactions
    .filter((r) => r.type === 'helped')
    .map((r) => users.find((u) => u.id === r.userId)?.name ?? 'Membro')
  const summary = counted
    .slice(0, 2)
    .map((r) => r.label)
    .join(', ')
  const more = counted.length > 2 ? ` e mais ${counted.length - 2}` : ''

  function react(type: ReactionType) {
    startReacting(async () => {
      try {
        await toggleReaction(viewerId, post.id, type)
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  const label =
    mine.length === 0
      ? 'Reagir'
      : mine.length === 1
        ? REACTIONS.find((r) => r.value === mine[0])!.label
        : `${mine.length} reações suas`

  return (
    <div className="reaction-bar">
      {counted.length === 0 ? (
        own && <span className="reaction-bar__summary">Ninguém reagiu ainda.</span>
      ) : countsVisible ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="reaction-bar__summary" title="Ver as reações">
              {summary}
              {more} <span className="reaction-bar__total">({post.reactions.length})</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" aria-label="Reações">
            <ul className="reaction-bar__breakdown">
              {REACTIONS.map((r) => (
                <li key={r.value}>
                  {r.label}
                  <span className="reaction-bar__total">{post.reactions.filter((x) => x.type === r.value).length}</span>
                </li>
              ))}
            </ul>
            {own && helpers.length > 0 && (
              <p className="reaction-bar__hint">
                {helpers.join(', ')} {helpers.length === 1 ? 'disse' : 'disseram'} que isso ajudou.
              </p>
            )}
            {own && (
              <p className="reaction-bar__hint">
                {post.showReactionCounts ? 'Todos veem os números.' : 'Só você vê os números.'} Mude no menu •••.
              </p>
            )}
          </PopoverContent>
        </Popover>
      ) : (
        <span className="reaction-bar__summary">
          {summary}
          {more}
        </span>
      )}

      {!own && (
        <div className="reaction-bar__actions">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="reaction-bar__react"
                data-active={mine.length > 0 || undefined}
                loading={reacting}
              >
                {label}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="reaction-bar__picker" aria-label="Reagir à publicação">
              <ToggleGroup
                type="multiple"
                variant="chips"
                orientation="vertical"
                value={mine}
                disabled={reacting}
                aria-label="Reagir à publicação"
                onValueChange={(next) => {
                  const changed = REACTIONS.find((r) => next.includes(r.value) !== mine.includes(r.value))
                  if (changed) react(changed.value)
                }}
              >
                {REACTIONS.map((r) => (
                  <ToggleGroupItem key={r.value} value={r.value}>
                    {r.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </PopoverContent>
          </Popover>
          {children}
        </div>
      )}
    </div>
  )
}
