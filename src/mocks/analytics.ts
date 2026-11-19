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
  | 'discussion_created'
  | 'discussion_replied'
  | 'trajectory_record_added'
  | 'feed_post_created'
  | 'feed_post_blocked'
  | 'feed_post_visibility_changed'
  | 'feed_post_deleted'
  | 'feed_post_reacted'
  | 'feed_collection_created'
  | 'feed_post_collected'
  | 'feed_post_saved'
  | 'feed_announcement_pinned'
  | 'feed_post_edited'
  | 'squad_test_submitted'
  | 'squad_test_approved'
  | 'squad_project_created'
  | 'squad_application_submitted'
  | 'squad_application_decided'
  | 'squad_joined'
  | 'delivery_accepted'
  | 'delivery_returned'
  | 'validator_application_submitted'
  | 'validator_application_decided'
  | 'validation_requested'
  | 'validation_assigned'
  | 'validation_conflict_declared'
  | 'validation_review_decided'
  | 'validation_recorded'
  | 'validation_published'
  | 'validation_unpublished'
  | 'validation_contested'

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
