import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import './trail-log.css'

/**
 * The Hub's visual motif: a vertical trail of linked dots, for the squad log, the member's history and
 * the steps of a flow. Radix has no primitive for it. The log never deletes: returned and ended entries stay.
 */
export function TrailLog({ className, ...props }: ComponentProps<'ol'>) {
  return <ol className={cn('ui-trail-log', className)} {...props} />
}

/**
 * One event. `tone`: `success` accepted or approved, `move` joined or started, `warning` returned,
 * `past` concluded without highlight.
 */
export function TrailLogItem({
  tone = 'past',
  title,
  meta,
  className,
  children,
  ...props
}: Omit<ComponentProps<'li'>, 'title'> & {
  tone?: 'success' | 'move' | 'warning' | 'past'
  title: ReactNode
  /** Author and time, in caption. */
  meta?: ReactNode
}) {
  return (
    <li data-tone={tone} className={cn('ui-trail-log__item', className)} {...props}>
      <span className="ui-trail-log__rail" aria-hidden>
        <span className="ui-trail-log__dot" />
      </span>
      <div className="ui-trail-log__text">
        <div className="ui-trail-log__title">{title}</div>
        {meta && <div className="ui-trail-log__meta">{meta}</div>}
        {children}
      </div>
    </li>
  )
}
