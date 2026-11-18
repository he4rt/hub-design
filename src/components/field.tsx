import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import './field.css'

/** Form field: label, control and an optional hint under it. */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
