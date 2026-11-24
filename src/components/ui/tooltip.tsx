import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import './tooltip.css'

export const TooltipProvider = TooltipPrimitive.Provider

/** A short dark label on hover and keyboard focus, naming what an icon-only control means. */
export function Tooltip({
  label,
  children,
  className,
  side = 'top',
  ...root
}: { label: ReactNode; children: ReactNode; className?: string; side?: ComponentProps<typeof TooltipPrimitive.Content>['side'] } & Omit<
  ComponentProps<typeof TooltipPrimitive.Root>,
  'children'
>) {
  return (
    <TooltipPrimitive.Root {...root}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} collisionPadding={8} className={cn('ui-tooltip', className)}>
          {label}
          <TooltipPrimitive.Arrow className="ui-tooltip__arrow" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
