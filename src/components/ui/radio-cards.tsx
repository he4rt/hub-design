import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { RadioGroup } from 'radix-ui'
import './radio-cards.css'

/** Single choice shown as a list of cards with a label and an optional description. */
export function RadioCards({ className, ...props }: ComponentProps<typeof RadioGroup.Root>) {
  return <RadioGroup.Root className={cn('ui-radio-cards', className)} {...props} />
}

export function RadioCard({
  label,
  description,
  className,
  ...props
}: ComponentProps<typeof RadioGroup.Item> & { label: ReactNode; description?: ReactNode }) {
  return (
    <RadioGroup.Item className={cn('ui-radio-card', className)} {...props}>
      <span className="ui-radio-card__control" aria-hidden>
        <RadioGroup.Indicator className="ui-radio-card__dot" />
      </span>
      <span className="ui-radio-card__text">
        <span className="ui-radio-card__label">{label}</span>
        {description && <span className="ui-radio-card__description">{description}</span>}
      </span>
    </RadioGroup.Item>
  )
}
