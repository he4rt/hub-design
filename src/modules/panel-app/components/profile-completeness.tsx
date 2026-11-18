import { Progress } from '@/components/ui/progress'
import { ACTION_LABELS, PROFILE_FIELD_LABELS } from '@/lib/member-profile'
import type { User } from '@/mocks/db'
import { actionsUnlockedBy, canDo, type ProfileAction } from '@/mocks/profile-completeness'
import './profile-completeness.css'

const ACTIONS: ProfileAction[] = ['join-squad', 'apply-job']

/**
 * Completeness bar computed by the backend, what each action still needs, and
 * which actions each missing field unlocks. It never decides who sees the profile.
 */
export function ProfileCompleteness({ user, showMissing = true }: { user: User; showMissing?: boolean }) {
  const { percent, missing } = user.completeness

  return (
    <div className="profile-completeness">
      <div className="profile-completeness__head">
        <span>Perfil completo</span>
        <strong>{percent}%</strong>
      </div>
      <Progress value={percent} aria-label="Perfil completo" />
      <ul className="profile-completeness__actions">
        {ACTIONS.map((action) => {
          const { allowed, missing: needed } = canDo(user, action)
          return (
            <li key={action} data-allowed={allowed || undefined}>
              <strong>{ACTION_LABELS[action]}</strong>{' '}
              {allowed ? 'liberado' : `falta ${needed.map((field) => PROFILE_FIELD_LABELS[field]).join(', ')}`}
            </li>
          )
        })}
      </ul>
      {showMissing && missing.length > 0 && (
        <ul className="profile-completeness__missing">
          {missing.map((field) => {
            const unlocks = actionsUnlockedBy(field)
            return (
              <li key={field}>
                <span>{PROFILE_FIELD_LABELS[field]}</span>
                <span className="profile-completeness__unlocks">
                  {unlocks.length ? `Libera: ${unlocks.map((a) => ACTION_LABELS[a]).join(', ')}` : 'Completa o perfil'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
