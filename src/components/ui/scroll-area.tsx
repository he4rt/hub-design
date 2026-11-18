import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import './scroll-area.css'

export function ScrollArea({
  className,
  children,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn('ui-scroll-area', className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="ui-scroll-area__viewport">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className="ui-scroll-area__scrollbar" orientation="vertical">
        <ScrollAreaPrimitive.Thumb className="ui-scroll-area__thumb" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}
