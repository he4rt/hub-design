import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import './callout.css'

/**
 * Note with a product rule: Radix has no callout primitive. `rule` protects the member (one application
 * per project); `warning` tells an irreversible consequence (a recorded validation is immutable).
 * `banner` is the ink banner, one per screen, for the milestone that changes what the member can do.
 */
export function Callout({
  variant = 'rule',
  icon,
  title,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  variant?: 'rule' | 'warning' | 'banner'
  /** 16px icon; 22px in a banner. */
  icon?: ReactNode
  /** Banner title. */
  title?: ReactNode
  /** Banner action, such as a `dark` button. */
  action?: ReactNode
}) {
  return (
    <div data-variant={variant} className={cn('ui-callout', className)} {...props}>
      {icon && <span className="ui-callout__icon">{icon}</span>}
      <div className="ui-callout__text">
        {title && <p className="ui-callout__title">{title}</p>}
        <div className="ui-callout__body">{children}</div>
      </div>
      {action && <div className="ui-callout__action">{action}</div>}
    </div>
  )
}
