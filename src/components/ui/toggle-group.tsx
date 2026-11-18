import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import './toggle-group.css'

export function ToggleGroup({
  variant = 'segmented',
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  /** `segmented` is a compact switcher; `chips` wraps pill-shaped items, for picking several tags. */
  variant?: 'segmented' | 'chips'
}) {
  return <ToggleGroupPrimitive.Root data-variant={variant} className={cn('ui-toggle-group', className)} {...props} />
}

export function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn('ui-toggle-group__item', className)}
      {...props}
    />
  )
}
