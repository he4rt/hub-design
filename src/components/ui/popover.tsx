import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Popover as PopoverPrimitive } from 'radix-ui'
import './popover.css'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  className,
  sideOffset = 8,
  collisionPadding = 16,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn('ui-popover', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
