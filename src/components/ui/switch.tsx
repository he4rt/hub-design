import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Switch as SwitchPrimitive } from 'radix-ui'
import './switch.css'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className={cn('ui-switch', className)} {...props}>
      <SwitchPrimitive.Thumb className="ui-switch__thumb" />
    </SwitchPrimitive.Root>
  )
}
