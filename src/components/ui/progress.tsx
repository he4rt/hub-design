import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Progress as ProgressPrimitive } from 'radix-ui'
import './progress.css'

export function Progress({ value, className, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root value={value} className={cn('ui-progress', className)} {...props}>
      <ProgressPrimitive.Indicator
        className="ui-progress__indicator"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}
