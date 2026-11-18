import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Label as LabelPrimitive } from 'radix-ui'
import './label.css'

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('ui-label', className)} {...props} />
}
