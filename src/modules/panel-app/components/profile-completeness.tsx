import type { ProfileField, User } from '@/mocks/db'
import { actionsUnlockedBy, type ProfileAction } from '@/mocks/profile-completeness'
import './profile-completeness.css'

/** Each missing field as the task that fills it, linked to its place in the settings. */
const TASKS: Record<ProfileField, { label: string; href: string }> = {
  photo: { label: 'Adicionar uma foto', href: '#photo' },
  bio: { label: 'Escrever o Sobre', href: '#bio' },
  city: { label: 'Informar a cidade', href: '#city' },
  situation: { label: 'Informar a situação', href: '#situation' },
  portfolio: { label: 'Adicionar o portfólio', href: '#portfolio' },
  areas: { label: 'Escolher as áreas', href: '#areas' },
  startingPoint: { label: 'Informar o ponto de partida', href: '#starting-point' },
  languages: { label: 'Escolher as linguagens', href: '#languages' },
  github: { label: 'Vincular o GitHub', href: '#linked-accounts' },
  linkedin: { label: 'Vincular o LinkedIn', href: '#linked-accounts' },
}

const NEEDED_FOR: Record<ProfileAction, string> = {
  'join-squad': 'entrar em squad',
  'apply-job': 'se candidatar a vagas',
}

/**
 * Completeness computed by the backend, as a sentence (a trajectory, never a scoreboard), and what is left as a list of
 * tasks, each saying which action it is needed for. It never decides who sees the profile.
 */
export function ProfileCompleteness({ user }: { user: User }) {
  const { percent, missing } = user.completeness

  return (
    <div className="profile-completeness">
      <p className="profile-completeness__head">
        Perfil <strong>{percent}%</strong> preenchido.
      </p>
      <ul className="profile-completeness__missing">
        {missing.map((field) => {
          const unlocks = actionsUnlockedBy(field)
          return (
            <li key={field}>
              <a href={TASKS[field].href}>{TASKS[field].label}</a>
              {unlocks.length > 0 && (
                <span className="profile-completeness__unlocks">
                  Necessário para {unlocks.map((action) => NEEDED_FOR[action]).join(' e ')}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
