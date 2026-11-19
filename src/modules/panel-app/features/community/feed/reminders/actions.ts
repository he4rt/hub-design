import { db, updateUser, type User } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'

const DAY_MS = 24 * 60 * 60 * 1000

/** Days the "complete your profile" card stays hidden after a dismissal. */
export const PROFILE_REMINDER_SNOOZE_DAYS = 7
/** Times the card comes back after the first dismissal; after that it stays gone. */
export const PROFILE_REMINDER_MAX_RETURNS = 3

/** Shared by the action and the home page, so the card only shows when dismissing it is accepted. */
export function isProfileReminderVisible(user: User, now: number): boolean {
  const { dismissals, hiddenUntil } = user.profileReminder
  return (
    user.completeness.percent < 100 &&
    dismissals <= PROFILE_REMINDER_MAX_RETURNS &&
    (hiddenUntil === null || now >= Date.parse(hiddenUntil))
  )
}

export function dismissProfileReminder(userId: string) {
  return mockAction('panel-app.profile-reminder-dismissals.store', { userId }, () => {
    const user = db.get().users.find((u) => u.id === userId)
    if (!user || !isProfileReminderVisible(user, Date.now())) throw new MockError('Este lembrete já foi dispensado.')
    const dismissals = user.profileReminder.dismissals + 1
    const hiddenUntil = new Date(Date.now() + PROFILE_REMINDER_SNOOZE_DAYS * DAY_MS).toISOString()
    updateUser(userId, (u) => ({ ...u, profileReminder: { dismissals, hiddenUntil } }))
    return { dismissals, hiddenUntil, returnsLeft: Math.max(0, PROFILE_REMINDER_MAX_RETURNS - dismissals + 1) }
  })
}

/** Optional e-mail confirmation: sends the link again. */
export function sendEmailVerification(userId: string) {
  return mockAction('panel-app.email-verification-notification.store', { userId }, () => {
    const user = db.get().users.find((u) => u.id === userId)
    if (!user) throw new MockError('Conta não encontrada.')
    if (user.emailVerifiedAt) throw new MockError('Seu e-mail já está confirmado.')
    return { sent: true }
  })
}

/** Click on the link of the confirmation e-mail. */
export function verifyEmail(userId: string) {
  return mockAction('panel-app.email-verification.store', { userId }, () => {
    updateUser(userId, (u) => ({ ...u, emailVerifiedAt: u.emailVerifiedAt ?? new Date().toISOString() }))
    return { verified: true }
  })
}
