import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { useFormResetGuard } from './use-form-reset-guard'
import './checkbox.css'

export function Checkbox({
  className,
  onCheckedChange,
  ...props
}: Omit<ComponentProps<typeof CheckboxPrimitive.Root>, 'ref'>) {
  const ref = useRef<HTMLButtonElement>(null)
  const isFormReset = useFormResetGuard(ref)

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn('ui-checkbox', className)}
      onCheckedChange={(checked) => {
        if (!isFormReset()) onCheckedChange?.(checked)
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="ui-checkbox__indicator">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
