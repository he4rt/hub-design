import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './input.css'

/** Native input: Radix has no text input primitive. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn('ui-input', className)} {...props} />
}
