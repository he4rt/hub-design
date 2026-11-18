import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { useFormResetGuard } from './use-form-reset-guard'
import './switch.css'

export function Switch({
  className,
  onCheckedChange,
  ...props
}: Omit<ComponentProps<typeof SwitchPrimitive.Root>, 'ref'>) {
  const ref = useRef<HTMLButtonElement>(null)
  const isFormReset = useFormResetGuard(ref)

  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn('ui-switch', className)}
      onCheckedChange={(checked) => {
        if (!isFormReset()) onCheckedChange?.(checked)
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb className="ui-switch__thumb" />
    </SwitchPrimitive.Root>
  )
}
