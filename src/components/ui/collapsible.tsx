import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'

export function Collapsible(props: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root {...props} />
}

export function CollapsibleTrigger(props: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return <CollapsiblePrimitive.Trigger {...props} />
}

export function CollapsibleContent({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content className={cn('ui-collapsible__content', className)} {...props} />
}
