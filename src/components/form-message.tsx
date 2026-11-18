import type { ReactNode } from 'react'
import './form-message.css'

/**
 * Result line of a form or action. Always rendered, so the space for one line
 * is reserved and nothing moves when a message appears.
 */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children?: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} data-tone={tone} className="form-message">
      {children}
    </p>
  )
}
