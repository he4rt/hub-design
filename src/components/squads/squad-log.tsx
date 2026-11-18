import type { SquadLogEntry, TeamProject, User } from '@/mocks/db'
import { formatDate, LOG_LABELS } from '@/mocks/squads'
import './squad-log.css'

/** Permanent log of a squad, newest first: what happened, who did it and why. */
export function SquadLog({
  entries,
  projects,
  users,
}: {
  entries: SquadLogEntry[]
  projects: TeamProject[]
  users: User[]
}) {
  if (entries.length === 0) return <p className="squad-log__empty">Nada registrado ainda.</p>

  const name = (id: string | null) => users.find((u) => u.id === id)?.name ?? 'Membro removido'
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <ol className="squad-log">
      {sorted.map((entry) => (
        <li key={entry.id} className="squad-log__entry">
          <time className="squad-log__date" dateTime={entry.at}>
            {formatDate(entry.at)}
          </time>
          <div className="squad-log__body">
            <p>
              <strong>{LOG_LABELS[entry.kind]}</strong>
              {entry.subjectId && <> · {name(entry.subjectId)}</>}
              {entry.detail && <> · {entry.detail}</>}
            </p>
            <p className="squad-log__meta">
              {projects.find((p) => p.id === entry.projectId)?.name ?? 'Squad'} · por {name(entry.actorId)}
              {entry.reason && <> · motivo: {entry.reason}</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
