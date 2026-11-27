import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Toggle as TogglePrimitive } from 'radix-ui'
import './toggle.css'

/** A button that stays pressed, such as a list filter ("Ainda sem retorno"); it reports `aria-pressed`. */
export function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive.Root>) {
  return <TogglePrimitive.Root className={cn('ui-toggle', className)} {...props} />
}
