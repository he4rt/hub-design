import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './card.css'

/**
 * Surface of the design system: Radix has no card primitive. `inset` is the recessed block inside a
 * card for what comes from outside the Hub (the PR, the board item, the captain's context).
 */
export function Card({ variant = 'default', className, ...props }: ComponentProps<'section'> & { variant?: 'default' | 'inset' }) {
  return <section data-variant={variant} className={cn('ui-card', className)} {...props} />
}

/** Card header: a subheading on the left and, optionally, a chip or a small ghost button on the right. */
export function CardHeader({ className, ...props }: ComponentProps<'header'>) {
  return <header className={cn('ui-card__header', className)} {...props} />
}
