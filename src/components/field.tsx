import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import './field.css'

/**
 * Form field: label, control and an optional hint under it. `required` marks a field the member will
 * read, such as the reason of a decline, with the "obrigatório" pill.
 */
export function Field({
  id,
  label,
  hint,
  required = false,
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="field">
      <Label htmlFor={id} className="field__label">
        {label}
        {required && (
          <Badge variant="warning" className="field__required">
            obrigatório
          </Badge>
        )}
      </Label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
