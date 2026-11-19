import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Tabs as TabsPrimitive } from 'radix-ui'
import './tabs.css'

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('ui-tabs', className)} {...props} />
}

/**
 * `line` (2px brand underline) for the sections of an entity, such as Meu squad; `segmented` for list
 * filters. A count goes in the label: "Entregas · 2".
 */
export function TabsList({
  variant = 'line',
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & { variant?: 'line' | 'segmented' }) {
  return <TabsPrimitive.List data-variant={variant} className={cn('ui-tabs__list', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn('ui-tabs__trigger', className)} {...props} />
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('ui-tabs__content', className)} {...props} />
}
