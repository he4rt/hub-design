import { logFinish, logStart } from '@/debug/debug-store'
import { db } from './db'

export type AnalyticsEventName =
  | 'account_created'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_skipped'
  | 'onboarding_completed'
  | 'profile_completed'
  | 'profile_published'
  | 'profile_unpublished'
  | 'account_linked'
  | 'signup_blocked_underage'

const EVENTS_KEPT = 200

/**
 * Sends a product event, like `posthog.capture` on the backend. Props carry
 * ids and choices, never personal data. Shows up in the debug log.
 */
export function track(event: AnalyticsEventName, props: Record<string, unknown> = {}) {
  db.set((state) => ({
    ...state,
    events: [{ event, props, at: new Date().toISOString() }, ...state.events].slice(0, EVENTS_KEPT),
  }))
  logFinish(logStart(`posthog: ${event}`, props), { status: 'success' })
}
