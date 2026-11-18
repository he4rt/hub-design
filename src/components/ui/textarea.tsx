import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './input.css'
import './textarea.css'

/** Native textarea: Radix has no text input primitive. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn('ui-input ui-textarea', className)} {...props} />
}
