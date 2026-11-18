import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import './toggle-group.css'

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn('ui-toggle-group', className)}
      {...props}
    />
  )
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
