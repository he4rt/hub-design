import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './card.css'

/** Layout container: Radix has no card primitive. */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('ui-card', className)} {...props} />
}
